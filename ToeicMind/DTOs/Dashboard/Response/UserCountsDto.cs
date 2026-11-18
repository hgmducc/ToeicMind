namespace ToeicMind.DTOs.Dashboard.Response;

/// <summary>Số liệu người dùng.</summary>
public class UserCountsDto
{
    public int Total { get; set; }
    public int Learners { get; set; }
    public int Admins { get; set; }
    public int Locked { get; set; }
    public int NewLast7Days { get; set; }
    public int NewLast30Days { get; set; }
}
