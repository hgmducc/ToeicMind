using System.Data;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Models.Exams;
using ToeicMind.Services.Exams;

namespace ToeicMind.Repositories.Exams;

// Nhập/ghi đè cả đề: khớp nội dung theo khóa tự nhiên rồi lưu từng nhóm.
public partial class ExamContentRepository
{
    public async Task<(Exam? Result, string? Error)> SavePackageAsync(Exam requested, List<QuestionGroup> groups)
    {
        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            if (!await _db.ExamSets.AnyAsync(s => s.ExamSetId == requested.ExamSetId && !s.IsDeleted)) return (null, "EXAM_SET_NOT_FOUND");
            var exam = requested;
            if (requested.ExamId == 0) _db.Exams.Add(exam);
            else
            {
                var error = await GuardAsync(requested.ExamId, true);
                if (error is not null) return (null, error);
                exam = await _db.Exams.FirstAsync(e => e.ExamId == requested.ExamId);
                exam.ExamSetId = requested.ExamSetId;
                exam.ExamCode = requested.ExamCode;
                exam.Title = requested.Title;
                exam.Description = requested.Description;
                exam.AccessLevel = requested.AccessLevel;
                exam.ImportSourceJson = requested.ImportSourceJson ?? exam.ImportSourceJson;
                exam.UpdatedAt = DateTime.UtcNow;
                // Nội dung không kèm ID (Excel/JSON) được khớp theo số câu/thứ tự để cập nhật tại chỗ, giữ nguyên ID và media.
                ExamNaturalKeyMatcher.Match(groups, await StoredKeysAsync(exam.ExamId));
                var retained = groups.Select(g => g.GroupId).ToArray();
                var removed = await _db.QuestionGroups.Where(g => g.ExamId == exam.ExamId && !g.IsDeleted && !retained.Contains(g.GroupId)).Select(g => g.GroupId).ToListAsync();
                foreach (var id in removed)
                {
                    var deleteError = await DeleteGroupAsync(exam.ExamId, id);
                    if (deleteError is not null) return (null, deleteError);
                }
            }
            await _db.SaveChangesAsync();
            var lemmas = groups.SelectMany(g => g.Questions).SelectMany(q => q.Vocabularies).Select(v => v.Vocabulary.Lemma).Distinct().ToArray();
            await _db.Vocabularies.Where(v => lemmas.Contains(v.Lemma)).LoadAsync();
            foreach (var group in groups)
            {
                group.ExamId = exam.ExamId;
                foreach (var question in group.Questions) question.ExamId = exam.ExamId;
                var (_, error) = await SaveGroupAsync(group, group.GroupId == 0 ? null : group.GroupId);
                if (error is not null) return (null, error);
            }
            await transaction.CommitAsync();
            return (exam, null);
        }
        catch (Exception ex) when (SqlError(ex, 1205)) { return (null, "CONCURRENT_CHANGE"); }
        catch (DbUpdateException ex) when (SqlError(ex, 2601) || SqlError(ex, 2627)) { return (null, "EXAM_CONTENT_CONFLICT"); }
    }

    private async Task<List<StoredGroupKey>> StoredKeysAsync(int examId)
    {
        var groups = await _db.QuestionGroups.AsNoTracking().Where(g => g.ExamId == examId && !g.IsDeleted)
            .Select(g => new { g.GroupId, g.PartNo, g.GroupOrder }).ToListAsync();
        var questions = (await _db.Questions.AsNoTracking().Where(q => q.ExamId == examId && !q.IsDeleted && !q.Group.IsDeleted)
            .Select(q => new { q.GroupId, q.QuestionId, q.QuestionNo }).ToListAsync()).ToLookup(q => q.GroupId);
        var clips = (await _db.ListeningClips.AsNoTracking().Where(c => !c.IsDeleted && !c.Item.IsDeleted && c.Item.GroupId.HasValue &&
                c.Item.Group!.ExamId == examId && !c.Item.Group.IsDeleted)
            .Select(c => new { GroupId = c.Item.GroupId!.Value, c.ClipId, c.SeqNo }).ToListAsync()).ToLookup(c => c.GroupId);
        return groups.Select(g => new StoredGroupKey(g.GroupId, g.PartNo, g.GroupOrder,
            questions[g.GroupId].Select(q => (q.QuestionId, q.QuestionNo)).ToList(),
            clips[g.GroupId].Select(c => (c.ClipId, c.SeqNo)).ToList())).ToList();
    }
}
