using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;

namespace ToeicMind.Repositories.AdminUsers;

public class AdminUserRepository : IAdminUserRepository
{
    private readonly AppDbContext _db;
    public AdminUserRepository(AppDbContext db) => _db = db;

    public async Task<(List<UserWithSessions> Items, int TotalCount)> ListAsync(
        string? search, UserRole? role, string? status, int page, int pageSize)
    {
        var query = _db.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(u => u.Username.Contains(keyword) || u.Email.Contains(keyword));
        }
        if (role is not null) query = query.Where(u => u.Role == role.Value);
        if (status is not null) query = query.Where(u => u.Status == status);

        var total = await query.CountAsync();
        var now = DateTime.UtcNow;
        var items = await query
            .OrderByDescending(u => u.UserId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserWithSessions(u, _db.RefreshTokens.Count(t =>
                t.UserId == u.UserId && t.RevokedAt == null && t.ExpiresAt > now)))
            .ToListAsync();
        return (items, total);
    }

    public Task<UserWithSessions?> GetAsync(int userId)
    {
        var now = DateTime.UtcNow;
        return _db.Users.AsNoTracking()
            .Where(u => u.UserId == userId)
            .Select(u => new UserWithSessions(u, _db.RefreshTokens.Count(t =>
                t.UserId == u.UserId && t.RevokedAt == null && t.ExpiresAt > now)))
            .FirstOrDefaultAsync();
    }

    public async Task<(int Total, int Admins, int Learners, int Locked)> CountAsync() => (
        await _db.Users.CountAsync(),
        await _db.Users.CountAsync(u => u.Role == UserRole.ADMIN),
        await _db.Users.CountAsync(u => u.Role == UserRole.LEARNER),
        await _db.Users.CountAsync(u => u.Status == UserStatus.Locked));

    public Task<int> SetRoleAsync(int userId, UserRole role)
    {
        var now = DateTime.UtcNow;
        // Hạ quyền một ADMIN đang hoạt động chỉ được thực hiện khi còn ADMIN đang hoạt động khác;
        // điều kiện EXISTS nằm ngay trong câu UPDATE (không kiểm tra rồi mới ghi ở hai bước).
        var demoting = role != UserRole.ADMIN;
        return _db.Users
            .Where(u => u.UserId == userId &&
                        (!demoting || u.Role != UserRole.ADMIN || u.Status != UserStatus.Active || _db.Users.Any(a => a.UserId != userId && a.Role == UserRole.ADMIN && a.Status == UserStatus.Active)))
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Role, role)
                .SetProperty(u => u.UpdatedAt, now));
    }

    public Task<int> SetStatusAsync(int userId, string status)
    {
        var now = DateTime.UtcNow;
        var locking = status != UserStatus.Active;
        return _db.Users
            .Where(u => u.UserId == userId &&
                        (!locking || u.Role != UserRole.ADMIN || u.Status != UserStatus.Active || _db.Users.Any(a => a.UserId != userId && a.Role == UserRole.ADMIN && a.Status == UserStatus.Active)))
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Status, status)
                .SetProperty(u => u.UpdatedAt, now));
    }

}
