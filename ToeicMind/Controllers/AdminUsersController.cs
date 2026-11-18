using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Users.Request;
using ToeicMind.Services.AdminUsers;
using ToeicMind.Services.Dashboard;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>API quản trị người dùng và học viên: danh sách, thống kê, tạo, đổi vai trò, khóa/mở khóa, đăng xuất mọi thiết bị. Chỉ ADMIN. Thông tin cá nhân chỉ do chủ tài khoản sửa.</summary>
[Route("api/admin/users")]
[Authorize(Roles = "ADMIN")]
public class AdminUsersController : ApiControllerBase
{
    private readonly IAdminUserService _users;
    private readonly IDashboardService _dashboard;
    private readonly IAttemptService _attempts;

    public AdminUsersController(IAdminUserService users, IDashboardService dashboard, IAttemptService attempts)
    {
        _users = users;
        _dashboard = dashboard;
        _attempts = attempts;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] AdminUserListRequestDto query) =>
        Ok(await _users.ListAsync(query));

    [HttpGet("summary")]
    public async Task<IActionResult> Summary() => Ok(await _users.GetSummaryAsync());

    /// <summary>Thống kê học tập của một học viên: số bài, độ chính xác, điểm tốt nhất, chuỗi ngày học, tiến độ theo Part.</summary>
    [HttpGet("{id:int:min(1)}/stats")]
    public async Task<IActionResult> Stats(int id) =>
        await _users.GetAsync(id) is null ? Fail("USER_NOT_FOUND") : Ok(await _dashboard.GetLearnerStatsAsync(id));

    /// <summary>Lịch sử làm bài của một học viên (cùng bộ lọc như lịch sử của học viên).</summary>
    [HttpGet("{id:int:min(1)}/attempts")]
    public async Task<IActionResult> Attempts(int id, [FromQuery] AttemptListRequestDto query) =>
        await _users.GetAsync(id) is null ? Fail("USER_NOT_FOUND") : Ok(await _attempts.ListAsync(id, query));

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequestDto dto) =>
        Respond(await _users.CreateAsync(dto), StatusCodes.Status201Created);

    [HttpPut("{id:int:min(1)}/role")]
    public async Task<IActionResult> ChangeRole(int id, ChangeUserRoleRequestDto dto) =>
        Respond(await _users.ChangeRoleAsync(UserId, id, dto));

    /// <summary>Khóa (LOCKED) hoặc mở khóa (ACTIVE) tài khoản. Khóa thu hồi luôn các phiên đăng nhập.</summary>
    [HttpPut("{id:int:min(1)}/status")]
    public async Task<IActionResult> ChangeStatus(int id, ChangeUserStatusRequestDto dto) =>
        Respond(await _users.ChangeStatusAsync(UserId, id, dto));

    [HttpPost("{id:int:min(1)}/revoke-sessions")]
    public async Task<IActionResult> RevokeSessions(int id) => Respond(await _users.RevokeSessionsAsync(id));
}
