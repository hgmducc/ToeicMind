using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Auth;

namespace ToeicMind.Controllers;

/// <summary>API xác thực: đăng ký, đăng nhập (mật khẩu/Google), làm mới token, đăng xuất, đổi/đặt/quên/đặt lại mật khẩu.</summary>
[Route("api/[controller]")]
[Authorize]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequestDto dto)
    {
        var (user, error) = await _auth.RegisterAsync(dto);
        if (error is null) return StatusCode(StatusCodes.Status201Created, user);

        var message = error switch
        {
            "EMAIL_EXISTS" => "Email đã tồn tại",
            "PASSWORD_MISMATCH" => "Mật khẩu xác nhận không khớp",
            _ => "Mật khẩu không được vượt quá 72 byte UTF-8"
        };

        var body = ErrorBody(error, message);
        return error == "EMAIL_EXISTS" ? Conflict(body) : BadRequest(body);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequestDto dto)
    {
        var (result, error) = await _auth.LoginAsync(dto);
        if (error is not null)
        {
            var message = error switch
            {
                "NO_PASSWORD_SET" => "Tài khoản được đăng ký bằng Google và chưa thiết lập mật khẩu. Vui lòng đăng nhập bằng Google hoặc thiết lập mật khẩu.",
                _ => "Email hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa"
            };

            var body = ErrorBody(error, message);
            return error == "NO_PASSWORD_SET" ? BadRequest(body) : Unauthorized(body);
        }

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshRequestDto dto)
    {
        var result = await _auth.RefreshAsync(dto.RefreshToken);
        return result is null
            ? Unauthorized(ErrorBody("INVALID_REFRESH_TOKEN", "Refresh token không hợp lệ hoặc đã hết hạn"))
            : Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequestDto dto)
    {
        await _auth.LogoutAsync(dto.RefreshToken);
        return NoContent();
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _auth.GetCurrentUserAsync(UserId);
        return user is null ? Unauthorized() : Ok(user);
    }

    /// <summary>
    /// Người dùng tự sửa hồ sơ của chính mình (tên hiển thị). Mã người dùng lấy từ token, không nhận từ request;
    /// quản trị viên không có API sửa hồ sơ của người khác (chỉ đổi vai trò/trạng thái, thu hồi phiên).
    /// </summary>
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe(UpdateProfileRequestDto dto)
    {
        var (user, error) = await _auth.UpdateProfileAsync(UserId, dto);
        if (error is null) return Ok(user);

        var message = error switch
        {
            "USERNAME_REQUIRED" => "Tên hiển thị không được để trống",
            "USERNAME_TOO_LONG" => "Tên hiển thị không được vượt quá 100 ký tự",
            "USER_NOT_FOUND" => "Người dùng không tồn tại hoặc tài khoản đã bị khóa",
            _ => "Không thể cập nhật hồ sơ"
        };

        var body = ErrorBody(error, message);
        return error == "USER_NOT_FOUND" ? Unauthorized(body) : BadRequest(body);
    }

    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword(SetPasswordRequestDto dto)
    {
        var (success, error) = await _auth.SetPasswordAsync(UserId, dto);
        if (success)
            return Ok(new { message = "Thiết lập mật khẩu thành công. Các phiên đăng nhập trên thiết bị khác đã được đăng xuất." });

        var message = error switch
        {
            "PASSWORD_ALREADY_SET" => "Tài khoản đã có mật khẩu. Vui lòng sử dụng chức năng Đổi mật khẩu.",
            "PASSWORD_MISMATCH" => "Mật khẩu xác nhận không khớp",
            "PASSWORD_TOO_LONG" => "Mật khẩu không được vượt quá 72 byte UTF-8",
            "USER_NOT_FOUND" => "Người dùng không tồn tại hoặc tài khoản đã bị khóa",
            _ => "Không thể thiết lập mật khẩu"
        };

        var body = ErrorBody(error, message);
        return error == "USER_NOT_FOUND" ? Unauthorized(body) : BadRequest(body);
    }

    [HttpPut("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequestDto dto)
    {
        var (success, error) = await _auth.ChangePasswordAsync(UserId, dto);
        if (success)
            return Ok(new { message = "Đổi mật khẩu thành công. Các phiên đăng nhập trên thiết bị khác đã được đăng xuất." });

        var message = error switch
        {
            "INVALID_OLD_PASSWORD" => "Mật khẩu cũ không chính xác",
            "SAME_AS_OLD_PASSWORD" => "Mật khẩu mới không được trùng với mật khẩu cũ",
            "OLD_PASSWORD_REQUIRED" => "Vui lòng nhập mật khẩu cũ để xác thực",
            "PASSWORD_MISMATCH" => "Mật khẩu xác nhận không khớp",
            "PASSWORD_TOO_LONG" => "Mật khẩu không được vượt quá 72 byte UTF-8",
            _ => "Yêu cầu đổi mật khẩu không hợp lệ"
        };

        var body = ErrorBody(error, message);
        return error == "INVALID_OLD_PASSWORD" ? Unauthorized(body) : BadRequest(body);
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequestDto dto)
    {
        var (success, error) = await _auth.ForgotPasswordAsync(dto.Email);
        if (success)
            return Ok(new { code = "OTP_SENT", message = "Nếu email hợp lệ, mã OTP xác thực đã được gửi đến hộp thư của bạn." });

        var message = error switch
        {
            "OTP_COOLDOWN" => "Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP mới",
            _ => "Không thể gửi mã OTP. Vui lòng thử lại sau"
        };

        var body = ErrorBody(error, message);
        return error == "OTP_COOLDOWN" ? StatusCode(StatusCodes.Status429TooManyRequests, body) : BadRequest(body);
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto dto)
    {
        var (success, error) = await _auth.ResetPasswordAsync(dto);
        if (success)
            return Ok(new { message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới." });

        var message = error switch
        {
            "OTP_EXPIRED_OR_NOT_FOUND" => "Mã OTP không tồn tại hoặc đã hết hạn",
            "OTP_MAX_ATTEMPTS_EXCEEDED" => "Bạn đã nhập sai mã OTP quá số lần cho phép (5 lần). Vui lòng yêu cầu mã OTP mới",
            "INVALID_OTP" => "Mã OTP không chính xác",
            "PASSWORD_MISMATCH" => "Mật khẩu xác nhận không khớp",
            "PASSWORD_TOO_LONG" => "Mật khẩu không được vượt quá 72 byte UTF-8",
            _ => "Yêu cầu đặt lại mật khẩu không hợp lệ"
        };

        return BadRequest(ErrorBody(error, message));
    }

    [AllowAnonymous]
    [HttpPost("google-login")]
    public async Task<IActionResult> GoogleLogin(GoogleLoginRequestDto dto)
    {
        var (response, error) = await _auth.GoogleLoginAsync(dto.IdToken);
        if (error is null) return Ok(response);

        var message = error switch
        {
            "ACCOUNT_LOCKED" => "Tài khoản của bạn đã bị khóa",
            "EMAIL_EXISTS" => "Không thể hoàn tất đăng ký với tài khoản Google này",
            _ => "Xác thực tài khoản Google không thành công hoặc token đã hết hạn"
        };

        return Unauthorized(ErrorBody(error, message));
    }

    // Thông báo của auth theo từng luồng (cùng một mã có thể có thông báo khác nhau tùy luồng) nên không dùng bảng ApiErrors; chỉ dùng chung dạng JSON lỗi.
    private object ErrorBody(string? code, string message) => ApiErrors.Body(HttpContext, code, message);
}
