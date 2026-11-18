namespace ToeicMind.DTOs.Dashboard.Response;

/// <summary>Tổng quan cho trang thống kê của Admin.</summary>
public class DashboardSummaryDto
{
    public UserCountsDto Users { get; set; } = new();
    public ExamCountsDto Exams { get; set; } = new();
    public AttemptCountsDto Attempts { get; set; } = new();
    public int ActiveLearnersLast7Days { get; set; }
    public double? AverageTotalScaled { get; set; }
    public double? AverageAccuracyPercent { get; set; }
    public int NewReports { get; set; }
}
