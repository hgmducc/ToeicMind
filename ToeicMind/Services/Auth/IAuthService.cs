using ToeicMind.DTOs.Auth.Response;

namespace ToeicMind.Services.Auth;

/// <summary>Hợp đồng nghiệp vụ xác thực (xem AuthService).</summary>
public interface IAuthService
{
    Task<(UserDto? User, string? Error)> RegisterAsync(RegisterRequestDto dto);
    Task<(AuthResponseDto? Response, string? Error)> LoginAsync(LoginRequestDto dto);
    Task<AuthResponseDto?> RefreshAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);
    Task<UserDto?> GetCurrentUserAsync(int userId);

    // Người dùng tự sửa hồ sơ của mình (tên hiển thị). Không có API tương ứng cho quản trị viên.
    Task<(UserDto? User, string? Error)> UpdateProfileAsync(int userId, UpdateProfileRequestDto dto);

    // Thiết lập mật khẩu lần đầu cho người dùng chưa có mật khẩu
    Task<(bool Success, string? Error)> SetPasswordAsync(int userId, SetPasswordRequestDto dto);

    // Đổi mật khẩu cho người dùng đã đăng nhập
    Task<(bool Success, string? Error)> ChangePasswordAsync(int userId, ChangePasswordRequestDto dto);

    // Yêu cầu gửi mã OTP đặt lại mật khẩu qua email
    Task<(bool Success, string? Error)> ForgotPasswordAsync(string email);

    // Xác thực mã OTP và đặt lại mật khẩu mới
    Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequestDto dto);

    // Đăng nhập hoặc đăng ký tự động bằng Google ID Token
    Task<(AuthResponseDto? Response, string? Error)> GoogleLoginAsync(string idToken);
}
