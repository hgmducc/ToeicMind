using Microsoft.Extensions.Caching.Memory;
using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Exams;
using ToeicMind.Services.Diagnostics;
using ToeicMind.Services.Vip;

namespace ToeicMind.Services.Learning;

/// <summary>
/// Đưa người học vào đề nhanh. Ba ý chính:
/// 1) Tách nhỏ: cấu trúc đề kèm dàn ý (modes, rất nhẹ, công khai) → từng Part → media; người học thấy câu hỏi ngay khi Part đầu về.
/// 2) Cache bộ nhớ theo (đề, thời điểm cập nhật đề): mọi thay đổi nội dung đều đổi UpdatedAt của đề nên cache tự hết hiệu lực,
///    kể cả khi chạy nhiều máy chủ. Lần đầu mới chạm SQL, các lần sau trả từ RAM.
/// 3) Link media chỉ ký khi trả lời (không cache link) nên luôn còn hạn; chữ có ETag để trình duyệt nhận 304.
/// </summary>
public class ExamPlayService : IExamPlayService
{
    private static readonly TimeSpan ContentTtl = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan DirectionTtl = TimeSpan.FromMinutes(5);

    private readonly IExamRepository _exams;
    private readonly IExamContentReader _reader;
    private readonly IExamContentRepository _content;
    private readonly PlayMediaSigner _signer;
    private readonly IMemoryCache _cache;
    private readonly RequestTimings _timings;
    private readonly IAccessService _access;

    public ExamPlayService(IExamRepository exams, IExamContentReader reader, IExamContentRepository content,
        PlayMediaSigner signer, IMemoryCache cache, RequestTimings timings, IAccessService access)
    {
        _access = access;
        _exams = exams;
        _reader = reader;
        _content = content;
        _signer = signer;
        _cache = cache;
        _timings = timings;
    }

    public async Task<PlayResult<ExamModesDto>> GetModesAsync(int examId, string? ifNoneMatch)
    {
        var exam = await FindPublishedAsync(examId);
        if (exam is null) return PlayResult<ExamModesDto>.Fail("EXAM_NOT_FOUND");
        var etag = ETag(exam, "modes");
        if (Matches(ifNoneMatch, etag)) return new(null, null, etag, true);
        var modes = await CachedAsync($"play:{examId}:{exam.UpdatedAt.Ticks}:modes", ContentTtl, () => BuildModesAsync(exam));
        return new(modes, null, etag);
    }

    public async Task<PlayResult<List<PlayDirectionDto>>> GetDirectionsAsync(int userId, int examId, string? ifNoneMatch)
    {
        var exam = await FindPublishedAsync(examId);
        if (exam is null) return PlayResult<List<PlayDirectionDto>>.Fail("EXAM_NOT_FOUND");
        if (!await _access.CanUseAsync(userId, exam.EffectiveAccess)) return PlayResult<List<PlayDirectionDto>>.Fail("VIP_REQUIRED");
        // Hướng dẫn mặc định (ExamId = null) có thể đổi mà không đổi UpdatedAt của đề, nên cache ngắn và không dùng ETag.
        var directions = await CachedAsync($"play:{examId}:{exam.UpdatedAt.Ticks}:directions", DirectionTtl, () => _reader.ReadDirectionsAsync(examId));
        var result = new List<PlayDirectionDto>();
        foreach (var d in directions)
        {
            var media = await _signer.SignAsync(d.Media.Select(m => new PlayMediaSource(m.MediaId, null, 0, m.MediaType, m.AltText, m.SortOrder, m.StorageKey)).ToList());
            result.Add(new PlayDirectionDto
            {
                DirectionKind = d.DirectionKind, Skill = d.Skill, PartNo = d.PartNo, DirectionsEn = d.DirectionsEn,
                DirectionsVi = d.DirectionsVi, ExampleEn = d.ExampleEn, ExampleVi = d.ExampleVi, Media = media
            });
        }
        return new(result, null);
    }

    public async Task<PlayResult<PartPlayDto>> GetPartAsync(int userId, int examId, byte partNo, bool includeMedia, string? ifNoneMatch)
    {
        var exam = await FindPublishedAsync(examId);
        if (exam is null) return PlayResult<PartPlayDto>.Fail("EXAM_NOT_FOUND");
        if (!await _access.CanUseAsync(userId, exam.EffectiveAccess)) return PlayResult<PartPlayDto>.Fail("VIP_REQUIRED");
        // Chỉ bản không kèm media có ETag: link ký đổi theo từng lần gọi nên bản có media không thể trùng.
        var etag = includeMedia ? null : ETag(exam, $"part{partNo}");
        if (etag is not null && Matches(ifNoneMatch, etag)) return new(null, null, etag, true);
        var part = await GetPartCacheAsync(exam, partNo);
        var groups = new List<PlayGroupDto>(part.Count);
        foreach (var source in part)
        {
            var media = includeMedia ? await _signer.SignAsync(source.Media) : [];
            groups.Add(WithMedia(source.Group, media));
        }
        return new(new PartPlayDto { ExamId = examId, PartNo = partNo, Groups = groups }, null, etag);
    }

    public async Task<PlayResult<PartMediaDto>> GetPartMediaAsync(int userId, int examId, byte partNo)
    {
        var exam = await FindPublishedAsync(examId);
        if (exam is null) return PlayResult<PartMediaDto>.Fail("EXAM_NOT_FOUND");
        if (!await _access.CanUseAsync(userId, exam.EffectiveAccess)) return PlayResult<PartMediaDto>.Fail("VIP_REQUIRED");
        var part = await GetPartCacheAsync(exam, partNo);
        var result = new PartMediaDto { ExamId = examId, PartNo = partNo };
        // Ký cả Part một lượt rồi chia lại theo nhóm.
        var all = part.SelectMany(s => s.Media).ToList();
        var signed = (await _signer.SignAsync(all)).ToDictionary(m => m.MediaId);
        foreach (var source in part.Where(s => s.Media.Count > 0))
            result.Groups.Add(new GroupMediaDto { GroupId = source.Group.GroupId, Media = source.Media.Select(m => signed[m.MediaId]).ToList() });
        return new(result, null);
    }

    // Đề phải đã xuất bản, chưa xóa, bộ đề chưa xóa (GetExamAsync với learner = true). Một truy vấn theo khóa chính.
    private Task<Exam?> FindPublishedAsync(int examId) => _timings.MeasureAsync("exam", () => _exams.GetExamAsync(examId, true));

    private Task<List<PlayGroupSource>> GetPartCacheAsync(Exam exam, byte partNo) =>
        CachedAsync($"play:{exam.ExamId}:{exam.UpdatedAt.Ticks}:part{partNo}", ContentTtl, () => _reader.ReadPlayAsync(exam.ExamId, partNo));

    // Cấu trúc đề cho hộp "Chọn chế độ" và thanh điều hướng: Part (số câu, thời gian đề xuất, dàn ý nhóm) và các phạm vi làm bài.
    // Chỉ liệt kê phạm vi thật sự có câu hỏi.
    private async Task<ExamModesDto> BuildModesAsync(Exam exam)
    {
        var rows = await _reader.ReadOutlineAsync(exam.ExamId);
        var settings = (await _content.GetCatalogAsync()).Parts.ToDictionary(p => p.PartNo);
        var seconds = settings.ToDictionary(p => p.Key, p => p.Value.DefaultSecondsPerQuestion);
        var parts = rows.GroupBy(r => r.PartNo).OrderBy(g => g.Key).Select(byPart =>
        {
            settings.TryGetValue(byPart.Key, out var setting);
            var groups = byPart.Select(r => r.Group).ToList();
            var questionCount = groups.Sum(g => g.QuestionCount);
            return new ModePartDto
            {
                PartNo = byPart.Key, PartName = setting?.PartName ?? $"Part {byPart.Key}",
                Skill = setting?.Skill ?? (byPart.Key <= 4 ? "LISTENING" : "READING"), QuestionCount = questionCount,
                SuggestedSeconds = ExamTimeRules.Suggested([(byPart.Key, questionCount)], seconds), Groups = groups
            };
        }).ToList();
        var modes = new ExamModesDto
        {
            ExamId = exam.ExamId, ExamCode = exam.ExamCode, Title = exam.Title, ExamSetId = exam.ExamSetId, Access = exam.EffectiveAccess, TotalQuestions = parts.Sum(p => p.QuestionCount),
            MinTimeLimitSeconds = ExamTimeRules.MinSeconds, MaxTimeLimitSeconds = ExamTimeRules.MaxSeconds, Parts = parts
        };
        ModeOptionDto Option(string scope, string name, Func<ModePartDto, bool> include, bool timed)
        {
            var parts = modes.Parts.Where(include).ToList();
            return new ModeOptionDto
            {
                Scope = scope, Name = name, PartNos = parts.Select(p => p.PartNo).ToList(), QuestionCount = parts.Sum(p => p.QuestionCount),
                TimeLimitSeconds = timed ? ExamTimeRules.DefaultFor(scope) : null
            };
        }
        modes.ExamOptions = new[]
        {
            Option(AttemptScope.Full, "Full Test", _ => true, true),
            Option(AttemptScope.Listening, "Thi Listening", p => p.PartNo <= 4, true),
            Option(AttemptScope.Reading, "Thi Reading", p => p.PartNo > 4, true)
        }.Where(o => o.QuestionCount > 0).ToList();
        modes.PracticeOptions = new[] { Option(AttemptScope.Full, "Chọn tất cả Part", _ => true, false) }.Where(o => o.QuestionCount > 0).ToList();
        return modes;
    }

    // Tạo bản sao nhóm kèm media; giữ nguyên danh sách câu hỏi (dùng chung, chỉ đọc) để không sao chép dữ liệu lớn.
    private static PlayGroupDto WithMedia(PlayGroupDto group, List<PlayMediaDto> media) => new()
    {
        GroupId = group.GroupId, ExamId = group.ExamId, PartNo = group.PartNo, GroupOrder = group.GroupOrder,
        PassageHtml = group.PassageHtml, Questions = group.Questions, Media = media
    };

    private static string ETag(Exam exam, string kind) => $"W/\"{exam.ExamId}-{exam.UpdatedAt.Ticks}-{kind}\"";

    private static bool Matches(string? ifNoneMatch, string etag) =>
        !string.IsNullOrWhiteSpace(ifNoneMatch) && ifNoneMatch.Split(',').Any(v => v.Trim() == etag);

    // Cache có chống "dồn cục": nhiều request cùng lúc chờ chung một lần dựng; dựng lỗi thì không giữ lại.
    private async Task<T> CachedAsync<T>(string key, TimeSpan ttl, Func<Task<T>> build)
    {
        if (_cache.TryGetValue(key, out Lazy<Task<T>>? lazy) && lazy is not null)
            _timings.Note("cache-hit");
        else
        {
            var fresh = new Lazy<Task<T>>(build);
            lazy = _cache.GetOrCreate(key, entry => { entry.AbsoluteExpirationRelativeToNow = ttl; return fresh; })!;
            _timings.Note(ReferenceEquals(lazy, fresh) ? "cache-miss" : "cache-hit");
        }
        try { return await lazy.Value; }
        catch
        {
            _cache.Remove(key);
            throw;
        }
    }
}
