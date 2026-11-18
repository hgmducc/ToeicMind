using System.Data;
using Microsoft.EntityFrameworkCore;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Exams;

// Kiểm tra, xuất bản và gỡ xuất bản đề.
public partial class ExamContentRepository
{
    public Task<List<ExamIssueDto>> ValidatePublishAsync(int examId) =>
        _db.Database.SqlQuery<ExamIssueDto>($"EXEC dbo.sp_ValidateExam @ExamId={examId}").ToListAsync();

    public async Task<List<ExamIssueDto>> PublishAsync(int examId, Func<IReadOnlyList<QuestionGroup>, List<ExamIssueDto>> validate)
    {
        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            // Giữ khóa đọc nội dung tới lúc procedure chốt xuất bản; tránh sửa giữa hai lớp kiểm tra.
            var issues = await ValidatePublishAsync(examId);
            issues.AddRange(validate(await GetGroupsAsync(examId, null)));
            if (issues.Count > 0) return issues;
            issues = await _db.Database.SqlQuery<ExamIssueDto>($"EXEC dbo.sp_PublishExam @ExamId={examId}").ToListAsync();
            if (issues.Count == 0) await transaction.CommitAsync();
            return issues;
        }
        catch (Exception ex) when (SqlError(ex, 1205))
        {
            return [new() { Code = "CONCURRENT_CHANGE", Message = "Có thay đổi đồng thời. Vui lòng kiểm tra và thử lại." }];
        }
    }

    public async Task<string?> UnpublishAsync(int examId)
    {
        var changed = await _db.Exams.Where(e => e.ExamId == examId && !e.IsDeleted && !e.ExamSet.IsDeleted)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.Status, "DRAFT").SetProperty(e => e.UpdatedAt, DateTime.UtcNow));
        return changed == 0 ? "EXAM_NOT_FOUND" : null;
    }
}
