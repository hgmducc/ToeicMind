using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Exams;
using ToeicMind.Repositories.Learning;
using ToeicMind.Services.Vip;

namespace ToeicMind.Services.Learning;

/// <summary>
/// Nghiệp vụ Nghe chép: người học nghe từng clip (câu cắt từ nhóm câu Nghe của đề gốc) rồi chép lại.
/// Chia theo bộ đề gốc → đề → Part 1–4, hoặc lọc "Theo chủ đề" (loại bài, Level, dạng đặc biệt) và "Câu cần luyện".
/// Luyện theo Part 1–4 bằng câu hỏi chuẩn của đề thì dùng ngân hàng câu hỏi (/api/bank), không dùng clip cắt.
/// Server chỉ lưu tiến độ; việc ẩn từ và chấm độ chính xác do client thực hiện từ script trả về.
/// Các danh sách (tổng quan, đề, chủ đề, bộ clip) công khai: userId null là khách, mọi bộ clip đều "chưa luyện".
/// Nội dung clip (script, bản dịch, audio) và lưu tiến độ cần đăng nhập.
/// </summary>
public class DictationService : IDictationService
{
    private readonly IDictationRepository _repo;
    private readonly IExamContentRepository _content;
    private readonly PlayMediaSigner _signer;
    private readonly IConfiguration _config;
    private readonly IAccessService _access;

    public DictationService(IDictationRepository repo, IExamContentRepository content, PlayMediaSigner signer, IConfiguration config, IAccessService access)
    {
        _access = access;
        _repo = repo;
        _content = content;
        _signer = signer;
        _config = config;
    }

    public async Task<DictationOverviewDto> GetOverviewAsync(int? userId)
    {
        var rows = await _repo.GetItemsAsync(userId, new DictationFilter());
        var vip = await _access.HasVipAsync(userId);
        var threshold = Threshold();
        return new DictationOverviewDto
        {
            TotalItems = rows.Count, TotalClips = rows.Sum(r => r.ClipCount),
            PracticedItems = rows.Count(r => r.PracticeCount > 0), NeedsPracticeItems = rows.Count(r => NeedsPractice(r, threshold)),
            StandaloneItems = rows.Count(r => r.ExamSetId is null),
            Sets = rows.Where(r => r.ExamSetId is not null).GroupBy(r => r.ExamSetId!.Value).OrderBy(g => g.Key).Select(g => new DictationSetDto
            {
                ExamSetId = g.Key, Name = g.First().ExamSetName!, ExamCount = g.Select(r => r.ExamId).Distinct().Count(),
                ItemCount = g.Count(), ClipCount = g.Sum(r => r.ClipCount),
                PracticedItems = g.Count(r => r.PracticeCount > 0), NeedsPracticeItems = g.Count(r => NeedsPractice(r, threshold)),
                Access = g.First().VipOnly ? Access.Vip : Access.Free, IsLocked = g.First().VipOnly && !vip
            }).ToList()
        };
    }

    public async Task<List<DictationExamDto>> GetExamsAsync(int? userId, int examSetId)
    {
        var rows = await _repo.GetItemsAsync(userId, new DictationFilter(ExamSetId: examSetId));
        var parts = (await _content.GetCatalogAsync()).Parts.ToDictionary(p => p.PartNo, p => p.PartName);
        var vip = await _access.HasVipAsync(userId);
        var threshold = Threshold();
        return rows.Where(r => r.ExamId is not null).GroupBy(r => r.ExamId!.Value).OrderBy(g => g.Key).Select(exam => new DictationExamDto
        {
            ExamId = exam.Key, ExamCode = exam.First().ExamCode!, Title = exam.First().ExamTitle!, IsLocked = exam.First().VipOnly && !vip,
            Parts = exam.GroupBy(r => r.PartNo).OrderBy(p => p.Key).Select(part =>
            {
                var practiced = part.Count(r => r.PracticeCount > 0);
                var needs = part.Count(r => NeedsPractice(r, threshold));
                return new DictationPartCardDto
                {
                    PartNo = part.Key, PartName = parts.GetValueOrDefault(part.Key) ?? $"Part {part.Key}", ItemCount = part.Count(),
                    ClipCount = part.Sum(r => r.ClipCount), PracticedItems = practiced, NeedsPracticeItems = needs,
                    Status = practiced == 0 ? "NEW" : practiced == part.Count() && needs == 0 ? "DONE" : "IN_PROGRESS"
                };
            }).ToList()
        }).ToList();
    }

    public async Task<DictationTopicsDto> GetTopicsAsync(int? userId, DictationTopicsRequestDto query)
    {
        var rows = await _repo.GetItemsAsync(userId, new DictationFilter(PartNo: query.PartNo));
        var catalog = await _content.GetCatalogAsync();
        var result = new DictationTopicsDto { PartNo = query.PartNo };

        // Loại bài: số liệu của mỗi nút gồm cả các loại con.
        var categories = catalog.Categories.Where(c => c.PartNo <= 4 && (query.PartNo is null || c.PartNo == query.PartNo)).ToList();
        var children = CategoryTree.ChildrenOf(categories);
        foreach (var category in categories.OrderBy(c => c.PartNo).ThenBy(c => c.SortOrder))
        {
            var ids = CategoryTree.Subtree(category.CategoryId, children);
            var inside = rows.Where(r => ids.Contains(r.CategoryId)).ToList();
            if (inside.Count == 0) continue;
            result.Categories.Add(new DictationCategoryDto
            {
                CategoryId = category.CategoryId, PartNo = category.PartNo, ParentCategoryId = category.ParentCategoryId, Name = category.NameVi,
                IsLeaf = category.IsLeaf, ItemCount = inside.Count, ClipCount = inside.Sum(r => r.ClipCount), PracticedItems = inside.Count(r => r.PracticeCount > 0)
            });
        }

        result.Levels = catalog.Levels.OrderBy(l => l.LevelNo).Select(l =>
        {
            var inside = rows.Where(r => r.LevelNo == l.LevelNo).ToList();
            return new DictationLevelDto { LevelNo = l.LevelNo, Name = l.NameVi, ItemCount = inside.Count, ClipCount = inside.Sum(r => r.ClipCount) };
        }).Where(l => l.ItemCount > 0).ToList();

        var tags = await _repo.GetTagsAsync(GroupIds(rows));
        result.SpecialTags = catalog.SpecialTags.Where(t => query.PartNo is null || t.PartNo == query.PartNo).OrderBy(t => t.PartNo).ThenBy(t => t.SpecialTagId).Select(t =>
        {
            var inside = rows.Where(r => r.GroupId is { } groupId && tags[groupId].Contains(t.SpecialTagId)).ToList();
            return new DictationTagDto { SpecialTagId = t.SpecialTagId, PartNo = t.PartNo, Name = t.NameVi, ItemCount = inside.Count, ClipCount = inside.Sum(r => r.ClipCount) };
        }).Where(t => t.ItemCount > 0).ToList();
        return result;
    }

    public async Task<DictationItemPageDto> GetItemsAsync(int? userId, DictationItemListRequestDto query)
    {
        var catalog = await _content.GetCatalogAsync();
        IReadOnlyCollection<int>? categoryIds = null;
        if (query.CategoryId is { } categoryId)
            categoryIds = CategoryTree.Subtree(categoryId, CategoryTree.ChildrenOf(catalog.Categories));
        var rows = await _repo.GetItemsAsync(userId, new DictationFilter(null, query.ExamSetId, query.ExamId, query.PartNo, categoryIds, query.LevelNo, query.SpecialTagId, query.Source));
        var threshold = Threshold();
        var vip = await _access.HasVipAsync(userId);
        var filtered = query.Status switch
        {
            "NEW" => rows.Where(r => r.PracticeCount == 0),
            "PRACTICED" => rows.Where(r => r.PracticeCount > 0),
            "NEEDS_PRACTICE" => rows.Where(r => NeedsPractice(r, threshold)).OrderBy(r => r.LastAccuracy).ThenBy(r => r.LastPracticedAt),
            "DONE" => rows.Where(r => r.PracticeCount > 0 && !NeedsPractice(r, threshold)),
            _ => rows
        };
        var list = filtered.ToList();
        var pageRows = list.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToList();
        var tags = await _repo.GetTagsAsync(GroupIds(pageRows));
        return new DictationItemPageDto
        {
            Items = pageRows.Select(r => ToDto(r, tags, catalog, threshold, vip)).ToList(), TotalCount = list.Count, Page = query.Page, PageSize = query.PageSize
        };
    }

    public async Task<(DictationItemDetailDto? Result, string? Error)> GetItemAsync(int userId, int itemId)
    {
        var row = (await _repo.GetItemsAsync(userId, new DictationFilter(ItemId: itemId))).FirstOrDefault();
        if (row is null) return (null, "DICTATION_ITEM_NOT_FOUND");
        if (row.VipOnly && !await _access.HasVipAsync(userId)) return (null, "VIP_REQUIRED");
        var catalog = await _content.GetCatalogAsync();
        var tags = await _repo.GetTagsAsync(GroupIds([row]));
        var clips = await _repo.GetClipsAsync(itemId);
        // Ký link audio của cả bộ clip một lượt, rồi chia lại theo clip.
        var signed = (await _signer.SignAsync(clips.SelectMany(c => c.Audio).ToList())).ToDictionary(m => m.MediaId);
        // Admin thường nhập bản dịch ở mức nhóm, clip không có bản dịch riêng: Part 1–2 tách theo (A)(B)(C)(D)/câu hỏi, Part 3–4 trả nguyên bản dịch nhóm.
        string? groupTranslation = null;
        Dictionary<string, string>? byRole = null;
        // Bộ clip sưu tầm không có nhóm: chỉ dùng bản dịch riêng từng clip.
        if (row.GroupId is { } groupId && clips.Any(c => string.IsNullOrWhiteSpace(c.TranslationVi)))
        {
            groupTranslation = (await _repo.GetGroupTranslationAsync(groupId))?.Trim();
            if (!string.IsNullOrEmpty(groupTranslation) && row.PartNo <= 2) byRole = SplitTranslationByRole(groupTranslation);
        }
        return (new DictationItemDetailDto
        {
            Item = ToDto(row, tags, catalog, Threshold(), true),
            Clips = clips.Select(c => new DictationClipDto
            {
                ClipId = c.ClipId, Seq = c.Seq, Role = c.Role, Speaker = c.Speaker, TranscriptEn = c.TranscriptEn,
                TranslationVi = !string.IsNullOrWhiteSpace(c.TranslationVi) ? c.TranslationVi : byRole?.GetValueOrDefault(c.Role),
                DurationSeconds = c.DurationSeconds, Audio = c.Audio.Select(m => signed[m.MediaId]).ToList()
            }).ToList(),
            GroupTranslationVi = byRole is null ? groupTranslation : null
        }, null);
    }

    // Tách bản dịch nhóm Part 1–2 thành từng dòng: dòng không có tiền tố là câu hỏi (QUESTION), dòng "(A) ..." là OPTION_A...
    private static Dictionary<string, string> SplitTranslationByRole(string text)
    {
        var map = new Dictionary<string, string>();
        foreach (var raw in text.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (raw.Length > 3 && raw[0] == '(' && raw[2] == ')' && raw[1] is >= 'A' and <= 'D')
                map.TryAdd("OPTION_" + raw[1], raw[3..].Trim());
            else
                map.TryAdd("QUESTION", raw);
        }
        return map;
    }

    public async Task<(DictationProgressDto? Result, string? Error)> SaveProgressAsync(int userId, int itemId, SaveDictationProgressRequestDto dto)
    {
        var row = (await _repo.GetItemsAsync(userId, new DictationFilter(ItemId: itemId))).FirstOrDefault();
        if (row is null) return (null, "DICTATION_ITEM_NOT_FOUND");
        if (row.VipOnly && !await _access.HasVipAsync(userId)) return (null, "VIP_REQUIRED");
        var now = DateTime.UtcNow;
        var saved = await _repo.SaveProgressAsync(userId, itemId, dto.Mode, dto.AccuracyPercent, now);
        await _repo.TouchClipStudyDayAsync(userId, _config.StudyDate(now), row.ClipCount);
        var threshold = Threshold();
        return (new DictationProgressDto
        {
            ItemId = itemId, PracticeCount = saved.PracticeCount, LastAccuracy = saved.LastAccuracy, BestAccuracy = saved.BestAccuracy,
            LastMode = saved.LastMode, LastPracticedAt = saved.LastPracticedAt,
            Status = saved.LastAccuracy is { } a && a < threshold ? "NEEDS_PRACTICE" : "DONE"
        }, null);
    }

    // ---------- Hỗ trợ ----------

    // Bộ clip có độ chính xác lần gần nhất thấp hơn ngưỡng (mặc định 80%) thuộc nhóm "Câu cần luyện".
    private decimal Threshold() => Math.Clamp(_config.GetValue<decimal?>("Learning:DictationNeedsPracticePercent") ?? 80m, 1m, 100m);

    private static bool NeedsPractice(DictationItemRow row, decimal threshold) =>
        row.PracticeCount > 0 && row.LastAccuracy is { } accuracy && accuracy < threshold;

    private static string StatusOf(DictationItemRow row, decimal threshold) =>
        row.PracticeCount == 0 ? "NEW" : NeedsPractice(row, threshold) ? "NEEDS_PRACTICE" : "DONE";

    private static List<int> GroupIds(IEnumerable<DictationItemRow> rows) =>
        rows.Where(r => r.GroupId is not null).Select(r => r.GroupId!.Value).ToList();

    private static DictationItemDto ToDto(DictationItemRow r, ILookup<int, int> tags, ExamCatalogDto catalog, decimal threshold, bool vip) => new()
    {
        ItemId = r.ItemId, SourceKind = r.GroupId is null ? "STANDALONE" : "EXAM", SourceNote = r.SourceNote, GroupId = r.GroupId, ExamId = r.ExamId, ExamCode = r.ExamCode, ExamTitle = r.ExamTitle, ExamSetId = r.ExamSetId,
        ExamSetName = r.ExamSetName, PartNo = r.PartNo, GroupOrder = r.GroupOrder, FirstQuestionNo = r.FirstQuestionNo, CategoryId = r.CategoryId,
        CategoryName = catalog.Categories.FirstOrDefault(c => c.CategoryId == r.CategoryId)?.NameVi,
        LevelNo = r.LevelNo, LevelName = catalog.Levels.FirstOrDefault(l => l.LevelNo == r.LevelNo)?.NameVi,
        SpecialTagIds = r.GroupId is { } groupId ? tags[groupId].Order().ToList() : [], ClipCount = r.ClipCount, DurationSeconds = r.DurationSeconds,
        PracticeCount = r.PracticeCount, LastAccuracy = r.LastAccuracy, BestAccuracy = r.BestAccuracy, LastMode = r.LastMode,
        LastPracticedAt = r.LastPracticedAt, Status = StatusOf(r, threshold), IsLocked = r.VipOnly && !vip
    };
}
