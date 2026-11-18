using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Auth.Request;

/// <summary>
/// Người dùng tự sửa hồ sơ của chính mình (PUT /api/auth/me). Chỉ nhận tên hiển thị:
/// email là định danh đăng nhập (gắn với Google), còn vai trò/trạng thái/VIP không do người dùng tự đặt.
/// Trường lạ (role, email, status, userId…) bị từ chối với 400.
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class UpdateProfileRequestDto
{
    [Required(ErrorMessage = "Tên hiển thị không được để trống")]
    [MaxLength(100, ErrorMessage = "Tên hiển thị không được vượt quá 100 ký tự")]
    public string Username { get; set; } = string.Empty;
}
