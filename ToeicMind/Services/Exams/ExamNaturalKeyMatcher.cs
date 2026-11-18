using ToeicMind.Models.Exams;

namespace ToeicMind.Services.Exams;

/// <summary>Khớp nội dung gửi lên (không có ID) với dữ liệu đã lưu theo khóa tự nhiên để cập nhật tại chỗ thay vì tạo lại.</summary>
public static class ExamNaturalKeyMatcher
{
    // Gán lại ID đã lưu cho nội dung gửi lên không kèm ID (file Excel/JSON không chứa ID database)
    // để lớp lưu cập nhật tại chỗ thay vì xóa mềm rồi thêm mới; media gắn với GroupId/ClipId nhờ vậy được giữ nguyên.
    public static void Match(IEnumerable<QuestionGroup> incoming, IReadOnlyList<StoredGroupKey> stored)
    {
        var groups = incoming.ToList();
        var usedGroups = groups.Where(g => g.GroupId != 0).Select(g => g.GroupId).ToHashSet();
        foreach (var group in groups.Where(g => g.GroupId == 0))
        {
            var match = stored.FirstOrDefault(s => s.PartNo == group.PartNo && s.GroupOrder == group.GroupOrder && !usedGroups.Contains(s.GroupId));
            if (match is null) continue;
            group.GroupId = match.GroupId;
            usedGroups.Add(match.GroupId);
        }
        foreach (var group in groups.Where(g => g.GroupId != 0))
        {
            var key = stored.FirstOrDefault(s => s.GroupId == group.GroupId);
            if (key is null) continue;
            foreach (var question in group.Questions.Where(q => q.QuestionId == 0))
                question.QuestionId = key.Questions.FirstOrDefault(s => s.QuestionNo == question.QuestionNo).QuestionId;
            foreach (var clip in group.ListeningItems.SelectMany(i => i.Clips).Where(c => c.ClipId == 0))
                clip.ClipId = key.Clips.FirstOrDefault(s => s.SeqNo == clip.SeqNo).ClipId;
        }
    }

    // Khớp ngữ cảnh từ theo (từ vựng, dạng xuất hiện): sửa tại chỗ, thêm mục mới, chỉ xóa mềm mục không còn trong danh sách.
    public static void SyncVocabularies(Question stored, Question incoming)
    {
        var kept = new HashSet<VocabularyContext>();
        foreach (var context in incoming.Vocabularies)
        {
            var old = stored.Vocabularies.FirstOrDefault(v => !v.IsDeleted && !kept.Contains(v) && v.VocabId == context.Vocabulary.VocabId &&
                string.Equals(v.SurfaceForm, context.SurfaceForm, StringComparison.OrdinalIgnoreCase));
            if (old is null) { stored.Vocabularies.Add(context); kept.Add(context); continue; }
            old.ContextMeaningVi = context.ContextMeaningVi;
            old.ExampleEn = context.ExampleEn;
            old.ExampleVi = context.ExampleVi;
            kept.Add(old);
        }
        foreach (var old in stored.Vocabularies.Where(v => !v.IsDeleted && !kept.Contains(v)))
        { old.IsDeleted = true; old.DeletedAt = DateTime.UtcNow; }
    }
}
