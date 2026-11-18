using ToeicMind.DTOs.Listening.Request;
using ToeicMind.DTOs.Listening.Response;
using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Listening;

/// <summary>Hợp đồng truy cập bộ clip sưu tầm (TH2, ListeningItem.GroupId NULL) và clip, audio của nó.</summary>
public interface IListeningItemRepository
{
    Task<(List<ListeningItemSummaryDto> Items, int TotalCount)> ListAsync(ListeningItemListRequestDto query);
    Task<ListeningItemSummaryDto?> GetSummaryAsync(int itemId);
    Task<List<ListeningClipAdminDto>> GetClipsAsync(int itemId);
    Task<ListeningClipAdminDto?> GetClipAsync(int itemId, int clipId);
    Task<int> AddItemAsync(ListeningItem item);
    Task<bool> UpdateItemAsync(int itemId, byte partNo, int? categoryId, byte? levelNo, string? sourceNote);
    Task<bool> SetPublishedAsync(int itemId, bool published);
    Task<bool> SetDeletedAsync(int itemId, bool deleted);
    Task<short> NextSeqAsync(int itemId);
    Task<(int? ClipId, string? Error)> AddClipAsync(ListeningClip clip);
    Task<string?> UpdateClipAsync(int itemId, int clipId, short seqNo, string role, string transcriptEn, string? translationVi, string? speaker);
    Task<bool> DeleteClipAsync(int itemId, int clipId);
    Task<string?> SaveClipAudioAsync(MediaFile media);
    Task<bool> IsMediaKeyRegisteredAsync(string key);
}
