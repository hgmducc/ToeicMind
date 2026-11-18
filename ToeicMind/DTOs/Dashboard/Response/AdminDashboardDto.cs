namespace ToeicMind.DTOs.Dashboard.Response;

/// <summary>Toàn bộ số liệu của trang tổng quan Admin trong một phản hồi: tổng quan, hoạt động theo ngày, đề được làm nhiều, câu hỏi khó.</summary>
public class AdminDashboardDto
{
    public DashboardSummaryDto Summary { get; set; } = new();
    public List<ActivityPointDto> Activity { get; set; } = [];
    public List<ExamStatDto> PopularExams { get; set; } = [];
    public List<QuestionStatDto> HardestQuestions { get; set; } = [];
}
