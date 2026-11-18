namespace ToeicMind.Services.Auth;

/// <summary>Chuyển entity người dùng sang UserDto (không lộ mật khẩu).</summary>
public static class UserMapper
{
    public static UserDto ToDto(Users user) => new()
    {
        UserId = user.UserId,
        Username = user.Username,
        Email = user.Email,
        Role = user.Role.ToString(),
        Status = user.Status,
        HasPassword = !string.IsNullOrEmpty(user.PasswordHash),
        IsVip = user.Role == UserRole.ADMIN || user.VipExpiresAt > DateTime.UtcNow,
        VipExpiresAt = user.VipExpiresAt is { } vip ? DateTime.SpecifyKind(vip, DateTimeKind.Utc) : null,
        CreatedAt = DateTime.SpecifyKind(user.CreatedAt, DateTimeKind.Utc)
    };
}
