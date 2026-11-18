namespace ToeicMind.DTOs.Users;

public class UserDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;   // ADMIN hoặc LEARNER
    public string Status { get; set; } = string.Empty;
    public bool HasPassword { get; set; }
    /// <summary>VIP còn hạn (ADMIN luôn true). Giá trị tại thời điểm trả về; làm mới bằng GET /api/vip/me.</summary>
    public bool IsVip { get; set; }
    public DateTime? VipExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
