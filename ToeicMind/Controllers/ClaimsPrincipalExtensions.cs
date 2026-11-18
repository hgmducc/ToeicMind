using System.Security.Claims;

namespace ToeicMind.Controllers;

/// <summary>Đọc thông tin người dùng đang đăng nhập từ JWT.</summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>Lấy UserId (claim NameIdentifier). Chỉ dùng trong action có [Authorize].</summary>
    public static int GetUserId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>UserId của người đăng nhập, hoặc null với khách. Dùng trong action [AllowAnonymous] có thêm tiến độ cho người đã đăng nhập.</summary>
    public static int? TryGetUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
