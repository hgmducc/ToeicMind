namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Mục tiêu học của người học. IsSet = false khi chưa lưu lần nào (các trường null, DailyMinutes là giá trị mặc định dùng để lập kế hoạch).
/// DaysToExam tính theo ngày học (Learning:UtcOffsetHours); null khi chưa có ngày thi.
/// </summary>
public class LearnerProfileDto
{
    public bool IsSet { get; set; }
    public int? TargetScore { get; set; }
    public DateOnly? ExamDate { get; set; }
    public int? DaysToExam { get; set; }
    public int DailyMinutes { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
