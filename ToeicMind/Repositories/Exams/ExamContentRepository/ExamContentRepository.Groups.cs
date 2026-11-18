using Microsoft.EntityFrameworkCore;
using ToeicMind.Models.Exams;
using ToeicMind.Services.Exams;

namespace ToeicMind.Repositories.Exams;

// Nhóm câu hỏi, câu hỏi, phương án, từ vựng và audio clip.
public partial class ExamContentRepository
{
    private IQueryable<QuestionGroup> Groups() => _db.QuestionGroups.AsNoTracking().AsSplitQuery()
        .Include(g => g.Questions).ThenInclude(q => q.Options)
        .Include(g => g.Questions).ThenInclude(q => q.Vocabularies).ThenInclude(v => v.Vocabulary)
        .Include(g => g.ListeningItems).ThenInclude(i => i.Clips).ThenInclude(c => c.Media)
        .Include(g => g.Tags).Include(g => g.Media);

    public Task<List<QuestionGroup>> GetGroupsAsync(int examId, byte? partNo) =>
        Groups().Where(g => g.ExamId == examId && !g.IsDeleted && !g.Exam.IsDeleted && (!partNo.HasValue || g.PartNo == partNo.Value))
            .OrderBy(g => g.GroupOrder).ToListAsync();

    public Task<QuestionGroup?> GetGroupAsync(int examId, int groupId) =>
        Groups().FirstOrDefaultAsync(g => g.ExamId == examId && g.GroupId == groupId && !g.IsDeleted && !g.Exam.IsDeleted);

    public Task<ListeningClip?> GetClipAsync(int examId, int groupId, int clipId) =>
        _db.ListeningClips.AsNoTracking().Include(c => c.Item).ThenInclude(i => i.Group)
            .FirstOrDefaultAsync(c => c.ClipId == clipId && !c.IsDeleted && !c.Item.IsDeleted &&
                c.Item.GroupId == groupId && !c.Item.Group!.IsDeleted && c.Item.Group.ExamId == examId && !c.Item.Group.Exam.IsDeleted);

    public Task<(QuestionGroup? Result, string? Error)> SaveGroupAsync(QuestionGroup requested, int? groupId) =>
        ChangeAsync<QuestionGroup>(requested.ExamId, async () =>
        {
            var category = await _db.QuestionCategories.AsNoTracking().FirstOrDefaultAsync(c => c.CategoryId == requested.CategoryId && c.PartNo == requested.PartNo && c.IsActive);
            if (category is null || await _db.QuestionCategories.AnyAsync(c => c.ParentCategoryId == requested.CategoryId))
                return (null, "CATEGORY_MUST_BE_ACTIVE_LEAF");
            var tagIds = requested.Tags.Select(t => t.SpecialTagId).ToArray();
            if (await _db.SpecialTags.CountAsync(t => tagIds.Contains(t.SpecialTagId) && t.PartNo == requested.PartNo) != tagIds.Length)
                return (null, "SPECIAL_TAG_INVALID");
            await ResolveVocabularyAsync(requested.Questions);
            if (!groupId.HasValue)
            {
                _db.QuestionGroups.Add(requested);
                return (requested, null);
            }
            var group = await _db.QuestionGroups.Include(g => g.Questions).ThenInclude(q => q.Options)
                .Include(g => g.Questions).ThenInclude(q => q.Vocabularies)
                .Include(g => g.ListeningItems).ThenInclude(i => i.Clips).ThenInclude(c => c.Media)
                .Include(g => g.Tags).Include(g => g.Media)
                .FirstOrDefaultAsync(g => g.GroupId == groupId && g.ExamId == requested.ExamId && !g.IsDeleted);
            if (group is null) return (null, "GROUP_NOT_FOUND");
            if (group.PartNo != requested.PartNo) return (null, "GROUP_PART_IMMUTABLE");
            foreach (var incoming in requested.Questions)
            {
                var old = group.Questions.FirstOrDefault(q => q.QuestionId == incoming.QuestionId && !q.IsDeleted);
                if (incoming.QuestionId != 0 && old is null) return (null, "QUESTION_NOT_IN_GROUP");
                if (old is not null && old.Options.Any(o => incoming.Options.All(n => n.OptionLabel != o.OptionLabel)))
                    return (null, "OPTION_REMOVAL_NOT_ALLOWED");
            }
            // Hạ cờ đúng trước để đổi đáp án không va unique index ở trạng thái trung gian.
            foreach (var option in group.Questions.SelectMany(q => q.Options)) option.IsCorrect = false;
            await _db.SaveChangesAsync();
            group.GroupOrder = requested.GroupOrder;
            group.CategoryId = requested.CategoryId;
            group.GroupLevelNo = requested.GroupLevelNo;
            group.PassageHtml = requested.PassageHtml;
            group.TranscriptEn = requested.TranscriptEn;
            group.TranslationVi = requested.TranslationVi;
            group.UpdatedAt = DateTime.UtcNow;
            foreach (var old in group.Questions.Where(q => !q.IsDeleted && requested.Questions.All(n => n.QuestionId != q.QuestionId)))
            {
                old.IsDeleted = true;
                old.DeletedAt = old.UpdatedAt = DateTime.UtcNow;
            }
            foreach (var incoming in requested.Questions)
            {
                var old = group.Questions.FirstOrDefault(q => q.QuestionId == incoming.QuestionId && incoming.QuestionId != 0);
                if (old is null) { group.Questions.Add(incoming); continue; }
                old.QuestionNo = incoming.QuestionNo;
                old.LevelNo = incoming.LevelNo;
                old.QuestionText = incoming.QuestionText;
                old.Explanation = incoming.Explanation;
                old.OptionExplanations = incoming.OptionExplanations;
                old.UpdatedAt = DateTime.UtcNow;
                if (incoming.ReplaceVocabularies) ExamNaturalKeyMatcher.SyncVocabularies(old, incoming);
                foreach (var option in incoming.Options)
                {
                    var stored = old.Options.FirstOrDefault(o => o.OptionLabel == option.OptionLabel);
                    if (stored is null) old.Options.Add(option);
                    else { stored.OptionText = option.OptionText; stored.IsCorrect = option.IsCorrect; }
                }
            }
            _db.QuestionGroupTags.RemoveRange(group.Tags.Where(t => !tagIds.Contains(t.SpecialTagId)));
            foreach (var tag in requested.Tags.Where(t => group.Tags.All(old => old.SpecialTagId != t.SpecialTagId))) group.Tags.Add(tag);
            if (requested.ReplaceAudioSegments)
            {
                var error = await ReplaceSegmentsAsync(group, requested);
                if (error is not null) return (null, error);
            }
            return (group, null);
        });

    private async Task ResolveVocabularyAsync(List<Question> questions)
    {
        var contexts = questions.SelectMany(q => q.Vocabularies).ToList();
        var lemmas = contexts.Select(c => c.Vocabulary.Lemma).Distinct().ToArray();
        if (lemmas.Length > 0) await _db.Vocabularies.Where(v => lemmas.Contains(v.Lemma)).LoadAsync();
        foreach (var context in contexts)
        {
            var incoming = context.Vocabulary;
            var stored = _db.Vocabularies.Local.FirstOrDefault(v => string.Equals(v.Lemma, incoming.Lemma, StringComparison.OrdinalIgnoreCase) && v.PosCode == incoming.PosCode);
            // DB-DEC-21: dùng lại từ và giữ nghĩa đầu tiên, kể cả khi khôi phục từ đã xóa.
            if (stored is null) { stored = incoming; _db.Vocabularies.Add(stored); }
            if (stored.IsDeleted) stored.UpdatedAt = DateTime.UtcNow;
            stored.IsDeleted = false;
            stored.DeletedAt = null;
            context.Vocabulary = stored;
        }
    }

    private async Task<string?> ReplaceSegmentsAsync(QuestionGroup group, QuestionGroup requested)
    {
        var item = group.ListeningItems.FirstOrDefault(i => !i.IsDeleted);
        var incoming = requested.ListeningItems.SelectMany(i => i.Clips).ToList();
        if (item is null)
        {
            if (incoming.Any(c => c.ClipId != 0)) return "CLIP_NOT_FOUND";
            group.ListeningItems.AddRange(requested.ListeningItems);
            return null;
        }
        if (incoming.Any(c => c.ClipId != 0 && item.Clips.All(old => old.ClipId != c.ClipId || old.IsDeleted))) return "CLIP_NOT_FOUND";
        foreach (var old in item.Clips.Where(old => !old.IsDeleted && incoming.All(c => c.ClipId != old.ClipId)).ToList())
        {
            old.IsDeleted = true;
            old.DeletedAt = DateTime.UtcNow;
            foreach (var media in old.Media.Where(m => !m.IsDeleted)) { media.IsDeleted = true; media.DeletedAt = DateTime.UtcNow; }
        }
        await _db.SaveChangesAsync();
        foreach (var clip in incoming)
        {
            var old = item.Clips.FirstOrDefault(c => c.ClipId == clip.ClipId && clip.ClipId != 0);
            if (old is null) { item.Clips.Add(clip); continue; }
            old.SeqNo = clip.SeqNo; old.ClipKey = clip.ClipKey; old.ClipRole = clip.ClipRole;
            old.TranscriptEn = clip.TranscriptEn; old.TranslationVi = clip.TranslationVi; old.Speaker = clip.Speaker;
            old.SourceAudio = clip.SourceAudio; old.ClipAudio = clip.ClipAudio; old.TextSource = clip.TextSource;
            old.StartSec = clip.StartSec; old.EndSec = clip.EndSec; old.DurationSec = clip.DurationSec;
        }
        item.UpdatedAt = DateTime.UtcNow;
        return null;
    }

    public async Task<string?> DeleteGroupAsync(int examId, int groupId)
    {
        var (_, error) = await ChangeAsync<QuestionGroup>(examId, async () =>
        {
            var group = await _db.QuestionGroups.Include(g => g.Questions).Include(g => g.Media)
                .Include(g => g.ListeningItems).ThenInclude(i => i.Clips).ThenInclude(c => c.Media)
                .FirstOrDefaultAsync(g => g.ExamId == examId && g.GroupId == groupId);
            if (group is null) return (null, "GROUP_NOT_FOUND");
            group.IsDeleted = true;
            group.DeletedAt ??= DateTime.UtcNow;
            group.UpdatedAt = DateTime.UtcNow;
            foreach (var question in group.Questions.Where(q => !q.IsDeleted))
            { question.IsDeleted = true; question.DeletedAt = question.UpdatedAt = DateTime.UtcNow; }
            foreach (var media in group.Media.Where(m => !m.IsDeleted)) { media.IsDeleted = true; media.DeletedAt = DateTime.UtcNow; }
            foreach (var item in group.ListeningItems.Where(i => !i.IsDeleted))
            {
                item.IsDeleted = true; item.DeletedAt = item.UpdatedAt = DateTime.UtcNow;
                foreach (var clip in item.Clips.Where(c => !c.IsDeleted))
                {
                    clip.IsDeleted = true; clip.DeletedAt = DateTime.UtcNow;
                    foreach (var media in clip.Media.Where(m => !m.IsDeleted)) { media.IsDeleted = true; media.DeletedAt = DateTime.UtcNow; }
                }
            }
            return (group, null);
        });
        return error;
    }

}
