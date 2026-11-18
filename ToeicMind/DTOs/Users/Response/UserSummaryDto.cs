namespace ToeicMind.DTOs.Users.Response;

/// <summary>Số liệu tổng quan người dùng cho đầu trang quản trị.</summary>
public class UserSummaryDto
{
    public int Total { get; set; }
    public int Admins { get; set; }
    public int Learners { get; set; }
    public int Locked { get; set; }
}
