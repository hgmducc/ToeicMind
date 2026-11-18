namespace ToeicMind.Repositories.AdminUsers;

/// <summary>Truy vấn và cập nhật người dùng cho trang quản trị. Các thao tác có điều kiện "không phải ADMIN cuối cùng" nằm trong một câu lệnh để an toàn khi chạy đồng thời.</summary>
public interface IAdminUserRepository
{
    // Danh sách có lọc, mới nhất trước; trả kèm tổng số bản ghi khớp bộ lọc.
    Task<(List<UserWithSessions> Items, int TotalCount)> ListAsync(string? search, UserRole? role, string? status, int page, int pageSize);

    // Một người dùng kèm số phiên đang mở.
    Task<UserWithSessions?> GetAsync(int userId);

    // Đếm theo vai trò và trạng thái.
    Task<(int Total, int Admins, int Learners, int Locked)> CountAsync();

    // Đổi vai trò. Trả 0 dòng khi không tồn tại hoặc sẽ làm hệ thống hết ADMIN đang hoạt động.
    Task<int> SetRoleAsync(int userId, UserRole role);

    // Đổi trạng thái ACTIVE/LOCKED. Trả 0 dòng khi không tồn tại hoặc khóa ADMIN đang hoạt động cuối cùng.
    Task<int> SetStatusAsync(int userId, string status);
}
