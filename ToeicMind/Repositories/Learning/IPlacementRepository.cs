namespace ToeicMind.Repositories.Learning;

/// <summary>Hợp đồng truy cập dữ liệu bài kiểm tra đầu vào (CHG-007): Admin ghép/sửa/bật bài; người học lấy bài đang dùng, lượt đang làm và kết quả (xem PlacementRepository).</summary>
public interface IPlacementRepository
{
    // ----- Admin -----
    Task<List<PlacementTest>> ListAsync();
    Task<PlacementTest?> GetAsync(int placementTestId);
    // Nhóm đã chọn của các bài (theo SortOrder), kèm Part, số câu và còn dùng được không.
    Task<List<PlacementGroupLink>> GetLinksAsync(IReadOnlyCollection<int> placementTestIds);
    Task<Dictionary<int, int>> CountAttemptsAsync(IReadOnlyCollection<int> placementTestIds);
    // Thông tin hiển thị của các nhóm (kể cả nhóm đã xóa: IsAvailable = false).
    Task<List<PlacementGroupDto>> DescribeGroupsAsync(IReadOnlyCollection<int> groupIds);
    // Nhóm ứng viên: thuộc đề đã xuất bản, chưa xóa, còn câu. categoryIds đã gồm loại con.
    Task<(List<PlacementGroupDto> Items, int TotalCount)> SearchCandidatesAsync(PlacementCandidateRequestDto query, IReadOnlyCollection<int>? categoryIds);
    Task<List<PlacementPoolRow>> GetPoolAsync(int? examId);
    // Các ID trong danh sách là nhóm ứng viên hợp lệ.
    Task<HashSet<int>> ValidGroupIdsAsync(IReadOnlyCollection<int> groupIds);
    // Lưu bài và thay toàn bộ danh sách nhóm theo thứ tự; IsActive = true tắt bài đang dùng khác trong cùng giao dịch.
    Task<(PlacementTest? Entity, string? Error)> SaveAsync(PlacementTest requested, IReadOnlyList<int> groupIds, bool create);
    Task<string?> SoftDeleteAsync(int placementTestId);

    // ----- Người học -----
    Task<PlacementTest?> GetActiveAsync();
    Task<int?> GetInProgressAttemptIdAsync(int userId);
    Task<PlacementAttemptRow?> GetLastResultAsync(int userId);
}
