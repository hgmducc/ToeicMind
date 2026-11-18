using ToeicMind.DTOs.Users.Request;
using ToeicMind.DTOs.Users.Response;

namespace ToeicMind.Services.AdminUsers;

/// <summary>Nghiệp vụ quản lý người dùng của ADMIN. Lỗi trả về dưới dạng mã (USER_NOT_FOUND, EMAIL_EXISTS, CANNOT_MODIFY_SELF, LAST_ADMIN, PASSWORD_TOO_LONG).</summary>
public interface IAdminUserService
{
    Task<UserPageDto> ListAsync(AdminUserListRequestDto query);
    Task<AdminUserDto?> GetAsync(int userId);
    Task<UserSummaryDto> GetSummaryAsync();
    Task<(AdminUserDto? User, string? Error)> CreateAsync(CreateUserRequestDto dto);
    // actorId là ADMIN đang thao tác; không được tự đổi vai trò hoặc tự khóa chính mình.
    Task<(AdminUserDto? User, string? Error)> ChangeRoleAsync(int actorId, int userId, ChangeUserRoleRequestDto dto);
    // Status ACTIVE hoặc LOCKED (khóa thu hồi luôn các phiên đăng nhập).
    Task<(AdminUserDto? User, string? Error)> ChangeStatusAsync(int actorId, int userId, ChangeUserStatusRequestDto dto);

    // Thu hồi mọi refresh token để người dùng phải đăng nhập lại.
    Task<string?> RevokeSessionsAsync(int userId);
}
