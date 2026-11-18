using Microsoft.Data.SqlClient;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Repositories.Exams;
using ToeicMind.Repositories.Learning;
using ToeicMind.Services.Vip;

namespace ToeicMind.Services.Learning;

/// <summary>
/// Cá nhân hóa (CHG-007): tính thông tin người học rồi gợi ý bài học trong nội dung đã chia sẵn của database.
/// <list type="number">
/// <item>Điểm hiện tại từng kỹ năng: lần đo gần nhất (kiểm tra đầu vào, bài làm đủ 100 câu của kỹ năng); chưa có thì ước tính từ tỷ lệ đúng khi luyện (≥ 20 câu).</item>
/// <item>Điểm mạnh/yếu: theo lần trả lời gần nhất của từng câu (UserQuestionProgress), gom theo Part, Level và chủ điểm (lá của QuestionCategory, gộp lên nhóm cha khi lá còn ít dữ liệu).</item>
/// <item>Level nên luyện: Level của điểm hiện tại (LevelBand); lên một Level khi đã đúng ≥ 75% trên ≥ 10 câu của Level đó.</item>
/// <item>Gợi ý: kiểm tra đầu vào, mục tiêu, ôn từ đến hạn, chủ điểm yếu, Part/Level của kỹ năng cần ưu tiên, nghe chép, Part chưa luyện, từ mới, thi thử.
/// Mỗi gợi ý có lý do và hành động mở đúng bài (thẻ ngân hàng, phiên từ vựng, bộ clip, đề thi).</item>
/// <item>Kế hoạch hôm nay: lấy gợi ý theo độ ưu tiên tới khi đủ số phút học mỗi ngày.</item>
/// </list>
/// Chỉ đọc dữ liệu; không lưu gợi ý (tính lại mỗi lần để phản ánh ngay kết quả học mới nhất).
/// </summary>
public class PersonalizationService : IPersonalizationService
{
    private const int DefaultDailyMinutes = 30;
    private const int MinLeafAnswered = 3;
    private const int MinGroupAnswered = 5;
    private const double WeakPercent = 60;
    private const double StrongPercent = 80;
    private const int MinPracticeForEstimate = 20;
    private const double StepUpPercent = 75;
    private const int StepUpAnswered = 10;
    private const int MockTestGapDays = 14;
    private const int PlacementRetakeDays = 60;
    private const string Listening = "LISTENING";
    private const string Reading = "READING";

    private readonly ILearnerProfileRepository _profiles;
    private readonly IProgressRepository _progress;
    private readonly IAttemptRepository _attempts;
    private readonly IPlacementService _placement;
    private readonly IVocabLearningService _vocab;
    private readonly IDictationService _dictation;
    private readonly IExamContentRepository _content;
    private readonly IAccessService _access;
    private readonly IConfiguration _config;
    private readonly ILogger<PersonalizationService> _logger;

    public PersonalizationService(ILearnerProfileRepository profiles, IProgressRepository progress, IAttemptRepository attempts, IPlacementService placement,
        IVocabLearningService vocab, IDictationService dictation, IExamContentRepository content, IAccessService access, IConfiguration config,
        ILogger<PersonalizationService> logger)
    {
        _profiles = profiles;
        _progress = progress;
        _attempts = attempts;
        _placement = placement;
        _vocab = vocab;
        _dictation = dictation;
        _content = content;
        _access = access;
        _config = config;
        _logger = logger;
    }

    public async Task<LearnerProfileDto> GetProfileAsync(int userId) => ToDto(await _profiles.GetAsync(userId));

    public async Task<LearnerProfileDto> SaveProfileAsync(int userId, SaveLearnerProfileRequestDto dto) =>
        ToDto(await _profiles.SaveAsync(userId, dto.TargetScore, dto.ExamDate, dto.DailyMinutes));

    private LearnerProfileDto ToDto(LearnerProfile? profile)
    {
        var today = _config.StudyToday();
        return new LearnerProfileDto
        {
            IsSet = profile is not null, TargetScore = profile?.TargetScore, ExamDate = profile?.ExamDate,
            DaysToExam = profile?.ExamDate is { } date ? date.DayNumber - today.DayNumber : null,
            DailyMinutes = profile?.DailyMinutes ?? DefaultDailyMinutes, UpdatedAt = profile?.UpdatedAt
        };
    }

    public async Task<LearningPlanDto> GetPlanAsync(int userId)
    {
        var catalog = await _content.GetCatalogAsync();
        var profile = ToDto(await _profiles.GetAsync(userId));
        var placement = await _placement.GetStatusAsync(userId);
        var vip = await _access.HasVipAsync(userId);
        var rows = await _progress.GetLearnerQuestionsAsync(userId);
        var practiced = rows.Where(r => r.Practiced).ToList();

        var plan = new LearningPlanDto
        {
            Profile = profile, Placement = placement, GeneratedAt = DateTime.UtcNow, AnsweredQuestions = practiced.Count,
            Current = await EstimateAsync(userId, placement, practiced),
            Parts = PartInsights(catalog, rows)
        };
        plan.Skills = SkillInsights(catalog, plan.Current, profile, practiced);
        (plan.WeakTopics, plan.StrongTopics) = Topics(catalog, rows);
        plan.Recommendations = await RecommendAsync(userId, plan, catalog, rows.Where(r => vip || !r.VipOnly).ToList());
        plan.TodayMinutes = Schedule(plan.Recommendations, profile.DailyMinutes);
        return plan;
    }

    // ---------- Điểm hiện tại ----------

    private async Task<ScoreEstimateDto> EstimateAsync(int userId, PlacementStatusDto placement, List<LearnerQuestionRow> practiced)
    {
        var scored = await _profiles.GetScoredAttemptsAsync(userId, 30);
        // Kết quả kiểm tra đầu vào vẫn được dùng kể cả khi người học đã xóa lượt đó khỏi lịch sử.
        if (placement.LastResult is { SubmittedAt: { } at } last && scored.All(s => s.AttemptId != last.AttemptId))
            scored.Add(new ScoredAttemptRow(last.AttemptId, AttemptScope.Placement, at, (short?)last.ListeningScaled, (short?)last.ReadingScaled));
        scored = scored.OrderByDescending(s => s.SubmittedAt).ToList();

        var estimate = new ScoreEstimateDto();
        var listening = scored.FirstOrDefault(s => s.ListeningScaled is not null);
        var reading = scored.FirstOrDefault(s => s.ReadingScaled is not null);
        if (listening is not null) (estimate.ListeningScaled, estimate.ListeningSource) = (listening.ListeningScaled, SourceOf(listening.Scope));
        else (estimate.ListeningScaled, estimate.ListeningSource) = await FromPracticeAsync(Listening, practiced.Where(r => r.PartNo <= 4).ToList());
        if (reading is not null) (estimate.ReadingScaled, estimate.ReadingSource) = (reading.ReadingScaled, SourceOf(reading.Scope));
        else (estimate.ReadingScaled, estimate.ReadingSource) = await FromPracticeAsync(Reading, practiced.Where(r => r.PartNo > 4).ToList());
        if (estimate.ListeningScaled is { } l && estimate.ReadingScaled is { } r) estimate.TotalScaled = l + r;
        estimate.MeasuredAt = new[] { listening?.SubmittedAt, reading?.SubmittedAt }.Max();
        return estimate;
    }

    private static string SourceOf(string scope) => scope == AttemptScope.Placement ? "PLACEMENT" : "EXAM";

    private async Task<(int?, string?)> FromPracticeAsync(string skill, List<LearnerQuestionRow> rows)
    {
        if (rows.Count < MinPracticeForEstimate) return (null, null);
        var scaled = await _attempts.GetScaledScoreAsync(skill, ScoreBands.Per100(rows.Count(r => r.LastCorrect == true), rows.Count));
        return scaled is null ? (null, null) : (scaled, "PRACTICE");
    }

    // ---------- Phân tích ----------

    private static string SkillOf(byte partNo) => partNo <= 4 ? Listening : Reading;

    // Tên Part tiếng Việt cho tiêu đề gợi ý (PartSetting.PartName trong database là tiếng Anh; giao diện người học dùng tên tiếng Việt).
    private static string SkillPartName(byte partNo) => partNo switch
    {
        1 => "Mô tả tranh", 2 => "Hỏi – đáp", 3 => "Hội thoại", 4 => "Bài nói ngắn", 5 => "Điền câu", 6 => "Điền đoạn văn", _ => "Đọc hiểu"
    };

    private static double? Percent(int correct, int answered) => answered == 0 ? null : Math.Round(100.0 * correct / answered, 1);

    private static List<PartInsightDto> PartInsights(ExamCatalogDto catalog, List<LearnerQuestionRow> rows) =>
        Enumerable.Range(1, 7).Select(n => (byte)n).Select(partNo =>
        {
            var inPart = rows.Where(r => r.PartNo == partNo).ToList();
            var answered = inPart.Count(r => r.Practiced);
            var correct = inPart.Count(r => r.LastCorrect == true);
            var accuracy = Percent(correct, answered);
            return new PartInsightDto
            {
                PartNo = partNo, PartName = catalog.Parts.FirstOrDefault(p => p.PartNo == partNo)?.PartName ?? $"Part {partNo}", Skill = SkillOf(partNo),
                TotalQuestions = inPart.Count, Answered = answered, Correct = correct, AccuracyPercent = accuracy,
                Status = answered < MinLeafAnswered ? "UNTESTED" : accuracy < WeakPercent ? "WEAK" : accuracy < StrongPercent ? "FAIR" : "STRONG"
            };
        }).ToList();

    private static List<SkillInsightDto> SkillInsights(ExamCatalogDto catalog, ScoreEstimateDto current, LearnerProfileDto profile, List<LearnerQuestionRow> practiced)
    {
        var levels = catalog.Levels.OrderBy(l => l.LevelNo).Select(l => l.LevelNo).ToList();
        var skills = new[] { Listening, Reading }.Select(skill =>
        {
            var rows = practiced.Where(r => SkillOf(r.PartNo) == skill).ToList();
            var estimated = skill == Listening ? current.ListeningScaled : current.ReadingScaled;
            int? target = profile.TargetScore is { } t ? Math.Min(ScoreBands.SkillMax, ScoreBands.RoundUp5(t / 2.0)) : null;
            byte? level = estimated is { } e ? ScoreBands.LevelFor(e) : null;
            var correct = rows.Count(r => r.LastCorrect == true);
            return new SkillInsightDto
            {
                Skill = skill, Name = skill == Listening ? "Nghe" : "Đọc", EstimatedScaled = estimated,
                Source = skill == Listening ? current.ListeningSource : current.ReadingSource,
                TargetScaled = target, Gap = estimated is { } now && target is { } goal ? goal - now : null,
                Level = ScoreBands.Info(level, catalog.Levels), PracticeLevel = ScoreBands.Info(PracticeLevel(level, rows, levels), catalog.Levels),
                Answered = rows.Count, Correct = correct, AccuracyPercent = Percent(correct, rows.Count)
            };
        }).ToList();

        // Kỹ năng ưu tiên: thiếu nhiều điểm hơn so với mục tiêu; chưa có mục tiêu thì điểm thấp hơn; chưa có điểm thì độ chính xác thấp hơn.
        var focus = skills.All(s => s.Gap is not null) ? skills.OrderByDescending(s => s.Gap).First()
            : skills.All(s => s.EstimatedScaled is not null) ? skills.OrderBy(s => s.EstimatedScaled).First()
            : skills.Where(s => s.Answered >= MinGroupAnswered).OrderBy(s => s.AccuracyPercent).FirstOrDefault()
              ?? skills.FirstOrDefault(s => s.EstimatedScaled is null && s.Answered == 0);
        if (focus is not null) focus.IsFocus = true;
        return skills;
    }

    // Level nên luyện. Có điểm: Level của điểm, lên một Level khi đã vững Level đó. Chưa có điểm: Level thấp nhất chưa vững.
    private static byte? PracticeLevel(byte? level, List<LearnerQuestionRow> rows, List<byte> levels)
    {
        if (levels.Count == 0) return null;
        bool Mastered(byte lv)
        {
            var at = rows.Where(r => r.LevelNo == lv).ToList();
            return at.Count >= StepUpAnswered && 100.0 * at.Count(r => r.LastCorrect == true) / at.Count >= StepUpPercent;
        }
        if (level is { } current)
        {
            var next = levels.FirstOrDefault(l => l > current);
            return Mastered(current) && next != 0 ? next : current;
        }
        return levels.FirstOrDefault(l => !Mastered(l)) is var open && open != 0 ? open : levels[^1];
    }

    private static (List<TopicInsightDto> Weak, List<TopicInsightDto> Strong) Topics(ExamCatalogDto catalog, List<LearnerQuestionRow> rows)
    {
        var byId = catalog.Categories.ToDictionary(c => c.CategoryId);
        var children = CategoryTree.ChildrenOf(catalog.Categories);

        TopicInsightDto Topic(CategoryCatalogDto node, IEnumerable<LearnerQuestionRow> inside)
        {
            var list = inside.ToList();
            var answered = list.Count(r => r.Practiced);
            var correct = list.Count(r => r.LastCorrect == true);
            // Tên lá có thể trùng giữa các nhóm (Part 5: "Danh từ" ở Từ loại và Từ vựng) nên ghép tên nhóm cha.
            var name = node.ParentCategoryId is { } parentId && byId.TryGetValue(parentId, out var parent) ? $"{parent.NameVi} · {node.NameVi}" : node.NameVi;
            return new TopicInsightDto
            {
                PartNo = node.PartNo, CategoryId = node.CategoryId, CardKey = $"cat-{node.CategoryId}", Name = name, TotalQuestions = list.Count,
                Answered = answered, Correct = correct, Wrong = list.Count(r => r.LastCorrect == false), AccuracyPercent = Percent(correct, answered)
            };
        }

        var leaves = rows.GroupBy(r => r.CategoryId).Where(g => byId.ContainsKey(g.Key)).Select(g => Topic(byId[g.Key], g)).ToList();
        var weak = leaves.Where(t => t.Answered >= MinLeafAnswered && t.AccuracyPercent < WeakPercent).ToList();
        // Nhóm cha yếu khi từng lá còn ít câu đã làm: chỉ thêm nếu chưa có lá yếu nào thuộc nhóm đó.
        foreach (var root in catalog.Categories.Where(c => c.ParentCategoryId is null && children[c.CategoryId].Any()))
        {
            var subtree = CategoryTree.Subtree(root.CategoryId, children);
            if (weak.Any(w => subtree.Contains(w.CategoryId))) continue;
            var topic = Topic(root, rows.Where(r => subtree.Contains(r.CategoryId)));
            if (topic.Answered >= MinGroupAnswered && topic.AccuracyPercent < WeakPercent) weak.Add(topic);
        }
        return (weak.OrderBy(t => t.AccuracyPercent).ThenByDescending(t => t.Answered).Take(6).ToList(),
            leaves.Where(t => t.Answered >= MinGroupAnswered && t.AccuracyPercent >= StrongPercent)
                .OrderByDescending(t => t.AccuracyPercent).ThenByDescending(t => t.Answered).Take(4).ToList());
    }

    // ---------- Gợi ý ----------

    private async Task<List<RecommendationDto>> RecommendAsync(int userId, LearningPlanDto plan, ExamCatalogDto catalog, List<LearnerQuestionRow> usable)
    {
        var list = new List<RecommendationDto>();
        var batch = Math.Clamp(_config.GetValue<int?>("Learning:BankBatchQuestions") ?? 20, 5, 100);
        var children = CategoryTree.ChildrenOf(catalog.Categories);
        var focus = plan.Skills.FirstOrDefault(s => s.IsFocus);
        int SecondsPer(byte partNo) => catalog.Parts.FirstOrDefault(p => p.PartNo == partNo)?.DefaultSecondsPerQuestion ?? ExamTimeRules.DefaultSecondsPerQuestion(partNo);
        // Luyện tập có đọc giải thích sau mỗi câu: tính thêm 50% thời gian.
        int BankMinutes(byte partNo, int available) => Math.Max(5, (int)Math.Ceiling(Math.Min(batch, Math.Max(available, 1)) * SecondsPer(partNo) * 1.5 / 60));
        void Add(string kind, int priority, string title, string reason, int minutes, RecommendationActionDto action) =>
            list.Add(new RecommendationDto { Kind = kind, Priority = priority, Title = title, Reason = reason, EstimatedMinutes = minutes, Action = action });

        // 1. Kiểm tra đầu vào.
        var placement = plan.Placement;
        var placementMinutes = placement.Test is { } test ? (int)Math.Ceiling(test.TimeLimitSeconds / 60.0) : 30;
        if (placement.InProgressAttemptId is { } running)
            Add("PLACEMENT", 100, "Tiếp tục bài kiểm tra đầu vào", "Bạn đang làm dở bài kiểm tra đầu vào. Hoàn thành để nhận lộ trình theo đúng trình độ.",
                placementMinutes, new() { Type = "PLACEMENT", AttemptId = running });
        else if (placement.Available && placement.LastResult is null)
            Add("PLACEMENT", 100, "Làm bài kiểm tra đầu vào",
                $"{placement.Test!.TotalQuestions} câu trong {placementMinutes} phút. Kết quả xác định Level từng kỹ năng để gợi ý bài học vừa sức.",
                placementMinutes, new() { Type = "PLACEMENT" });
        else if (placement.Available && placement.LastResult?.SubmittedAt is { } takenAt && (DateTime.UtcNow - takenAt).TotalDays > PlacementRetakeDays)
            Add("PLACEMENT", 20, "Kiểm tra lại trình độ", $"Lần kiểm tra đầu vào gần nhất cách đây {(int)(DateTime.UtcNow - takenAt).TotalDays} ngày.",
                placementMinutes, new() { Type = "PLACEMENT" });

        // 2. Mục tiêu.
        if (!plan.Profile.IsSet || plan.Profile.TargetScore is null)
            Add("PROFILE", 95, "Đặt mục tiêu điểm TOEIC", "Điểm mục tiêu và ngày thi giúp lộ trình ưu tiên đúng kỹ năng còn thiếu và tính kế hoạch mỗi ngày.",
                1, new() { Type = "PROFILE" });

        // 3. Từ vựng: ôn từ đến hạn trước (lặp lại ngắt quãng), rồi từ mới theo hạn mức mỗi ngày.
        var vocab = await OptionalAsync(() => _vocab.GetOverviewAsync(userId));
        if (vocab is { DueNow: > 0 })
        {
            var count = Math.Min(vocab.DueNow, 20);
            Add("VOCAB_REVIEW", 85, $"Ôn {vocab.DueNow} từ đến hạn", "Ôn đúng lúc sắp quên giúp nhớ lâu; mỗi phiên tối đa 20 từ.",
                Math.Max(3, (int)Math.Ceiling(count * 0.6)), new() { Type = "VOCAB", VocabMode = "REVIEW", Count = count });
        }

        // 4. Chủ điểm yếu: làm lại câu sai khi đã sai nhiều, nếu không thì luyện câu mới cùng chủ điểm.
        var weakIndex = 0;
        foreach (var topic in plan.WeakTopics)
        {
            if (weakIndex >= 3) break;
            var subtree = CategoryTree.Subtree(topic.CategoryId, children);
            var available = usable.Count(r => r.PartNo == topic.PartNo && subtree.Contains(r.CategoryId));
            if (available == 0) continue;
            var pick = topic.Wrong >= 3 ? "WRONG" : "NEW";
            var boost = focus?.Skill == SkillOf(topic.PartNo) ? 3 : 0;
            Add("WEAK_TOPIC", 80 - weakIndex * 2 + boost, $"Củng cố Part {topic.PartNo}: {topic.Name}",
                $"Bạn đúng {topic.Correct}/{topic.Answered} câu ({topic.AccuracyPercent:0.#}%) ở chủ điểm này. " +
                (pick == "WRONG" ? "Làm lại các câu đã sai để sửa lỗi." : "Luyện thêm câu mới cùng chủ điểm."),
                BankMinutes(topic.PartNo, pick == "WRONG" ? topic.Wrong : available), new() { Type = "BANK", PartNo = topic.PartNo, CardKey = topic.CardKey, Pick = pick });
            weakIndex++;
        }

        // 5. Luyện theo Level vừa sức ở Part yếu nhất của từng kỹ năng (kỹ năng ưu tiên đứng trước).
        var usedParts = new HashSet<byte>();
        foreach (var skill in plan.Skills.OrderByDescending(s => s.IsFocus))
        {
            var parts = plan.Parts.Where(p => p.Skill == skill.Skill && usable.Any(r => r.PartNo == p.PartNo)).ToList();
            var part = parts.Where(p => p.Status != "UNTESTED").OrderBy(p => p.AccuracyPercent).FirstOrDefault()
                       ?? parts.OrderByDescending(p => usable.Count(r => r.PartNo == p.PartNo)).FirstOrDefault();
            if (part is null) continue;
            usedParts.Add(part.PartNo);
            var inPart = usable.Where(r => r.PartNo == part.PartNo).ToList();
            // Part không có câu ở Level nên luyện (ví dụ Part 7 không có Level 1): dùng Level gần nhất có câu, ưu tiên Level cao hơn.
            var level = skill.PracticeLevel;
            if (level is { } wanted && inPart.All(r => r.LevelNo != wanted.LevelNo))
            {
                var nearest = inPart.Where(r => r.LevelNo is not null).Select(r => r.LevelNo!.Value).Distinct()
                    .OrderBy(l => Math.Abs(l - wanted.LevelNo)).ThenByDescending(l => l).Cast<byte?>().FirstOrDefault();
                level = ScoreBands.Info(nearest, catalog.Levels) ?? level;
            }
            var atLevel = level is null ? [] : inPart.Where(r => r.LevelNo == level.LevelNo).ToList();
            var fresh = atLevel.Count(r => !r.Practiced);
            var action = atLevel.Count == 0
                ? new RecommendationActionDto { Type = "BANK", PartNo = part.PartNo, CardKey = "all", Pick = "NEW" }
                : new RecommendationActionDto { Type = "BANK", PartNo = part.PartNo, CardKey = $"level-{level!.LevelNo}", Pick = fresh > 0 ? "NEW" : "ALL" };
            var title = atLevel.Count == 0 ? $"Luyện Part {part.PartNo} – {SkillPartName(part.PartNo)}" : $"Luyện Part {part.PartNo} – {level!.Name}";
            var reason = skill.EstimatedScaled is { } score
                ? $"{skill.Name} ước tính {score} điểm{(skill.Level is { } lv ? $" ({lv.ShortLabel})" : string.Empty)}; luyện đúng Level để tiến bộ chắc."
                : part.AccuracyPercent is { } accuracy ? $"Part {part.PartNo} đang đúng {accuracy:0.#}%, thấp nhất trong phần {skill.Name}." : $"Bắt đầu phần {skill.Name} từ Level vừa sức.";
            if (skill.Gap is > 0) reason += $" Còn thiếu {skill.Gap} điểm {skill.Name} so với mục tiêu.";
            Add("LEVEL_PRACTICE", skill.IsFocus ? 70 : 58, title, reason, BankMinutes(part.PartNo, Math.Max(fresh, atLevel.Count)), action);
        }

        // 6. Nghe chép: luyện lại bộ clip chưa đạt, nếu không có thì bộ mới ở Level nên luyện của kỹ năng Nghe.
        var listening = plan.Skills.First(s => s.Skill == Listening);
        var needs = await OptionalAsync(() => _dictation.GetItemsAsync(userId, new DictationItemListRequestDto { Status = "NEEDS_PRACTICE", PageSize = 1 }));
        var listeningPriority = listening.IsFocus || listening.AccuracyPercent < 70 ? 66 : 40;
        if (needs is { TotalCount: > 0 })
            Add("DICTATION", listeningPriority, $"Nghe chép lại {needs.TotalCount} bộ clip cần luyện",
                "Các bộ clip này lần gần nhất chưa đạt độ chính xác yêu cầu; nghe lại giúp bắt âm nối và từ khóa.",
                Math.Min(15, 5 * needs.TotalCount), new() { Type = "DICTATION", DictationStatus = "NEEDS_PRACTICE" });
        else if (listening.IsFocus && listening.PracticeLevel is { } dictationLevel)
        {
            var fresh = await OptionalAsync(() => _dictation.GetItemsAsync(userId, new DictationItemListRequestDto { Status = "NEW", LevelNo = dictationLevel.LevelNo, PageSize = 1 }));
            if (fresh is { TotalCount: > 0 })
                Add("DICTATION", 62, $"Nghe chép – {dictationLevel.Name}", $"Có {fresh.TotalCount} bộ clip chưa luyện ở Level vừa sức. Nghe chép rèn khả năng nghe chi tiết cho Part 1–4.",
                    10, new() { Type = "DICTATION", DictationStatus = "NEW", LevelNo = dictationLevel.LevelNo });
        }

        // 7. Part chưa luyện: làm một lượt để hệ thống đánh giá.
        foreach (var part in plan.Parts.Where(p => p.Status == "UNTESTED" && !usedParts.Contains(p.PartNo) && usable.Any(r => r.PartNo == p.PartNo)).Take(2))
            Add("NEW_PART", 52, $"Làm quen Part {part.PartNo} – {SkillPartName(part.PartNo)}",
                "Bạn chưa luyện đủ câu ở Part này; làm một lượt để lộ trình đánh giá chính xác hơn.",
                BankMinutes(part.PartNo, usable.Count(r => r.PartNo == part.PartNo)), new() { Type = "BANK", PartNo = part.PartNo, CardKey = "all", Pick = "NEW" });

        // 8. Từ mới theo hạn mức mỗi ngày.
        if (vocab is { NewWords: > 0 } && vocab.NewToday < vocab.NewPerDay)
        {
            var count = Math.Min(Math.Min(vocab.NewPerDay - vocab.NewToday, vocab.NewWords), 20);
            Add("VOCAB_NEW", 50, $"Học {count} từ mới", $"Mục tiêu {vocab.NewPerDay} từ mới mỗi ngày, hôm nay đã học {vocab.NewToday} từ.",
                Math.Max(3, (int)Math.Ceiling(count * 0.8)), new() { Type = "VOCAB", VocabMode = "NEW", Count = count });
        }

        // 9. Thi thử định kỳ để đo điểm thật (gấp hơn khi sắp tới ngày thi).
        var lastMock = await _profiles.GetLastMockTestAtAsync(userId);
        var daysToExam = plan.Profile.DaysToExam;
        var stale = lastMock is null || (DateTime.UtcNow - lastMock.Value).TotalDays > MockTestGapDays;
        if (stale && (plan.AnsweredQuestions >= 60 || daysToExam is >= 0 and <= 30))
        {
            var reason = lastMock is null ? "Bạn chưa làm đề thi thử nào; làm trọn đề để đo điểm thật."
                : $"Lần thi thử gần nhất cách đây {(int)(DateTime.UtcNow - lastMock.Value).TotalDays} ngày.";
            if (daysToExam is >= 0) reason += $" Còn {daysToExam} ngày đến kỳ thi.";
            Add("MOCK_TEST", daysToExam is >= 0 and <= MockTestGapDays ? 90 : 45, "Làm một đề thi thử", reason, 120, new() { Type = "EXAM" });
        }

        var ordered = list.OrderByDescending(r => r.Priority).ToList();
        for (var i = 0; i < ordered.Count; i++) ordered[i].Key = $"{ordered[i].Kind.ToLowerInvariant()}-{i + 1}";
        return ordered;
    }

    // Kế hoạch hôm nay: theo độ ưu tiên, cộng dồn tới số phút mỗi ngày (luôn có ít nhất một bài; đặt mục tiêu không tính thời gian).
    private static int Schedule(List<RecommendationDto> recommendations, int dailyMinutes)
    {
        var used = 0;
        foreach (var item in recommendations)
        {
            if (item.Kind == "PROFILE") { item.IsToday = true; continue; }
            if (used > 0 && used + item.EstimatedMinutes > dailyMinutes) continue;
            item.IsToday = true;
            used += item.EstimatedMinutes;
        }
        return used;
    }

    // Nguồn phụ (từ vựng, nghe chép) lỗi do thiếu bảng/cột thì bỏ qua gợi ý đó thay vì làm hỏng cả lộ trình.
    private async Task<T?> OptionalAsync<T>(Func<Task<T>> load) where T : class
    {
        try { return await load(); }
        catch (SqlException ex) when (ex.Number is 207 or 208)
        {
            _logger.LogWarning(ex, "Bỏ qua một nguồn gợi ý vì database thiếu bảng/cột");
            return null;
        }
    }
}
