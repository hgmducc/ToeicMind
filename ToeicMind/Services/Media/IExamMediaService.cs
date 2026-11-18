using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.Services.Media;

/// <summary>Hợp đồng nghiệp vụ media của đề (xem ExamMediaService).</summary>
public interface IExamMediaService
{
    Task<(MediaFileDto? Result, string? Error)> UploadAsync(int? examId, int? groupId, int? directionId, IFormFile file, string? altText, byte sortOrder, CancellationToken cancellationToken, int? clipId = null, string? fileName = null);
    Task<(List<MediaSlotDto>? Result, string? Error)> GetSlotsAsync(int examId);
    Task<(SignedMediaUrlDto? Result, string? Error)> SignReadAsync(int id);
    Task<string?> DeleteAsync(int id);
}
