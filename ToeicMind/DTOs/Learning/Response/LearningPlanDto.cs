namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Lộ trình cá nhân của người học (CHG-007) trong một phản hồi: mục tiêu, trạng thái kiểm tra đầu vào, điểm ước tính, phân tích kỹ năng/Part/chủ điểm yếu
/// và danh sách bài học gợi ý (kế hoạch hôm nay đánh dấu IsToday, tổng TodayMinutes).
/// </summary>
public class LearningPlanDto
{
    public LearnerProfileDto Profile { get; set; } = new();
    public PlacementStatusDto Placement { get; set; } = new();
    public ScoreEstimateDto Current { get; set; } = new();
    public List<SkillInsightDto> Skills { get; set; } = [];
    public List<PartInsightDto> Parts { get; set; } = [];
    public List<TopicInsightDto> WeakTopics { get; set; } = [];
    public List<TopicInsightDto> StrongTopics { get; set; } = [];
    public List<RecommendationDto> Recommendations { get; set; } = [];
    public int TodayMinutes { get; set; }
    public int AnsweredQuestions { get; set; }
    public DateTime GeneratedAt { get; set; }
}
