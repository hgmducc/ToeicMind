using ToeicMind.DTOs.Exams.Request;
using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.Services.Exams;

/// <summary>Hợp đồng nghiệp vụ nội dung đề (xem ExamContentService).</summary>
public interface IExamContentService
{
    Task<ExamCatalogDto> GetCatalogAsync();
    Task<(ExamDto? Result, string? Error, List<ExamIssueDto> Issues)> SavePackageAsync(int? examId, SaveExamContentRequestDto dto, int userId);
    Task<string?> GetImportSourceAsync(int examId);
    Task<(IReadOnlyList<QuestionGroupDto>? Result, string? Error)> GetGroupsAsync(int examId, byte? partNo);
    Task<List<ExamDirectionDto>> GetDirectionsAsync(int? examId, bool effective);
    Task<(ExamDirectionDto? Result, string? Error)> SaveDirectionAsync(int? id, SaveDirectionRequestDto dto);
    Task<List<ExamIssueDto>> ValidatePublishAsync(int examId);
    Task<List<ExamIssueDto>> PublishAsync(int examId);
    Task<string?> UnpublishAsync(int examId);
    Task<(int Inserted, List<ExamDirectionDto> Directions)> SeedDefaultDirectionsAsync();
}
