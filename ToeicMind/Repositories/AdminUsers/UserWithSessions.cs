namespace ToeicMind.Repositories.AdminUsers;

/// <summary>Người dùng kèm số refresh token còn hiệu lực (số phiên đăng nhập đang mở).</summary>
public record UserWithSessions(Users User, int ActiveSessionCount);
