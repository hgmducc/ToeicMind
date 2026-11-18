using ToeicMind.DTOs.Exams.Request;
using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.Services.Exams;

/// <summary>Hợp đồng nghiệp vụ bộ đề và đề thi (xem ExamService).</summary>
public interface IExamService
{
    Task<ExamPageDto<ExamSetDto>> ListSetsAsync(ExamPageRequestDto query, bool learner, bool deleted = false);
    Task<ExamSetDto?> GetSetAsync(int id, bool learner);
    Task<ExamPageDto<ExamDto>> ListExamsAsync(ExamBrowseRequestDto query, bool learner, string? status = null, bool deleted = false, int? viewerId = null);
    Task<ExamDto?> GetExamAsync(int id, bool learner);
    Task<(ExamSetDto? Result, string? Error)> SaveSetAsync(int? id, SaveExamSetRequestDto dto, int userId);
    Task<(ExamDto? Result, string? Error)> SaveExamAsync(int? id, SaveExamRequestDto dto, int userId);
    Task<string?> SetDeletedAsync(int id, bool deleted);
    Task<string?> ExamDeletedAsync(int id, bool deleted);
}
