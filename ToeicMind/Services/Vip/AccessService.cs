using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Vip;

namespace ToeicMind.Services.Vip;

/// <summary>Hợp đồng kiểm tra quyền VIP khi truy cập nội dung (đề, từ vựng, Nghe, Đọc).</summary>
public interface IAccessService
{
    /// <summary>Người dùng có toàn quyền: ADMIN, hoặc VIP còn hạn. Khách (null) không có.</summary>
    Task<bool> HasVipAsync(int? userId);

    /// <summary>Nội dung ở mức <paramref name="access"/> (FREE/VIP) có dùng được không: FREE ai cũng dùng được, VIP cần <see cref="HasVipAsync"/>.</summary>
    Task<bool> CanUseAsync(int? userId, string access);
}

/// <summary>
/// Quy tắc: nội dung FREE dùng được với mọi tài khoản đã đăng nhập (khách chỉ xem danh sách); nội dung VIP cần gói VIP còn hạn hoặc ADMIN.
/// Kết quả được nhớ trong phạm vi một request (service scoped) để không truy vấn lặp lại.
/// </summary>
public class AccessService : IAccessService
{
    private readonly IVipRepository _repo;
    private (int UserId, bool Vip)? _memo;

    public AccessService(IVipRepository repo) => _repo = repo;

    public async Task<bool> HasVipAsync(int? userId)
    {
        if (userId is not { } id) return false;
        if (_memo is { } known && known.UserId == id) return known.Vip;
        var info = await _repo.GetVipInfoAsync(id);
        var vip = info is { } i && (i.Role == UserRole.ADMIN || i.VipExpiresAt > DateTime.UtcNow);
        _memo = (id, vip);
        return vip;
    }

    public async Task<bool> CanUseAsync(int? userId, string access) => access != Access.Vip || await HasVipAsync(userId);
}
