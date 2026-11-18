using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Exams;

namespace ToeicMind.Services.Exams;

/// <summary>Chuyển entity bộ đề/đề thi sang DTO.</summary>
public static class ExamMapper
{
    public static ExamDto ToDto(Exam exam) => new()
    {
        ExamId = exam.ExamId, ExamSetId = exam.ExamSetId, ExamCode = exam.ExamCode,
        Title = exam.Title, Description = exam.Description, Status = exam.Status,
        AccessLevel = exam.AccessLevel, EffectiveAccess = exam.EffectiveAccess,
        IsDeleted = exam.IsDeleted, DeletedAt = Utc(exam.DeletedAt),
        CreatedAt = Utc(exam.CreatedAt), UpdatedAt = Utc(exam.UpdatedAt)
    };

    public static ExamSetDto ToDto(ExamSetSummary summary) => new()
    {
        ExamSetId = summary.ExamSet.ExamSetId, Name = summary.ExamSet.Name,
        Description = summary.ExamSet.Description,
        ExamAccess = summary.ExamSet.ExamAccess, VocabAccess = summary.ExamSet.VocabAccess,
        ListeningAccess = summary.ExamSet.ListeningAccess, ReadingAccess = summary.ExamSet.ReadingAccess, IsDeleted = summary.ExamSet.IsDeleted,
        DeletedAt = Utc(summary.ExamSet.DeletedAt), CreatedAt = Utc(summary.ExamSet.CreatedAt),
        UpdatedAt = Utc(summary.ExamSet.UpdatedAt), ExamCount = summary.ExamCount,
        PublishedExamCount = summary.PublishedExamCount
    };

    private static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
    private static DateTime? Utc(DateTime? value) => value.HasValue ? Utc(value.Value) : null;
}
