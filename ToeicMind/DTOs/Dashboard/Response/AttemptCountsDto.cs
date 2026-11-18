namespace ToeicMind.DTOs.Dashboard.Response;

/// <summary>Số liệu lượt làm bài.</summary>
public class AttemptCountsDto
{
    public int Total { get; set; }
    public int Submitted { get; set; }
    public int InProgress { get; set; }
    public int Abandoned { get; set; }
    public int Last7Days { get; set; }
    public int Last30Days { get; set; }
}
