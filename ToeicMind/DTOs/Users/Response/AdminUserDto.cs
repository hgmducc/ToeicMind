namespace ToeicMind.DTOs.Users.Response;

/// <summary>Thông tin người dùng cho trang quản trị: ngoài UserDto còn có liên kết Google, lần cập nhật và số phiên đăng nhập còn hiệu lực.</summary>
public class AdminUserDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;    // ADMIN hoặc LEARNER
    public string Status { get; set; } = string.Empty;  // ACTIVE hoặc LOCKED
    public bool HasPassword { get; set; }
    public bool HasGoogle { get; set; }
    public bool IsVip { get; set; }
    public DateTime? VipExpiresAt { get; set; }
    public int ActiveSessionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
