using System.Security.Cryptography;
using System.Text;
using ToeicMind.Repositories.Auth;
using ToeicMind.Services.Email;

namespace ToeicMind.Services.Auth;

/// <summary>Nghiệp vụ xác thực. Trả về cặp (kết quả, mã lỗi); controller đổi mã lỗi thành thông báo và HTTP status.</summary>
public class AuthService : IAuthService
{
    // BCrypt chỉ băm tối đa 72 byte đầu của mật khẩu nên phải chặn mật khẩu dài hơn.
    private const int MaxPasswordBytes = 72;
    private const int OtpCooldownSeconds = 60;
    private const int MaxOtpAttempts = 5;

    private readonly IAuthRepository _repo;
    private readonly IJwtService _jwt;
    private readonly IEmailService _email;
    private readonly IGoogleAuthService _googleAuth;
    private readonly IConfiguration _config;

    public AuthService(
        IAuthRepository repo,
        IJwtService jwt,
        IEmailService email,
        IGoogleAuthService googleAuth,
        IConfiguration config)
    {
        _repo = repo;
        _jwt = jwt;
        _email = email;
        _googleAuth = googleAuth;
        _config = config;
    }

    public async Task<(UserDto? User, string? Error)> RegisterAsync(RegisterRequestDto dto)
    {
        if (CheckNewPassword(dto.Password, dto.ConfirmPassword) is { } invalid) return (null, invalid);

        var email = dto.Email.Trim().ToLowerInvariant();
        if (await _repo.ExistsByEmailAsync(email)) return (null, "EMAIL_EXISTS");

        var user = new Users
        {
            Username = dto.Username.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = UserRole.LEARNER,
            Status = UserStatus.Active
        };

        var created = await _repo.CreateUserAsync(user);
        return created is null ? (null, "EMAIL_EXISTS") : (UserMapper.ToDto(created), null);
    }

    public async Task<(AuthResponseDto? Response, string? Error)> LoginAsync(LoginRequestDto dto)
    {
        if (IsTooLong(dto.Password)) return (null, "INVALID_CREDENTIALS");

        var user = await _repo.GetByEmailAsync(dto.Email.Trim().ToLowerInvariant());
        if (user is null) return (null, "INVALID_CREDENTIALS");
        if (user.Status != UserStatus.Active) return (null, "ACCOUNT_LOCKED");

        // Tài khoản tạo từ Google chưa thiết lập mật khẩu
        if (string.IsNullOrEmpty(user.PasswordHash))
            return (null, "NO_PASSWORD_SET");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return (null, "INVALID_CREDENTIALS");

        var (response, token) = CreateAuthResponse(user);
        await _repo.AddRefreshTokenAsync(token);
        return (response, null);
    }

    public async Task<AuthResponseDto?> RefreshAsync(string refreshToken)
    {
        var stored = await _repo.GetRefreshTokenByHashAsync(_jwt.HashToken(refreshToken));
        if (stored is null) return null;

        // Token đã dùng lại: thu hồi các refresh token còn hiệu lực của người dùng.
        if (stored.RevokedAt is not null)
        {
            await _repo.RevokeAllUserRefreshTokensAsync(stored.UserId);
            return null;
        }

        if (stored.ExpiresAt <= DateTime.UtcNow) return null;

        var user = await _repo.GetByIdAsync(stored.UserId);
        if (user is null || user.Status != UserStatus.Active)
        {
            await _repo.RevokeAllUserRefreshTokensAsync(stored.UserId);
            return null;
        }

        var (response, token) = CreateAuthResponse(user);
        if (await _repo.RotateRefreshTokenAsync(stored.RefreshTokenId, token)) return response;

        // Request khác đã dùng token trước khi transaction này lấy được khóa.
        await _repo.RevokeAllUserRefreshTokensAsync(stored.UserId);
        return null;
    }

    public async Task LogoutAsync(string refreshToken)
    {
        var stored = await _repo.GetRefreshTokenByHashAsync(_jwt.HashToken(refreshToken));
        if (stored is not null) await _repo.RevokeRefreshTokenAsync(stored.RefreshTokenId);
    }

    public async Task<UserDto?> GetCurrentUserAsync(int userId)
    {
        var user = await _repo.GetByIdAsync(userId);
        return user is null ? null : UserMapper.ToDto(user);
    }

    public async Task<(UserDto? User, string? Error)> UpdateProfileAsync(int userId, UpdateProfileRequestDto dto)
    {
        var username = (dto.Username ?? string.Empty).Trim();
        if (username.Length == 0) return (null, "USERNAME_REQUIRED");
        if (username.Length > 100) return (null, "USERNAME_TOO_LONG");

        var user = await _repo.GetByIdAsync(userId);
        if (user is null || user.Status != UserStatus.Active) return (null, "USER_NOT_FOUND");

        if (user.Username != username) await _repo.UpdateUsernameAsync(userId, username);
        user.Username = username;
        return (UserMapper.ToDto(user), null);
    }

    public async Task<(bool Success, string? Error)> SetPasswordAsync(int userId, SetPasswordRequestDto dto)
    {
        if (CheckNewPassword(dto.NewPassword, dto.ConfirmNewPassword) is { } invalid) return (false, invalid);

        var user = await _repo.GetByIdAsync(userId);
        if (user is null || user.Status != UserStatus.Active) return (false, "USER_NOT_FOUND");

        // Nếu đã có mật khẩu thì phải dùng luồng đổi mật khẩu (ChangePassword) có xác nhận mật khẩu cũ
        if (!string.IsNullOrEmpty(user.PasswordHash))
            return (false, "PASSWORD_ALREADY_SET");

        await SaveNewPasswordAsync(userId, dto.NewPassword);
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> ChangePasswordAsync(int userId, ChangePasswordRequestDto dto)
    {
        if (CheckNewPassword(dto.NewPassword, dto.ConfirmNewPassword) is { } invalid) return (false, invalid);

        var user = await _repo.GetByIdAsync(userId);
        if (user is null || user.Status != UserStatus.Active) return (false, "USER_NOT_FOUND");

        if (string.IsNullOrWhiteSpace(dto.OldPassword))
        {
            if (!string.IsNullOrEmpty(user.PasswordHash))
                return (false, "OLD_PASSWORD_REQUIRED");
        }
        else
        {
            if (dto.OldPassword == dto.NewPassword) return (false, "SAME_AS_OLD_PASSWORD");
            if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
                return (false, "INVALID_OLD_PASSWORD");
        }

        await SaveNewPasswordAsync(userId, dto.NewPassword);
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> ForgotPasswordAsync(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _repo.GetByEmailAsync(normalizedEmail);

        // Chống lộ thông tin tài khoản (Anti-user enumeration)
        if (user is null || user.Status != UserStatus.Active) return (true, null);

        var lastCreated = await _repo.GetLastOtpCreationTimeAsync(normalizedEmail);
        if (lastCreated is not null && (DateTime.UtcNow - lastCreated.Value).TotalSeconds < OtpCooldownSeconds)
            return (false, "OTP_COOLDOWN");

        var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        var expiryMinutes = _config.GetValue<int>("Email:OtpExpiryMinutes", 5);

        var otpRecord = new PasswordResetOtp
        {
            Email = normalizedEmail,
            OtpHash = _jwt.HashToken(otp),
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
            AttemptsCount = 0,
            IsUsed = false
        };

        await _repo.CreatePasswordResetOtpAsync(otpRecord);
        await _email.SendPasswordResetOtpAsync(normalizedEmail, otp);
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequestDto dto)
    {
        if (CheckNewPassword(dto.NewPassword, dto.ConfirmNewPassword) is { } invalid) return (false, invalid);

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _repo.GetByEmailAsync(normalizedEmail);
        if (user is null || user.Status != UserStatus.Active) return (false, "USER_NOT_FOUND");

        var activeOtp = await _repo.GetActiveOtpAsync(normalizedEmail);
        if (activeOtp is null) return (false, "OTP_EXPIRED_OR_NOT_FOUND");
        if (activeOtp.AttemptsCount >= MaxOtpAttempts) return (false, "OTP_MAX_ATTEMPTS_EXCEEDED");

        var inputHash = _jwt.HashToken(dto.Otp.Trim());
        if (inputHash != activeOtp.OtpHash)
        {
            await _repo.IncrementOtpAttemptsAsync(activeOtp.OtpId);
            return (false, "INVALID_OTP");
        }

        await _repo.MarkOtpUsedAsync(activeOtp.OtpId);

        await SaveNewPasswordAsync(user.UserId, dto.NewPassword);
        return (true, null);
    }

    public async Task<(AuthResponseDto? Response, string? Error)> GoogleLoginAsync(string idToken)
    {
        var payload = await _googleAuth.ValidateTokenAsync(idToken);
        if (payload is null || !payload.EmailVerified ||
            string.IsNullOrWhiteSpace(payload.Subject) || payload.Subject.Length > 100 ||
            string.IsNullOrWhiteSpace(payload.Email) || payload.Email.Trim().Length > 255)
            return (null, "INVALID_GOOGLE_TOKEN");

        var user = await _repo.GetByGoogleIdAsync(payload.Subject);
        if (user is null)
        {
            var normalizedEmail = payload.Email.Trim().ToLowerInvariant();
            user = await _repo.GetByEmailAsync(normalizedEmail);
            if (user is not null)
            {
                if (user.Status != UserStatus.Active) return (null, "ACCOUNT_LOCKED");
                if (!string.IsNullOrEmpty(user.GoogleId)) return (null, "INVALID_GOOGLE_TOKEN");
                if (await _repo.LinkGoogleIdAsync(user.UserId, payload.Subject) != 1)
                    return (null, "INVALID_GOOGLE_TOKEN");
                user.GoogleId = payload.Subject;
            }
            else
            {
                var username = !string.IsNullOrWhiteSpace(payload.Name) ? payload.Name.Trim() : "Google User";
                if (username.Length > 100) username = username[..100];
                var newUser = new Users
                {
                    Username = username,
                    Email = normalizedEmail,
                    PasswordHash = null,
                    Role = UserRole.LEARNER,
                    Status = UserStatus.Active,
                    GoogleId = payload.Subject
                };
                user = await _repo.CreateUserAsync(newUser);
                if (user is null) return (null, "EMAIL_EXISTS");
            }
        }

        if (user.Status != UserStatus.Active) return (null, "ACCOUNT_LOCKED");

        var (response, token) = CreateAuthResponse(user);
        await _repo.AddRefreshTokenAsync(token);
        return (response, null);
    }

    private (AuthResponseDto Response, RefreshToken Token) CreateAuthResponse(Users user)
    {
        var (accessToken, expiresAt) = _jwt.GenerateToken(user);
        var (refreshToken, tokenHash, refreshExpiresAt) = _jwt.GenerateRefreshToken();
        var token = new RefreshToken
        {
            UserId = user.UserId,
            TokenHash = tokenHash,
            ExpiresAt = refreshExpiresAt
        };

        var response = new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt,
            RefreshExpiresAt = refreshExpiresAt,
            User = UserMapper.ToDto(user)
        };

        return (response, token);
    }

    // Mã lỗi nếu mật khẩu mới không hợp lệ (xác nhận không khớp, quá 72 byte); null nếu hợp lệ.
    private static string? CheckNewPassword(string password, string confirm) =>
        password != confirm ? "PASSWORD_MISMATCH" : IsTooLong(password) ? "PASSWORD_TOO_LONG" : null;

    // Lưu mật khẩu mới và đăng xuất mọi thiết bị.
    private async Task SaveNewPasswordAsync(int userId, string password)
    {
        await _repo.UpdatePasswordAsync(userId, BCrypt.Net.BCrypt.HashPassword(password));
        await _repo.RevokeAllUserRefreshTokensAsync(userId);
    }

    private static bool IsTooLong(string password) => Encoding.UTF8.GetByteCount(password) > MaxPasswordBytes;
}
