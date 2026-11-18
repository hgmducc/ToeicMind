using Microsoft.Extensions.Caching.Memory;
using ToeicMind.DTOs.Learning.Request;
using ToeicMind.DTOs.Learning.Response;
using ToeicMind.Models.Learning;
using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Exams;
using ToeicMind.Repositories.Learning;
using ToeicMind.Services.Vip;

namespace ToeicMind.Services.Learning;

/// <summary>
/// Nghiệp vụ học từ vựng. Danh mục từ + liên kết từ–đề–Part được cache 10 phút trong bộ nhớ; tiến độ của từng người đọc một lần mỗi request
/// rồi lọc/đếm trong bộ nhớ (không N+1). Lịch ôn tính bằng <see cref="VocabScheduler"/> (SM-2 cải biên).
/// Từ "mới" là từ chưa có dòng tiến độ; thứ tự học mới theo VocabId (thứ tự nhập đề).
/// Tổng quan, danh sách đề và danh sách bài học công khai: userId null là khách, chưa có tiến độ. Danh sách từ, phiên học và ôn tập cần đăng nhập.
/// </summary>
public class VocabLearningService : IVocabLearningService
{
    private static readonly TimeSpan CatalogTtl = TimeSpan.FromMinutes(10);
    private const string CatalogKey = "vocab:catalog";

    private readonly IVocabLearningRepository _repo;
    private readonly IExamContentRepository _content;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _config;
    private readonly IAccessService _access;

    public VocabLearningService(IVocabLearningRepository repo, IExamContentRepository content, IMemoryCache cache, IConfiguration config, IAccessService access)
    {
        _access = access;
        _repo = repo;
        _content = content;
        _cache = cache;
        _config = config;
    }

    // Danh mục dùng chung mọi người học.
    private sealed class Catalog
    {
        public Dictionary<int, VocabWordRow> Words { get; init; } = [];
        public Dictionary<int, VocabExamRow> Exams { get; init; } = [];
        public Dictionary<int, HashSet<int>> BySet { get; init; } = [];
        public Dictionary<int, HashSet<int>> ByExam { get; init; } = [];
        public Dictionary<(int ExamId, byte PartNo), HashSet<int>> ByExamPart { get; init; } = [];
        public Dictionary<byte, HashSet<int>> ByPart { get; init; } = [];
        public Dictionary<byte, string> PartNames { get; init; } = [];
        public HashSet<int> AllWords { get; init; } = [];
        // Từ miễn phí: chưa gắn với đề nào, hoặc gắn với ít nhất một đề thuộc bộ đề có quyền từ vựng FREE.
        public HashSet<int> FreeWords { get; init; } = [];
    }

    // Tập từ người dùng được dùng: VIP/ADMIN thấy tất cả, còn lại chỉ từ miễn phí.
    private static HashSet<int> Visible(Catalog catalog, bool vip) => vip ? catalog.AllWords : catalog.FreeWords;

    private async Task<Catalog> CatalogAsync()
    {
        if (_cache.TryGetValue(CatalogKey, out Catalog? cached) && cached is not null) return cached;
        var words = (await _repo.GetWordsAsync()).ToDictionary(w => w.VocabId);
        var exams = (await _repo.GetLiveExamsAsync()).ToDictionary(e => e.ExamId);
        var links = (await _repo.GetLinksAsync()).Where(l => exams.ContainsKey(l.ExamId) && words.ContainsKey(l.VocabId)).ToList();
        var parts = (await _content.GetCatalogAsync()).Parts.ToDictionary(p => p.PartNo, p => p.PartName);

        var linked = links.Select(l => l.VocabId).ToHashSet();
        var freeLinked = links.Where(l => !exams[l.ExamId].VocabVip).Select(l => l.VocabId).ToHashSet();
        var catalog = new Catalog
        {
            Words = words, Exams = exams, PartNames = parts, AllWords = words.Keys.ToHashSet(),
            FreeWords = words.Keys.Where(id => !linked.Contains(id) || freeLinked.Contains(id)).ToHashSet(),
            BySet = links.GroupBy(l => exams[l.ExamId].ExamSetId).ToDictionary(g => g.Key, g => g.Select(l => l.VocabId).ToHashSet()),
            ByExam = links.GroupBy(l => l.ExamId).ToDictionary(g => g.Key, g => g.Select(l => l.VocabId).ToHashSet()),
            ByExamPart = links.GroupBy(l => (l.ExamId, l.PartNo)).ToDictionary(g => g.Key, g => g.Select(l => l.VocabId).ToHashSet()),
            ByPart = links.GroupBy(l => l.PartNo).ToDictionary(g => g.Key, g => g.Select(l => l.VocabId).ToHashSet())
        };
        _cache.Set(CatalogKey, catalog, CatalogTtl);
        return catalog;
    }

    // Tiến độ của người học theo VocabId; khách chưa có tiến độ.
    private async Task<Dictionary<int, UserVocabProgress>> ProgressAsync(int? userId) =>
        userId is { } id ? (await _repo.GetProgressAsync(id)).ToDictionary(p => p.VocabId) : [];

    public async Task<VocabOverviewDto> GetOverviewAsync(int? userId)
    {
        var catalog = await CatalogAsync();
        var vip = await _access.HasVipAsync(userId);
        var visible = Visible(catalog, vip);
        var progress = (await ProgressAsync(userId)).Where(p => visible.Contains(p.Key)).ToDictionary(p => p.Key, p => p.Value);
        var now = DateTime.UtcNow;
        var today = _config.StudyToday();
        var todayStartUtc = today.ToDateTime(TimeOnly.MinValue).AddHours(-_config.OffsetHours());

        return new VocabOverviewDto
        {
            TotalWords = visible.Count, LockedWords = catalog.AllWords.Count - visible.Count,
            NewWords = visible.Count - progress.Count,
            LearningWords = progress.Values.Count(p => p.Status != "MASTERED"),
            MasteredWords = progress.Values.Count(p => p.Status == "MASTERED"),
            DueNow = progress.Values.Count(p => p.NextReviewAt <= now),
            NewToday = progress.Values.Count(p => p.FirstSeenAt >= todayStartUtc),
            ReviewedToday = userId is { } id ? await _repo.GetReviewedOnAsync(id, today) : 0,
            NewPerDay = NewPerDay(),
            Sets = catalog.BySet.OrderBy(s => s.Key).Select(s =>
            {
                var (learned, mastered, due) = Count(s.Value, progress, now);
                return new VocabSetDto
                {
                    ExamSetId = s.Key, Name = catalog.Exams.Values.First(e => e.ExamSetId == s.Key).SetName,
                    ExamCount = catalog.Exams.Values.Count(e => e.ExamSetId == s.Key && catalog.ByExam.ContainsKey(e.ExamId)),
                    WordCount = s.Value.Count, LearnedCount = learned, MasteredCount = mastered, DueCount = due,
                    Access = SetVocabVip(catalog, s.Key) ? Access.Vip : Access.Free, IsLocked = SetVocabVip(catalog, s.Key) && !vip
                };
            }).ToList()
        };
    }

    public async Task<List<VocabExamDto>> GetExamsAsync(int? userId, int examSetId)
    {
        var catalog = await CatalogAsync();
        var progress = await ProgressAsync(userId);
        var vip = await _access.HasVipAsync(userId);
        var now = DateTime.UtcNow;
        return catalog.Exams.Values.Where(e => e.ExamSetId == examSetId && catalog.ByExam.ContainsKey(e.ExamId)).OrderBy(e => e.ExamId).Select(e =>
        {
            var (learned, mastered, due) = Count(catalog.ByExam[e.ExamId], progress, now);
            return new VocabExamDto
            {
                ExamId = e.ExamId, ExamCode = e.ExamCode, Title = e.Title, WordCount = catalog.ByExam[e.ExamId].Count, IsLocked = e.VocabVip && !vip,
                LearnedCount = learned, MasteredCount = mastered, DueCount = due,
                Parts = catalog.ByExamPart.Where(p => p.Key.ExamId == e.ExamId).OrderBy(p => p.Key.PartNo).Select(p =>
                {
                    var (pl, pm, pd) = Count(p.Value, progress, now);
                    return new VocabPartDto
                    {
                        PartNo = p.Key.PartNo, PartName = catalog.PartNames.GetValueOrDefault(p.Key.PartNo, $"Part {p.Key.PartNo}"),
                        WordCount = p.Value.Count, LearnedCount = pl, MasteredCount = pm, DueCount = pd
                    };
                }).ToList()
            };
        }).ToList();
    }

    public async Task<VocabWordPageDto> GetWordsAsync(int userId, VocabWordListRequestDto query)
    {
        var catalog = await CatalogAsync();
        var progress = await ProgressAsync(userId);
        var now = DateTime.UtcNow;
        var ids = await ScopeAsync(catalog, userId, await _access.HasVipAsync(userId), query.ExamSetId, query.ExamId, query.PartNo, query.Mine);

        IEnumerable<VocabWordRow> words = ids.Select(id => catalog.Words[id]);
        if (query.CefrLevel is { } cefr) words = words.Where(w => w.CefrLevel == cefr);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            words = words.Where(w => w.Lemma.Contains(term, StringComparison.OrdinalIgnoreCase) || w.MeaningVi.Contains(term, StringComparison.OrdinalIgnoreCase));
        }
        words = query.Status switch
        {
            "NEW" => words.Where(w => !progress.ContainsKey(w.VocabId)),
            "LEARNING" => words.Where(w => progress.TryGetValue(w.VocabId, out var p) && p.Status != "MASTERED"),
            "MASTERED" => words.Where(w => progress.TryGetValue(w.VocabId, out var p) && p.Status == "MASTERED"),
            "DUE" => words.Where(w => progress.TryGetValue(w.VocabId, out var p) && p.NextReviewAt <= now),
            _ => words
        };
        var list = words.OrderBy(w => w.Lemma, StringComparer.OrdinalIgnoreCase).ToList();
        var page = list.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(w => ToWord(w, progress.GetValueOrDefault(w.VocabId), now)).ToList();
        return new VocabWordPageDto { Items = page, Total = list.Count, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<VocabStudySessionDto> GetStudySessionAsync(int userId, VocabStudyRequestDto query)
    {
        var catalog = await CatalogAsync();
        var progress = await ProgressAsync(userId);
        var now = DateTime.UtcNow;
        var vip = await _access.HasVipAsync(userId);
        var ids = (await ScopeAsync(catalog, userId, vip, query.ExamSetId, query.ExamId, query.PartNo, query.Mine)).ToList();
        if (query.CefrLevel is { } cefr) ids = ids.Where(id => catalog.Words[id].CefrLevel == cefr).ToList();

        var due = ids.Where(id => progress.TryGetValue(id, out var p) && p.NextReviewAt <= now).OrderBy(id => progress[id].NextReviewAt).ToList();
        var fresh = ids.Where(id => !progress.ContainsKey(id)).OrderBy(id => id).ToList();
        var limit = query.Limit ?? 20;

        List<int> picked;
        if (!string.IsNullOrWhiteSpace(query.Ids))
        {
            // Học một bài cụ thể: giữ đúng thứ tự bài, chỉ nhận từ có trong danh mục.
            picked = query.Ids.Split(',').Select(int.Parse).Where(Visible(catalog, vip).Contains).Distinct().Take(100).ToList();
        }
        else if (query.Mode == "PRACTICE")
        {
            picked = ids.OrderBy(_ => Random.Shared.Next()).Take(limit).ToList();
        }
        else
        {
            var newLimit = query.NewLimit ?? NewPerDay();
            var dueTake = query.Mode == "NEW" ? 0 : Math.Min(due.Count, limit);
            var newTake = query.Mode == "REVIEW" ? 0 : Math.Min(Math.Min(newLimit, fresh.Count), limit - dueTake);
            picked = due.Take(dueTake).Concat(fresh.Take(newTake)).ToList();
        }

        var contexts = (await _repo.GetContextsAsync(picked)).ToLookup(c => c.VocabId);
        var pickedSet = picked.ToHashSet();
        // Đáp án gây nhiễu: ưu tiên từ cùng phạm vi, thiếu thì lấy thêm từ toàn danh mục.
        var pool = ids.Where(id => !pickedSet.Contains(id)).OrderBy(_ => Random.Shared.Next()).Take(40).ToList();
        if (pool.Count < 40)
            pool.AddRange(Visible(catalog, vip).Where(id => !pickedSet.Contains(id) && !pool.Contains(id)).OrderBy(_ => Random.Shared.Next()).Take(40 - pool.Count));
        return new VocabStudySessionDto
        {
            DueTotal = due.Count, NewTotal = fresh.Count,
            Pool = pool.Select(id => catalog.Words[id]).Select(w => new VocabChoiceDto { VocabId = w.VocabId, Lemma = w.Lemma, PosCode = w.PosCode, MeaningVi = w.MeaningVi }).ToList(),
            Cards = picked.Select(id =>
            {
                var existing = progress.GetValueOrDefault(id);
                return new VocabCardDto
                {
                    Word = ToWord(catalog.Words[id], existing, now), Kind = existing is null ? "NEW" : "REVIEW",
                    PreviewMinutes = VocabScheduler.PreviewMinutes(existing, now),
                    // Ưu tiên ngữ cảnh có câu ví dụ, tối đa 2.
                    Contexts = contexts[id].OrderByDescending(c => c.ExampleEn != null).Take(2)
                        .Select(c => new VocabContextDto { SurfaceForm = c.SurfaceForm, MeaningVi = c.MeaningVi, ExampleEn = c.ExampleEn, ExampleVi = c.ExampleVi }).ToList()
                };
            }).ToList()
        };
    }

    public async Task<VocabLessonListDto> GetLessonsAsync(int? userId, VocabLessonListRequestDto query)
    {
        var catalog = await CatalogAsync();
        var progress = await ProgressAsync(userId);
        var now = DateTime.UtcNow;
        var ids = (await ScopeAsync(catalog, userId, await _access.HasVipAsync(userId), query.ExamSetId, query.ExamId, query.PartNo, query.Mine)).ToList();
        if (query.CefrLevel is { } cefr) ids = ids.Where(id => catalog.Words[id].CefrLevel == cefr).ToList();
        ids.Sort();   // thứ tự nhập đề ổn định: bài học không đổi giữa các lần xem
        var lessons = ids.Chunk(query.Size).Select((chunk, i) =>
        {
            var set = chunk.ToHashSet();
            var (learned, mastered, due) = Count(set, progress, now);
            return new VocabLessonDto
            {
                Number = i + 1, WordIds = chunk.ToList(), WordCount = chunk.Length, LearnedCount = learned, MasteredCount = mastered, DueCount = due,
                Preview = chunk.Take(4).Select(id => catalog.Words[id].Lemma).ToList()
            };
        }).ToList();
        return new VocabLessonListDto { TotalWords = ids.Count, Size = query.Size, Lessons = lessons };
    }

    public async Task<(VocabReviewResultDto? Result, string? Error)> ReviewAsync(int userId, int vocabId, ReviewVocabRequestDto dto)
    {
        var catalog = await CatalogAsync();
        if (!catalog.Words.ContainsKey(vocabId)) return (null, "VOCAB_SOURCE_NOT_FOUND");
        if (!Visible(catalog, await _access.HasVipAsync(userId)).Contains(vocabId)) return (null, "VIP_REQUIRED");
        var existing = await _repo.GetOneProgressAsync(userId, vocabId);
        var next = VocabScheduler.Next(existing, userId, vocabId, dto.Grade, DateTime.UtcNow);
        await _repo.SaveProgressAsync(next, existing is not null);
        await _repo.TouchStudyDayAsync(userId, _config.StudyToday(), 1);
        return (new VocabReviewResultDto
        {
            VocabId = vocabId, Status = next.Status, IntervalDays = next.IntervalDays, Repetitions = next.Repetitions,
            Lapses = next.Lapses, EaseFactor = next.EaseFactor, NextReviewAt = next.NextReviewAt
        }, null);
    }

    public async Task<string?> ResetAsync(int userId, int vocabId) =>
        await _repo.ResetProgressAsync(userId, vocabId) ? null : "VOCAB_PROGRESS_NOT_FOUND";

    // Tập VocabId theo phạm vi: đề (+Part) > bộ đề (+Part) > Part > tất cả; Mine giao với bộ từ cá nhân.
    private async Task<IReadOnlyCollection<int>> ScopeAsync(Catalog c, int? userId, bool vip, int? examSetId, int? examId, byte? partNo, bool mine)
    {
        IEnumerable<int> ids;
        if (examId is { } e) ids = partNo is { } p1 ? c.ByExamPart.GetValueOrDefault((e, p1)) ?? [] : c.ByExam.GetValueOrDefault(e) ?? [];
        else if (examSetId is { } s)
        {
            ids = partNo is { } p2
                ? c.Exams.Values.Where(x => x.ExamSetId == s).SelectMany(x => c.ByExamPart.GetValueOrDefault((x.ExamId, p2)) ?? []).Distinct()
                : c.BySet.GetValueOrDefault(s) ?? [];
        }
        else if (partNo is { } p3) ids = c.ByPart.GetValueOrDefault(p3) ?? [];
        else ids = c.Words.Keys;
        if (!vip) ids = ids.Where(c.FreeWords.Contains);
        if (mine)
        {
            var own = userId is { } id ? await _repo.GetMineIdsAsync(id) : [];
            ids = ids.Where(own.Contains);
        }
        return ids.ToList();
    }

    // Bộ đề có quyền từ vựng VIP (mọi đề của bộ cùng giá trị).
    private static bool SetVocabVip(Catalog c, int examSetId) => c.Exams.Values.First(e => e.ExamSetId == examSetId).VocabVip;

    private static (int Learned, int Mastered, int Due) Count(HashSet<int> ids, Dictionary<int, UserVocabProgress> progress, DateTime now)
    {
        int learned = 0, mastered = 0, due = 0;
        foreach (var id in ids)
        {
            if (!progress.TryGetValue(id, out var p)) continue;
            learned++;
            if (p.Status == "MASTERED") mastered++;
            if (p.NextReviewAt <= now) due++;
        }
        return (learned, mastered, due);
    }

    private static VocabWordDto ToWord(VocabWordRow w, UserVocabProgress? p, DateTime now) => new()
    {
        VocabId = w.VocabId, Lemma = w.Lemma, PosCode = w.PosCode, IpaUs = w.IpaUs, IpaUk = w.IpaUk, CefrLevel = w.CefrLevel,
        MeaningVi = w.MeaningVi, DefinitionEn = w.DefinitionEn,
        Status = p?.Status ?? "NEW", IsDue = p is not null && p.NextReviewAt <= now, IntervalDays = p?.IntervalDays ?? 0,
        Repetitions = p?.Repetitions ?? 0, Lapses = p?.Lapses ?? 0, NextReviewAt = p?.NextReviewAt, LastReviewedAt = p?.LastReviewedAt
    };

    private int NewPerDay() => Math.Clamp(_config.GetValue<int?>("Learning:VocabNewPerDay") ?? 10, 1, 50);
}
