using Microsoft.AspNetCore.Mvc;

namespace ToeicMind.Controllers;

/// <summary>
/// Lớp cơ sở của mọi controller: bật hành vi [ApiController], lấy người dùng hiện tại và đổi kết quả của service
/// (dữ liệu hoặc mã lỗi nghiệp vụ) thành phản hồi HTTP. Controller chỉ khai báo route và quyền ([Authorize]/[AllowAnonymous]).
/// </summary>
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>UserId của người đang đăng nhập; chỉ dùng trong action có [Authorize].</summary>
    protected int UserId => User.GetUserId();

    /// <summary>UserId của người đang đăng nhập, null với khách; dùng trong action [AllowAnonymous].</summary>
    protected int? UserIdOrNull => User.TryGetUserId();

    /// <summary>(dữ liệu, mã lỗi) từ service: thành công trả <paramref name="status"/> kèm dữ liệu, thất bại trả lỗi nghiệp vụ.</summary>
    protected IActionResult Respond<T>((T? Result, string? Error) outcome, int status = StatusCodes.Status200OK) =>
        outcome.Error is null ? StatusCode(status, outcome.Result) : Fail(outcome.Error);

    /// <summary>Chỉ có mã lỗi từ service: thành công trả 204 không nội dung.</summary>
    protected IActionResult Respond(string? error) => error is null ? NoContent() : Fail(error);

    /// <summary>Lỗi nghiệp vụ dạng { code, message, traceId } với HTTP status theo bảng <see cref="ApiErrors"/>.</summary>
    protected ObjectResult Fail(string code) => ApiErrors.Result(HttpContext, code);
}
