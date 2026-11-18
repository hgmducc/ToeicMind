using ToeicMind.Repositories.Exams;
using ToeicMind.Repositories.Learning;

namespace ToeicMind.Services.Learning;

/// <summary>
/// Nghiệp vụ bài kiểm tra đầu vào (CHG-007). Admin ghép bài từ các nhóm câu của đề đã xuất bản (chọn tay hoặc gợi ý tự động trải đều Level),
/// đặt thời gian và bật một bài cho người học. Người học làm bài như Luyện thi (có giờ, chấm khi nộp); điểm ước tính và Level từng kỹ năng
/// được dùng làm điểm xuất phát cho lộ trình cá nhân.
/// </summary>
public class PlacementService : IPlacementService
{
    private readonly IPlacementRepository _repo;
    private readonly IAttemptService _attempts;
    private readonly IExamContentRepository _content;

    public PlacementService(IPlacementRepository repo, IAttemptService attempts, IExamContentRepository content)
    {
        _repo = repo;
        _attempts = attempts;
        _content = content;
    }

    // ---------- Admin ----------

    public async Task<List<PlacementTestSummaryDto>> ListAsync()
    {
        var tests = await _repo.ListAsync();
        var ids = tests.Select(t => t.PlacementTestId).ToList();
        var links = (await _repo.GetLinksAsync(ids)).ToLookup(l => l.PlacementTestId);
        var attempts = await _repo.CountAttemptsAsync(ids);
        return tests.Select(t => Summary(t, links[t.PlacementTestId].ToList(), attempts.GetValueOrDefault(t.PlacementTestId))).ToList();
    }

    public async Task<(PlacementTestSummaryDto? Result, string? Error)> GetAsync(int placementTestId)
    {
        var test = await _repo.GetAsync(placementTestId);
        if (test is null) return (null, "PLACEMENT_TEST_NOT_FOUND");
        var links = await _repo.GetLinksAsync([placementTestId]);
        var attempts = await _repo.CountAttemptsAsync([placementTestId]);
        var dto = Summary(test, links, attempts.GetValueOrDefault(placementTestId));
        var described = (await _repo.DescribeGroupsAsync(links.Select(l => l.GroupId).ToList())).ToDictionary(g => g.GroupId);
        dto.Groups = links.Where(l => described.ContainsKey(l.GroupId)).Select(l => described[l.GroupId]).ToList();
        return (dto, null);
    }

    public async Task<(PlacementTestSummaryDto? Result, string? Error)> SaveAsync(int adminId, int? placementTestId, SavePlacementTestRequestDto dto)
    {
        var valid = await _repo.ValidGroupIdsAsync(dto.GroupIds);
        if (dto.GroupIds.Any(id => !valid.Contains(id))) return (null, "PLACEMENT_GROUP_INVALID");
        var requested = new PlacementTest
        {
            PlacementTestId = placementTestId ?? 0, Title = dto.Title.Trim(), Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            TimeLimitSeconds = dto.TimeLimitSeconds, IsActive = dto.IsActive, CreatedBy = adminId
        };
        var (saved, error) = await _repo.SaveAsync(requested, dto.GroupIds, placementTestId is null);
        if (error is not null) return (null, error);
        return await GetAsync(saved!.PlacementTestId);
    }

    public Task<string?> DeleteAsync(int placementTestId) => _repo.SoftDeleteAsync(placementTestId);

    public async Task<PlacementGroupPageDto> SearchCandidatesAsync(PlacementCandidateRequestDto query)
    {
        HashSet<int>? categoryIds = null;
        if (query.CategoryId is { } categoryId)
        {
            var categories = (await _content.GetCatalogAsync()).Categories;
            categoryIds = CategoryTree.Subtree(categoryId, CategoryTree.ChildrenOf(categories));
        }
        var (items, total) = await _repo.SearchCandidatesAsync(query, categoryIds);
        return new PlacementGroupPageDto { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<(PlacementTestSummaryDto? Result, string? Error)> GenerateAsync(GeneratePlacementRequestDto dto)
    {
        var quotas = dto.Parts.Where(p => p.QuestionCount > 0).GroupBy(p => p.PartNo).ToDictionary(g => g.Key, g => g.Sum(p => p.QuestionCount));
        if (quotas.Count == 0) return (null, "PLACEMENT_EMPTY");
        var excluded = dto.ExcludeGroupIds.ToHashSet();
        var pool = (await _repo.GetPoolAsync(dto.ExamId)).Where(g => !excluded.Contains(g.GroupId)).ToList();
        var picked = new List<PlacementPoolRow>();
        foreach (var (partNo, quota) in quotas.OrderBy(q => q.Key))
            picked.AddRange(PickPart(pool.Where(g => g.PartNo == partNo).ToList(), quota));
        if (picked.Count == 0) return (null, "PLACEMENT_EMPTY");

        // Trong mỗi Part xếp từ dễ đến khó để người học khởi động trước.
        var ordered = picked.OrderBy(g => g.PartNo).ThenBy(g => g.LevelNo ?? 0).ThenBy(g => g.ExamId).ThenBy(g => g.GroupId).ToList();
        var described = (await _repo.DescribeGroupsAsync(ordered.Select(g => g.GroupId).ToList())).ToDictionary(g => g.GroupId);
        var links = ordered.Select((g, i) => new PlacementGroupLink(0, g.GroupId, (short)i, g.PartNo, g.QuestionCount, true)).ToList();
        var dtoOut = Summary(new PlacementTest { TimeLimitSeconds = await SuggestedSecondsAsync(links) }, links, 0);
        dtoOut.Groups = ordered.Where(g => described.ContainsKey(g.GroupId)).Select(g => described[g.GroupId]).ToList();
        return (dtoOut, null);
    }

    // Chọn trọn nhóm cho một Part tới đúng số câu mong muốn: luân phiên các Level (dễ → khó), ưu tiên phân loại chưa dùng để phủ nhiều chủ điểm.
    internal static List<PlacementPoolRow> PickPart(List<PlacementPoolRow> candidates, int quota)
    {
        var buckets = candidates.OrderBy(_ => Random.Shared.Next()).GroupBy(g => g.LevelNo ?? 0).OrderBy(g => g.Key)
            .Select(g => g.ToList()).ToList();
        var picked = new List<PlacementPoolRow>();
        var categories = new HashSet<int>();
        var total = 0;
        var progress = true;
        while (total < quota && progress)
        {
            progress = false;
            foreach (var bucket in buckets)
            {
                if (total >= quota) break;
                var fits = bucket.Where(g => total + g.QuestionCount <= quota).ToList();
                var choice = fits.FirstOrDefault(g => !categories.Contains(g.CategoryId)) ?? fits.FirstOrDefault();
                if (choice is null) continue;
                bucket.Remove(choice);
                picked.Add(choice);
                categories.Add(choice.CategoryId);
                total += choice.QuestionCount;
                progress = true;
            }
        }
        return picked;
    }

    private async Task<int> SuggestedSecondsAsync(IEnumerable<PlacementGroupLink> links)
    {
        var settings = (await _content.GetCatalogAsync()).Parts.ToDictionary(p => p.PartNo, p => p.DefaultSecondsPerQuestion);
        var seconds = ExamTimeRules.Suggested(links.GroupBy(l => l.PartNo).Select(g => (g.Key, g.Sum(l => l.QuestionCount))), settings);
        // Làm tròn lên phút, tối thiểu 5 phút.
        return Math.Clamp((int)Math.Ceiling(seconds / 60.0) * 60, 300, ExamTimeRules.MaxSeconds);
    }

    private static PlacementTestSummaryDto Summary(PlacementTest test, IReadOnlyCollection<PlacementGroupLink> links, int attemptCount)
    {
        var live = links.Where(l => l.Live).ToList();
        return new PlacementTestSummaryDto
        {
            PlacementTestId = test.PlacementTestId, Title = test.Title, Description = test.Description, TimeLimitSeconds = test.TimeLimitSeconds,
            IsActive = test.IsActive, GroupCount = live.Count, TotalQuestions = live.Sum(l => l.QuestionCount), AttemptCount = attemptCount,
            CreatedAt = test.CreatedAt, UpdatedAt = test.UpdatedAt, Parts = Parts(live)
        };
    }

    private static List<PlacementPartDto> Parts(IEnumerable<PlacementGroupLink> links) =>
        links.GroupBy(l => l.PartNo).OrderBy(g => g.Key)
            .Select(g => new PlacementPartDto { PartNo = g.Key, GroupCount = g.Count(), QuestionCount = g.Sum(l => l.QuestionCount) }).ToList();

    // ---------- Người học ----------

    public async Task<PlacementStatusDto> GetStatusAsync(int userId)
    {
        var status = new PlacementStatusDto
        {
            InProgressAttemptId = await _repo.GetInProgressAttemptIdAsync(userId),
            LastResult = await LastResultAsync(userId)
        };
        var active = await _repo.GetActiveAsync();
        if (active is null) return status;
        var live = (await _repo.GetLinksAsync([active.PlacementTestId])).Where(l => l.Live).ToList();
        if (live.Count == 0) return status;
        status.Available = true;
        status.Test = new PlacementTestInfoDto
        {
            PlacementTestId = active.PlacementTestId, Title = active.Title, Description = active.Description, TimeLimitSeconds = active.TimeLimitSeconds,
            TotalQuestions = live.Sum(l => l.QuestionCount), Parts = Parts(live)
        };
        return status;
    }

    public async Task<(AttemptDto? Result, string? Error)> StartAsync(int userId)
    {
        if (await _repo.GetInProgressAttemptIdAsync(userId) is { } running) return await _attempts.GetAsync(userId, running);
        var active = await _repo.GetActiveAsync();
        if (active is null) return (null, "PLACEMENT_NOT_AVAILABLE");
        var groupIds = (await _repo.GetLinksAsync([active.PlacementTestId])).Where(l => l.Live).OrderBy(l => l.SortOrder).Select(l => l.GroupId).ToList();
        if (groupIds.Count == 0) return (null, "PLACEMENT_NOT_AVAILABLE");
        return await _attempts.StartPlacementAsync(userId, active.PlacementTestId, groupIds, active.TimeLimitSeconds);
    }

    internal async Task<PlacementResultDto?> LastResultAsync(int userId)
    {
        var row = await _repo.GetLastResultAsync(userId);
        if (row is null) return null;
        var levels = (await _content.GetCatalogAsync()).Levels;
        return new PlacementResultDto
        {
            AttemptId = row.AttemptId, PlacementTestId = row.PlacementTestId, Title = row.Title ?? "Kiểm tra đầu vào", SubmittedAt = row.SubmittedAt,
            TotalQuestions = row.TotalQuestions, CorrectCount = row.CorrectCount,
            ListeningScaled = row.ListeningScaled, ReadingScaled = row.ReadingScaled, TotalScaled = row.TotalScaled,
            ListeningLevel = row.ListeningScaled is { } l ? ScoreBands.Info(ScoreBands.LevelFor(l), levels) : null,
            ReadingLevel = row.ReadingScaled is { } r ? ScoreBands.Info(ScoreBands.LevelFor(r), levels) : null
        };
    }
}
