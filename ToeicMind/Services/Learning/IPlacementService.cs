namespace ToeicMind.Services.Learning;

/// <summary>Hợp đồng nghiệp vụ bài kiểm tra đầu vào (CHG-007): Admin thiết lập bài, người học làm bài và xem trình độ ước tính (xem PlacementService).</summary>
public interface IPlacementService
{
    // ----- Admin -----
    Task<List<PlacementTestSummaryDto>> ListAsync();
    Task<(PlacementTestSummaryDto? Result, string? Error)> GetAsync(int placementTestId);
    Task<(PlacementTestSummaryDto? Result, string? Error)> SaveAsync(int adminId, int? placementTestId, SavePlacementTestRequestDto dto);
    Task<string?> DeleteAsync(int placementTestId);
    Task<PlacementGroupPageDto> SearchCandidatesAsync(PlacementCandidateRequestDto query);
    // Gợi ý bộ nhóm theo số câu mỗi Part (không lưu); trả kèm thời gian đề xuất.
    Task<(PlacementTestSummaryDto? Result, string? Error)> GenerateAsync(GeneratePlacementRequestDto dto);

    // ----- Người học -----
    Task<PlacementStatusDto> GetStatusAsync(int userId);
    // Bắt đầu bài đang dùng; đang có lượt làm dở thì trả lại lượt đó để làm tiếp.
    Task<(AttemptDto? Result, string? Error)> StartAsync(int userId);
}
