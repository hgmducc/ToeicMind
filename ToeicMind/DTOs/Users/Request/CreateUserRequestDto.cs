using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Users.Request;

/// <summary>Admin tạo tài khoản và chọn vai trò (khác đăng ký công khai luôn là LEARNER).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class CreateUserRequestDto
{
    [Required, MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6), MaxLength(72)]
    public string Password { get; set; } = string.Empty;

    [Required, RegularExpression("^(ADMIN|LEARNER)$", ErrorMessage = "Role chỉ nhận ADMIN hoặc LEARNER")]
    public string Role { get; set; } = "LEARNER";
}
