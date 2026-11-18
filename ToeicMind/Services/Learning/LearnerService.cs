using System.Text.RegularExpressions;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Repositories.Exams;
using ToeicMind.Repositories.Grammar;
using ToeicMind.Repositories.Learning;
using ToeicMind.Services.Vip;

namespace ToeicMind.Services.Learning;

/// <summary>Nghiệp vụ tiến độ học: tổng quan học tập (chuỗi ngày học, độ chính xác, điểm, ngày học), ngân hàng câu hỏi (Part 1–7) theo thẻ Level/chủ điểm, tab Ngữ pháp. Danh sách thẻ công khai: khách xem được, chưa có tiến độ.</summary>
public partial class LearnerService : ILearnerService
{
    private readonly IProgressRepository _progress;
    private readonly IAttemptRepository _attempts;
    private readonly IAttemptService _attemptService;
    private readonly IConfiguration _config;
    private readonly IExamContentRepository _content;
    private readonly IAccessService _access;
    private const byte GrammarPart = 5;   // Ngữ pháp chỉ ở Part 5 (BR-06)

    private readonly IGrammarArticleRepository _articles;

    public LearnerService(IProgressRepository progress, IAttemptRepository attempts, IAttemptService attemptService, IConfiguration config,
        IExamContentRepository content, IAccessService access, IGrammarArticleRepository articles)
    {
        _articles = articles;
        _access = access;
        _content = content;
        _progress = progress;
        _attempts = attempts;
        _attemptService = attemptService;
        _config = config;
    }

    public async Task<LearnerDashboardDto> GetDashboardAsync(int userId, LearnerDashboardRequestDto query)
    {
        var totals = await _progress.GetTotalsAsync(userId);
        var today = _config.StudyToday();
        // Một truy vấn ngày học: dùng cho chuỗi ngày học (mọi ngày) và lịch học (Days ngày gần nhất).
        var studyDays = await _progress.GetStudyDaysAsync(userId);
        var (current, longest, studiedToday) = Streaks(studyDays.Select(d => d.Date).ToList(), today);
        var from = today.AddDays(1 - query.Days);
        var (recent, _) = await _attempts.ListAsync(userId, new AttemptListRequestDto { Page = 1, PageSize = 5 });
        return new LearnerDashboardDto
        {
            TotalAttempts = totals.TotalAttempts, SubmittedAttempts = totals.SubmittedAttempts, AnsweredQuestions = totals.AnsweredQuestions,
            CorrectAnswers = totals.CorrectAnswers, AccuracyPercent = totals.AccuracyPercent,
            CurrentStreak = current, LongestStreak = longest, StudiedToday = studiedToday,
            BestTotalScaled = totals.BestTotalScaled, LastTotalScaled = totals.LastTotalScaled, SavedWordCount = totals.SavedWords,
            Parts = await _progress.GetPartProgressAsync(userId),
            StudyDays = studyDays.Where(d => d.Date >= from).ToList(),
            ScoreHistory = await _progress.GetScorePointsAsync(userId, query.ScoreLimit),
            RecentAttempts = recent
        };
    }

    // ---------- Ngân hàng câu hỏi (Part 1–7) ----------

    public async Task<BankCardsDto> GetBankCardsAsync(int? userId, byte partNo, BankCardsRequestDto query)
    {
        var catalog = await _content.GetCatalogAsync();
        var rows = await _progress.GetBankQuestionsAsync(userId, partNo);
        var vip = await _access.HasVipAsync(userId);
        var categories = catalog.Categories.Where(c => c.PartNo == partNo).ToList();
        var children = CategoryTree.ChildrenOf(categories);

        // Ô "Tất cả chủ điểm" thu hẹp thẻ Level; bộ lọc Level thu hẹp thẻ chủ điểm.
        var byCategory = query.CategoryId is { } categoryId ? CategoryTree.Subtree(categoryId, children) : null;
        var levelRows = byCategory is null ? rows : rows.Where(r => byCategory.Contains(r.CategoryId)).ToList();
        var categoryRows = query.LevelNo is { } levelNo ? rows.Where(r => r.LevelNo == levelNo).ToList() : rows;

        var dto = new BankCardsDto { PartNo = partNo, TotalQuestions = categoryRows.Count };
        foreach (var level in catalog.Levels.OrderBy(l => l.LevelNo))
        {
            var inside = levelRows.Where(r => r.LevelNo == level.LevelNo).ToList();
            if (inside.Count == 0) continue;
            var card = Card($"level-{level.LevelNo}", "LEVEL", level.NameVi, inside, vip);
            card.ShortLabel = level.ShortLabel;
            dto.LevelCards.Add(card);
        }

        // Thẻ chủ điểm: các nút ở cấp cao nhất; nếu cả Part chỉ có một nút gốc thì dùng các nút con của nó.
        var roots = categories.Where(c => c.ParentCategoryId is null).OrderBy(c => c.SortOrder).ToList();
        var nodes = roots.Count == 1 && children[roots[0].CategoryId].Any() ? children[roots[0].CategoryId].OrderBy(c => c.SortOrder).ToList() : roots;
        foreach (var node in nodes)
        {
            var ids = CategoryTree.Subtree(node.CategoryId, children);
            var inside = categoryRows.Where(r => ids.Contains(r.CategoryId)).ToList();
            if (inside.Count == 0) continue;
            var card = Card($"cat-{node.CategoryId}", "CATEGORY", node.NameVi, inside, vip);
            card.Children = children[node.CategoryId].OrderBy(c => c.SortOrder)
                .Where(c => rows.Any(r => CategoryTree.Subtree(c.CategoryId, children).Contains(r.CategoryId))).Select(c => c.NameVi).ToList();
            dto.CategoryCards.Add(card);
        }

        // Cây phân loại cho ô lọc: duyệt từ gốc, mỗi nút kèm số câu đã cộng các nút con.
        void Walk(CategoryCatalogDto node, int depth)
        {
            var ids = CategoryTree.Subtree(node.CategoryId, children);
            var count = rows.Count(r => ids.Contains(r.CategoryId));
            if (count == 0) return;
            dto.Categories.Add(new BankCategoryOptionDto
            {
                CategoryId = node.CategoryId, ParentCategoryId = node.ParentCategoryId, Name = node.NameVi, Depth = depth, IsLeaf = node.IsLeaf, QuestionCount = count
            });
            foreach (var child in children[node.CategoryId].OrderBy(c => c.SortOrder)) Walk(child, depth + 1);
        }
        foreach (var root in roots) Walk(root, 0);
        return dto;
    }

    public async Task<GrammarTopicsDto> GetGrammarTopicsAsync(int? userId, int? parentCategoryId)
    {
        var catalog = await _content.GetCatalogAsync();
        var rows = await _progress.GetBankQuestionsAsync(userId, GrammarPart);
        var vip = await _access.HasVipAsync(userId);
        var byId = catalog.Categories.Where(c => c.PartNo == GrammarPart).ToDictionary(c => c.CategoryId);
        var topics = (await _progress.GetGrammarTopicsAsync()).Where(t => byId.ContainsKey(t.CategoryId)).ToList();
        var withArticle = await _articles.GetTopicIdsWithArticleAsync();

        var result = new GrammarTopicsDto();
        // Nhóm theo phân loại cha (Từ loại, Động từ, Ngữ pháp khác); chủ điểm không có cha tự thành một nhóm.
        var groups = topics.GroupBy(t => byId[t.CategoryId].ParentCategoryId ?? t.CategoryId)
            .Select(g => new { GroupId = g.Key, Topics = g.OrderBy(t => t.SortOrder).ToList() })
            .OrderBy(g => g.Topics.Min(t => t.SortOrder)).ToList();
        foreach (var group in groups)
        {
            if (parentCategoryId is { } wanted && wanted != group.GroupId) continue;
            var node = byId.GetValueOrDefault(group.GroupId);
            var dto = new GrammarGroupDto { CategoryId = group.GroupId, CardKey = $"cat-{group.GroupId}", Name = node?.NameVi ?? $"Nhóm {group.GroupId}" };
            foreach (var topic in group.Topics)
            {
                var inside = rows.Where(r => r.CategoryId == topic.CategoryId).ToList();
                var card = Card($"cat-{topic.CategoryId}", "CATEGORY", byId[topic.CategoryId].NameVi, inside, vip);
                dto.Topics.Add(new GrammarTopicDto
                {
                    GrammarTopicId = topic.GrammarTopicId, HasArticle = withArticle.Contains(topic.GrammarTopicId),
                    CategoryId = topic.CategoryId, CardKey = card.CardKey, Name = card.Name, Summary = topic.Summary, TotalQuestions = card.TotalQuestions,
                    PracticedCount = card.PracticedCount, CorrectCount = card.CorrectCount, WrongCount = card.WrongCount, Status = card.Status,
                    LockedCount = card.LockedCount
                });
            }
            dto.TopicCount = dto.Topics.Count;
            dto.TotalQuestions = dto.Topics.Sum(t => t.TotalQuestions);
            dto.PracticedCount = dto.Topics.Sum(t => t.PracticedCount);
            dto.WrongCount = dto.Topics.Sum(t => t.WrongCount);
            result.Groups.Add(dto);
        }
        result.TotalQuestions = result.Groups.Sum(g => g.TotalQuestions);
        result.PracticedCount = result.Groups.Sum(g => g.PracticedCount);
        result.CorrectCount = result.Groups.SelectMany(g => g.Topics).Sum(t => t.CorrectCount);
        result.WrongCount = result.Groups.Sum(g => g.WrongCount);
        return result;
    }

    public async Task<(AttemptDto? Result, string? Error)> StartBankAttemptAsync(int userId, StartBankAttemptRequestDto dto)
    {
        var scope = await ResolveScopeAsync(dto.PartNo, dto.CardKey, dto.CategoryId, dto.LevelNo);
        if (scope is null) return (null, "BANK_CARD_INVALID");
        var batch = Math.Clamp(_config.GetValue<int?>("Learning:BankBatchQuestions") ?? 20, 5, 100);
        var (total, groupIds, vipBlocked) = await _progress.PickBankGroupsAsync(userId, scope, dto.Pick, batch, await _access.HasVipAsync(userId));
        if (total == 0) return (null, "BANK_CARD_INVALID");
        // Không còn câu miễn phí nhưng còn câu VIP: báo cần nâng cấp thay vì "hết câu".
        if (groupIds.Count == 0) return (null, vipBlocked > 0 ? "VIP_REQUIRED" : "BANK_EMPTY");
        return await _attemptService.StartBankAsync(userId, groupIds);
    }

    public async Task<(int Cleared, string? Error)> ResetBankCardAsync(int userId, byte partNo, string cardKey)
    {
        var scope = await ResolveScopeAsync(partNo, cardKey, null, null);
        if (scope is null) return (0, "BANK_CARD_INVALID");
        return (await _progress.ResetBankAsync(userId, scope), null);
    }

    // Đổi khóa thẻ (level-N, cat-N, all, grammar) thành phạm vi câu hỏi; null nếu khóa không hợp lệ với Part.
    private async Task<BankScope?> ResolveScopeAsync(byte partNo, string cardKey, int? extraCategoryId, byte? extraLevelNo)
    {
        var match = CardKeyPattern().Match(cardKey);
        if (!match.Success) return null;
        var categories = (await _content.GetCatalogAsync()).Categories.Where(c => c.PartNo == partNo).ToList();
        var children = CategoryTree.ChildrenOf(categories);

        byte? level = extraLevelNo;
        HashSet<int>? ids = null;
        var kind = match.Groups[1].Success ? match.Groups[1].Value : match.Groups[3].Value;
        if (kind == "level")
        {
            if (!byte.TryParse(match.Groups[2].Value, out var levelNo)) return null;
            level = levelNo;
        }
        else if (kind == "cat")
        {
            var categoryId = int.Parse(match.Groups[2].Value);
            if (categories.All(c => c.CategoryId != categoryId)) return null;
            ids = CategoryTree.Subtree(categoryId, children);
        }
        else if (kind == "grammar")
        {
            if (partNo != GrammarPart) return null;
            ids = (await _progress.GetGrammarTopicsAsync()).Select(t => t.CategoryId).ToHashSet();
        }

        if (extraCategoryId is { } extra)
        {
            if (categories.All(c => c.CategoryId != extra)) return null;
            var subtree = CategoryTree.Subtree(extra, children);
            ids = ids is null ? subtree : ids.Where(subtree.Contains).ToHashSet();
        }
        return new BankScope(partNo, level, ids);
    }

    private static BankCardDto Card(string key, string kind, string name, List<BankQuestionRow> rows, bool vip)
    {
        var practiced = rows.Count(r => r.Practiced);
        return new BankCardDto
        {
            CardKey = key, Kind = kind, Name = name, TotalQuestions = rows.Count, PracticedCount = practiced,
            CorrectCount = rows.Count(r => r.LastCorrect == true), WrongCount = rows.Count(r => r.LastCorrect == false),
            Status = practiced == 0 ? "NEW" : practiced < rows.Count ? "IN_PROGRESS" : "DONE",
            LockedCount = vip ? 0 : rows.Count(r => r.VipOnly)
        };
    }

    [GeneratedRegex("^(level|cat)-([0-9]{1,9})$|^(all|grammar)$")]
    private static partial Regex CardKeyPattern();

    // Chuỗi hiện tại: các ngày liên tiếp tính đến hôm nay, hoặc đến hôm qua nếu hôm nay chưa học (chưa mất chuỗi).
    internal static (int Current, int Longest, bool StudiedToday) Streaks(IReadOnlyList<DateOnly> sortedDays, DateOnly today)
    {
        var days = sortedDays.Distinct().Order().ToList();
        var longest = 0;
        var run = 0;
        DateOnly? previous = null;
        foreach (var day in days)
        {
            run = previous is { } p && day == p.AddDays(1) ? run + 1 : 1;
            longest = Math.Max(longest, run);
            previous = day;
        }
        var set = days.ToHashSet();
        var studiedToday = set.Contains(today);
        var cursor = studiedToday ? today : today.AddDays(-1);
        var current = 0;
        while (set.Contains(cursor)) { current++; cursor = cursor.AddDays(-1); }
        return (current, longest, studiedToday);
    }
}
