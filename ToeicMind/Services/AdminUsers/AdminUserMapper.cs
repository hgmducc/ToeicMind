using ToeicMind.DTOs.Users.Response;
using ToeicMind.Repositories.AdminUsers;

namespace ToeicMind.Services.AdminUsers;

/// <summary>Chuyển người dùng (kèm số phiên) sang AdminUserDto; không lộ mật khẩu băm.</summary>
public static class AdminUserMapper
{
    public static AdminUserDto ToDto(UserWithSessions row) => new()
    {
        UserId = row.User.UserId,
        Username = row.User.Username,
        Email = row.User.Email,
        Role = row.User.Role.ToString(),
        Status = row.User.Status,
        HasPassword = !string.IsNullOrEmpty(row.User.PasswordHash),
        HasGoogle = !string.IsNullOrEmpty(row.User.GoogleId),
        IsVip = row.User.Role == UserRole.ADMIN || row.User.VipExpiresAt > DateTime.UtcNow,
        VipExpiresAt = row.User.VipExpiresAt is { } vip ? DateTime.SpecifyKind(vip, DateTimeKind.Utc) : null,
        ActiveSessionCount = row.ActiveSessionCount,
        CreatedAt = DateTime.SpecifyKind(row.User.CreatedAt, DateTimeKind.Utc),
        UpdatedAt = DateTime.SpecifyKind(row.User.UpdatedAt, DateTimeKind.Utc)
    };
}
