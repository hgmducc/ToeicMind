namespace ToeicMind.Services.Learning;

/// <summary>
/// Hợp đồng nghiệp vụ Nghe chép (luyện nghe theo clip cắt từ đề gốc, UC-27): bộ đề, đề, bộ lọc, danh sách, chi tiết clip, tiến độ.
/// userId null = khách: các danh sách công khai, chưa có tiến độ.
/// </summary>
public interface IDictationService
{
    Task<DictationOverviewDto> GetOverviewAsync(int? userId);
    Task<List<DictationExamDto>> GetExamsAsync(int? userId, int examSetId);
    Task<DictationTopicsDto> GetTopicsAsync(int? userId, DictationTopicsRequestDto query);
    Task<DictationItemPageDto> GetItemsAsync(int? userId, DictationItemListRequestDto query);
    Task<(DictationItemDetailDto? Result, string? Error)> GetItemAsync(int userId, int itemId);
    Task<(DictationProgressDto? Result, string? Error)> SaveProgressAsync(int userId, int itemId, SaveDictationProgressRequestDto dto);
}
