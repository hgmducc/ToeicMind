namespace ToeicMind.Repositories.Auth;

/// <summary>
/// Interface định nghĩa các phương thức thao tác dữ liệu xác thực và người dùng.
/// </summary>
public interface IAuthRepository
{
    // Tìm kiếm thông tin người dùng dựa theo địa chỉ Email.
    Task<Users?> GetByEmailAsync(string email);

    // Tìm kiếm thông tin người dùng dựa theo ID của người dùng.
    Task<Users?> GetByIdAsync(int userId);

    // Kiểm tra xem một địa chỉ Email đã tồn tại trong hệ thống hay chưa.
    Task<bool> ExistsByEmailAsync(string email);

    // Tạo mới một tài khoản người dùng trong cơ sở dữ liệu.
    Task<Users?> CreateUserAsync(Users user);

    // Tìm kiếm Refresh Token dựa theo giá trị mã hóa hash của token.
    Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash);

    // Thêm mới một Refresh Token vào cơ sở dữ liệu.
    Task AddRefreshTokenAsync(RefreshToken token);

    // Thu hồi token nếu token chưa bị thu hồi.
    Task RevokeRefreshTokenAsync(long refreshTokenId);

    // Thu hồi token cũ và lưu token mới trong cùng transaction; chỉ một request được thành công.
    Task<bool> RotateRefreshTokenAsync(long refreshTokenId, RefreshToken replacement);

    // Thu hồi tất cả các Refresh Token đang hoạt động của một người dùng.
    Task RevokeAllUserRefreshTokensAsync(int userId);

    // Cập nhật mật khẩu băm mới cho người dùng.
    Task<int> UpdatePasswordAsync(int userId, string newPasswordHash);

    // Cập nhật tên hiển thị của chính người dùng (PUT /api/auth/me).
    Task<int> UpdateUsernameAsync(int userId, string username);

    // Tìm kiếm người dùng dựa theo GoogleId.
    Task<Users?> GetByGoogleIdAsync(string googleId);

    // Liên kết GoogleId với tài khoản người dùng hiện tại.
    Task<int> LinkGoogleIdAsync(int userId, string googleId);

    // Lưu mã OTP đặt lại mật khẩu mới.
    Task CreatePasswordResetOtpAsync(PasswordResetOtp otp);

    // Lấy OTP hợp lệ gần nhất (chưa sử dụng và chưa hết hạn) theo email.
    Task<PasswordResetOtp?> GetActiveOtpAsync(string email);

    // Tăng số lần thử sai của mã OTP.
    Task IncrementOtpAttemptsAsync(long otpId);

    // Đánh dấu mã OTP đã được sử dụng thành công.
    Task MarkOtpUsedAsync(long otpId);

    // Lấy thời điểm tạo mã OTP gần nhất của email để kiểm tra khoảng cách gửi (cooldown).
    Task<DateTime?> GetLastOtpCreationTimeAsync(string email);
}
