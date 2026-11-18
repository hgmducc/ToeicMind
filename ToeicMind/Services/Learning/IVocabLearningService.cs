using ToeicMind.DTOs.Learning.Request;
using ToeicMind.DTOs.Learning.Response;

namespace ToeicMind.Services.Learning;

/// <summary>Hợp đồng nghiệp vụ học từ vựng: tổng quan, chia theo bộ đề → đề → Part, danh sách, phiên học và ôn tập lặp lại ngắt quãng. userId null = khách (tổng quan, đề, bài học công khai, chưa có tiến độ).</summary>
public interface IVocabLearningService
{
    Task<VocabOverviewDto> GetOverviewAsync(int? userId);
    Task<List<VocabExamDto>> GetExamsAsync(int? userId, int examSetId);
    Task<VocabWordPageDto> GetWordsAsync(int userId, VocabWordListRequestDto query);
    Task<VocabStudySessionDto> GetStudySessionAsync(int userId, VocabStudyRequestDto query);
    Task<VocabLessonListDto> GetLessonsAsync(int? userId, VocabLessonListRequestDto query);
    Task<(VocabReviewResultDto? Result, string? Error)> ReviewAsync(int userId, int vocabId, ReviewVocabRequestDto dto);
    Task<string?> ResetAsync(int userId, int vocabId);
}
