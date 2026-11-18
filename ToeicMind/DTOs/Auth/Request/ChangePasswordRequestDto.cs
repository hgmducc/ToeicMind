using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Auth.Request;

public class ChangePasswordRequestDto
{
    // Mật khẩu cũ (bắt buộc với tài khoản thường; có thể để trống nếu tài khoản đăng ký qua Google chưa có mật khẩu)
    public string? OldPassword { get; set; }

    [Required(ErrorMessage = "Mật khẩu mới không được để trống")]
    [MinLength(6, ErrorMessage = "Mật khẩu mới phải có tối thiểu 6 ký tự")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu xác nhận không được để trống")]
    [Compare(nameof(NewPassword), ErrorMessage = "Mật khẩu xác nhận không khớp")]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}
