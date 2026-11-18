using ToeicMind.DTOs.Listening.Request;
using ToeicMind.DTOs.Listening.Response;

namespace ToeicMind.Services.Listening;

/// <summary>Hợp đồng nghiệp vụ bộ clip sưu tầm (UC-28 TH2), xem ListeningItemService.</summary>
public interface IListeningItemService
{
    Task<ListeningItemPageDto> ListAsync(ListeningItemListRequestDto query);
    Task<(ListeningItemDetailDto? Result, string? Error)> GetAsync(int itemId);
    Task<(ListeningItemDetailDto? Result, string? Error)> SaveAsync(int? itemId, SaveListeningItemRequestDto dto);
    Task<(ListeningItemDetailDto? Result, string? Error)> SetPublishedAsync(int itemId, bool published);
    Task<string?> SetDeletedAsync(int itemId, bool deleted);
    Task<(ListeningItemDetailDto? Result, string? Error)> SaveClipAsync(int itemId, int? clipId, SaveListeningClipRequestDto dto);
    Task<(ListeningItemDetailDto? Result, string? Error)> DeleteClipAsync(int itemId, int clipId);
    Task<(ListeningItemDetailDto? Result, string? Error)> UploadClipAudioAsync(int itemId, int clipId, IFormFile file, CancellationToken cancellationToken);
}
