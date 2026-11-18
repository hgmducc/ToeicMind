using ToeicMind.DTOs.Exams.Request;
using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Exams;

/// <summary>Hợp đồng truy cập dữ liệu bộ đề và đề thi (xem ExamRepository).</summary>
public interface IExamRepository
{
    Task<(IReadOnlyList<ExamSetSummary> Items, int TotalCount)> ListSetsAsync(ExamPageRequestDto query, bool learner, bool deleted = false);
    Task<ExamSetSummary?> GetSetAsync(int id, bool learner);
    Task<(IReadOnlyList<Exam> Items, int TotalCount)> ListExamsAsync(ExamBrowseRequestDto query, bool learner, string? status = null, bool deleted = false);
    Task<Exam?> GetExamAsync(int id, bool learner);
    Task<(ExamSet? Entity, string? Error)> SaveSetAsync(ExamSet requested, bool create);
    Task<(Exam? Entity, string? Error)> SaveExamAsync(Exam requested, bool create, bool preserveCode = false);
    Task<string?> SetDeletedAsync(int id, bool deleted);
    Task<string?> ExamDeletedAsync(int id, bool deleted);
}
