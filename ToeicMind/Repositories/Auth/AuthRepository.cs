using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;

namespace ToeicMind.Repositories.Auth;

/// <summary>Truy vấn dữ liệu xác thực: người dùng, refresh token, mã OTP đặt lại mật khẩu.</summary>
public class AuthRepository : IAuthRepository
{
    private readonly AppDbContext _db;
    public AuthRepository(AppDbContext db) => _db = db;

    public Task<Users?> GetByEmailAsync(string email) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);

    public Task<Users?> GetByIdAsync(int userId) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);

    public Task<bool> ExistsByEmailAsync(string email) =>
        _db.Users.AnyAsync(u => u.Email == email);

    public async Task<Users?> CreateUserAsync(Users user)
    {
        _db.Users.Add(user);
        try
        {
            await _db.SaveChangesAsync();
            return user;
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            // UNIQUE là chốt cuối khi hai request cùng đăng ký một email.
            _db.Entry(user).State = EntityState.Detached;
            return null;
        }
    }

    public Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash) =>
        _db.RefreshTokens.AsNoTracking().FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);

    public Task AddRefreshTokenAsync(RefreshToken token)
    {
        _db.RefreshTokens.Add(token);
        return _db.SaveChangesAsync();
    }

    public Task RevokeRefreshTokenAsync(long refreshTokenId)
    {
        var revokedAt = DateTime.UtcNow;
        return _db.RefreshTokens
            .Where(t => t.RefreshTokenId == refreshTokenId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, revokedAt));
    }

    public async Task<bool> RotateRefreshTokenAsync(long refreshTokenId, RefreshToken replacement)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        var revokedAt = DateTime.UtcNow;
        var updated = await _db.RefreshTokens
            .Where(t => t.RefreshTokenId == refreshTokenId &&
                        t.UserId == replacement.UserId &&
                        t.RevokedAt == null && t.ExpiresAt > revokedAt)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, revokedAt));

        if (updated == 0) return false;

        _db.RefreshTokens.Add(replacement);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        return true;
    }

    public Task RevokeAllUserRefreshTokensAsync(int userId)
    {
        var revokedAt = DateTime.UtcNow;

        return _db.RefreshTokens
            .Where(rt => rt.UserId == userId &&
                         rt.RevokedAt == null &&
                         rt.ExpiresAt > revokedAt)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(rt => rt.RevokedAt, revokedAt));
    }

    public Task<int> UpdateUsernameAsync(int userId, string username)
    {
        var now = DateTime.UtcNow;
        return _db.Users
            .Where(u => u.UserId == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Username, username)
                .SetProperty(u => u.UpdatedAt, now));
    }

    public Task<int> UpdatePasswordAsync(int userId, string newPasswordHash)
    {
        var now = DateTime.UtcNow;
        return _db.Users
            .Where(u => u.UserId == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.PasswordHash, newPasswordHash)
                .SetProperty(u => u.UpdatedAt, now));
    }

    public Task<Users?> GetByGoogleIdAsync(string googleId) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.GoogleId == googleId);

    public Task<int> LinkGoogleIdAsync(int userId, string googleId)
    {
        var now = DateTime.UtcNow;
        return _db.Users
            .Where(u => u.UserId == userId && u.GoogleId == null && u.Status == UserStatus.Active)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.GoogleId, googleId)
                .SetProperty(u => u.UpdatedAt, now));
    }

    public Task CreatePasswordResetOtpAsync(PasswordResetOtp otp)
    {
        _db.PasswordResetOtps.Add(otp);
        return _db.SaveChangesAsync();
    }

    public Task<PasswordResetOtp?> GetActiveOtpAsync(string email)
    {
        var now = DateTime.UtcNow;
        return _db.PasswordResetOtps
            .Where(o => o.Email == email && !o.IsUsed && o.ExpiresAt > now)
            .OrderByDescending(o => o.OtpId)
            .FirstOrDefaultAsync();
    }

    public Task IncrementOtpAttemptsAsync(long otpId) =>
        _db.PasswordResetOtps
            .Where(o => o.OtpId == otpId)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.AttemptsCount, o => o.AttemptsCount + 1));

    public Task MarkOtpUsedAsync(long otpId) =>
        _db.PasswordResetOtps
            .Where(o => o.OtpId == otpId)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.IsUsed, true));

    public Task<DateTime?> GetLastOtpCreationTimeAsync(string email) =>
        _db.PasswordResetOtps
            .Where(o => o.Email == email)
            .OrderByDescending(o => o.OtpId)
            .Select(o => (DateTime?)o.CreatedAt)
            .FirstOrDefaultAsync();
}
