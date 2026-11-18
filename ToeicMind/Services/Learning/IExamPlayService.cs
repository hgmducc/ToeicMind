namespace ToeicMind.Services.Learning;

/// <summary>Hợp đồng lấy nội dung đề để vào thi: cấu trúc đề và chế độ làm bài (công khai), hướng dẫn, từng Part (chữ và media tách riêng).</summary>
public interface IExamPlayService
{
    Task<PlayResult<ExamModesDto>> GetModesAsync(int examId, string? ifNoneMatch);
    Task<PlayResult<List<PlayDirectionDto>>> GetDirectionsAsync(int userId, int examId, string? ifNoneMatch);
    Task<PlayResult<PartPlayDto>> GetPartAsync(int userId, int examId, byte partNo, bool includeMedia, string? ifNoneMatch);
    Task<PlayResult<PartMediaDto>> GetPartMediaAsync(int userId, int examId, byte partNo);
}
