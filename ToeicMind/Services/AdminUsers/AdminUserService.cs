using System.Text;
using ToeicMind.DTOs.Users.Request;
using ToeicMind.DTOs.Users.Response;
using ToeicMind.Repositories.Auth;
using ToeicMind.Repositories.AdminUsers;

namespace ToeicMind.Services.AdminUsers;

public class AdminUserService : IAdminUserService
{
    // BCrypt chỉ băm 72 byte đầu nên chặn mật khẩu dài hơn (giống AuthService).
    private const int MaxPasswordBytes = 72;

    private readonly IAdminUserRepository _repo;
    private readonly IAuthRepository _auth;

    public AdminUserService(IAdminUserRepository repo, IAuthRepository auth)
    {
        _repo = repo;
        _auth = auth;
    }

    public async Task<UserPageDto> ListAsync(AdminUserListRequestDto query)
    {
        UserRole? role = query.Role is null ? null : Enum.Parse<UserRole>(query.Role);
        var (items, total) = await _repo.ListAsync(query.Search, role, query.Status, query.Page, query.PageSize);
        return new UserPageDto
        {
            Items = items.Select(AdminUserMapper.ToDto).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<AdminUserDto?> GetAsync(int userId)
    {
        var row = await _repo.GetAsync(userId);
        return row is null ? null : AdminUserMapper.ToDto(row);
    }

    public async Task<UserSummaryDto> GetSummaryAsync()
    {
        var (total, admins, learners, locked) = await _repo.CountAsync();
        return new UserSummaryDto { Total = total, Admins = admins, Learners = learners, Locked = locked };
    }

    public async Task<(AdminUserDto? User, string? Error)> CreateAsync(CreateUserRequestDto dto)
    {
        if (IsTooLong(dto.Password)) return (null, "PASSWORD_TOO_LONG");

        var email = dto.Email.Trim().ToLowerInvariant();
        if (await _auth.ExistsByEmailAsync(email)) return (null, "EMAIL_EXISTS");

        var created = await _auth.CreateUserAsync(new Users
        {
            Username = dto.Username.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = Enum.Parse<UserRole>(dto.Role),
            Status = UserStatus.Active
        });
        return created is null ? (null, "EMAIL_EXISTS") : await LoadAsync(created.UserId);
    }

    public async Task<(AdminUserDto? User, string? Error)> ChangeRoleAsync(int actorId, int userId, ChangeUserRoleRequestDto dto)
    {
        if (actorId == userId) return (null, "CANNOT_MODIFY_SELF");
        if (await _auth.GetByIdAsync(userId) is null) return (null, "USER_NOT_FOUND");

        // 0 dòng được cập nhật khi thao tác sẽ làm hệ thống hết ADMIN đang hoạt động.
        if (await _repo.SetRoleAsync(userId, Enum.Parse<UserRole>(dto.Role)) == 0) return (null, "LAST_ADMIN");

        // Token cũ mang vai trò cũ nên bị từ chối khi xác thực; thu hồi refresh token để phiên cũ không tự làm mới.
        await _auth.RevokeAllUserRefreshTokensAsync(userId);
        return await LoadAsync(userId);
    }

    public async Task<(AdminUserDto? User, string? Error)> ChangeStatusAsync(int actorId, int userId, ChangeUserStatusRequestDto dto)
    {
        if (actorId == userId) return (null, "CANNOT_MODIFY_SELF");
        if (await _auth.GetByIdAsync(userId) is null) return (null, "USER_NOT_FOUND");

        if (await _repo.SetStatusAsync(userId, dto.Status) == 0) return (null, "LAST_ADMIN");

        // Access token của người bị khóa bị từ chối ngay (Program.cs kiểm tra Status mỗi request); thu hồi thêm refresh token.
        if (dto.Status == UserStatus.Locked) await _auth.RevokeAllUserRefreshTokensAsync(userId);
        return await LoadAsync(userId);
    }

    public async Task<string?> RevokeSessionsAsync(int userId)
    {
        if (await _auth.GetByIdAsync(userId) is null) return "USER_NOT_FOUND";
        await _auth.RevokeAllUserRefreshTokensAsync(userId);
        return null;
    }

    private async Task<(AdminUserDto? User, string? Error)> LoadAsync(int userId)
    {
        var row = await _repo.GetAsync(userId);
        return row is null ? (null, "USER_NOT_FOUND") : (AdminUserMapper.ToDto(row), null);
    }

    private static bool IsTooLong(string password) => Encoding.UTF8.GetByteCount(password) > MaxPasswordBytes;
}
