using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Exams;

/// <summary>Hợp đồng truy cập dữ liệu nội dung đề: nhóm, câu hỏi, hướng dẫn, media, xuất bản (xem ExamContentRepository).</summary>
public interface IExamContentRepository
{
    Task<ExamCatalogDto> GetCatalogAsync();
    Task<(Exam? Result, string? Error)> SavePackageAsync(Exam requested, List<QuestionGroup> groups);
    Task<string?> GetImportSourceAsync(int examId);
    Task<ListeningClip?> GetClipAsync(int examId, int groupId, int clipId);
    Task<bool> HasAttemptsAsync(int examId);
    Task<List<QuestionGroup>> GetGroupsAsync(int examId, byte? partNo);
    Task<QuestionGroup?> GetGroupAsync(int examId, int groupId);
    Task<(QuestionGroup? Result, string? Error)> SaveGroupAsync(QuestionGroup requested, int? groupId);
    Task<string?> DeleteGroupAsync(int examId, int groupId);
    Task<List<ExamDirection>> GetDirectionsAsync(int? examId, bool effective);
    Task<ExamDirection?> GetDirectionAsync(int id);
    Task<(ExamDirection? Result, string? Error)> SaveDirectionAsync(ExamDirection requested, int? directionId);
    Task<MediaFile?> GetMediaAsync(int id);
    Task<bool> IsMediaKeyRegisteredAsync(string key);
    Task<(MediaFile? Result, string? Error)> SaveMediaAsync(MediaFile requested, int? examId);
    Task<string?> DeleteMediaAsync(int id);
    Task<List<ExamIssueDto>> ValidatePublishAsync(int examId);
    Task<List<ExamIssueDto>> PublishAsync(int examId, Func<IReadOnlyList<QuestionGroup>, List<ExamIssueDto>> validate);
    Task<string?> UnpublishAsync(int examId);
    Task<(int Inserted, List<ExamDirectionDto> Directions)> SeedDefaultDirectionsAsync();
}
