using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Services.Diagnostics;

namespace ToeicMind.Repositories.Exams;

public class ExamContentReader : IExamContentReader
{
    private readonly AppDbContext _db;
    private readonly RequestTimings _timings;

    public ExamContentReader(AppDbContext db, RequestTimings timings)
    {
        _db = db;
        _timings = timings;
    }

    public async Task<List<QuestionGroupDto>> ReadByExamAsync(int examId, byte? partNo)
    {
        var groups = await _timings.MeasureAsync("groups", () => _db.QuestionGroups.AsNoTracking()
            .Where(g => g.ExamId == examId && !g.IsDeleted && (!partNo.HasValue || g.PartNo == partNo.Value))
            .OrderBy(g => g.GroupOrder)
            .Select(g => new QuestionGroupDto
            {
                GroupId = g.GroupId, ExamId = g.ExamId, PartNo = g.PartNo, GroupOrder = g.GroupOrder,
                CategoryId = g.CategoryId, GroupLevelNo = g.GroupLevelNo, PassageHtml = g.PassageHtml,
                TranscriptEn = g.TranscriptEn, TranslationVi = g.TranslationVi
            }).ToListAsync());
        return await FillAsync(groups, false);
    }

    public async Task<List<QuestionGroupDto>> ReadByGroupIdsAsync(IReadOnlyCollection<int> groupIds, bool includeDeleted)
    {
        var ids = groupIds.Distinct().ToList();
        if (ids.Count == 0) return [];
        var groups = await _timings.MeasureAsync("groups", () => _db.QuestionGroups.AsNoTracking()
            .Where(g => ids.Contains(g.GroupId) && (includeDeleted || !g.IsDeleted))
            .OrderBy(g => g.ExamId).ThenBy(g => g.GroupOrder)
            .Select(g => new QuestionGroupDto
            {
                GroupId = g.GroupId, ExamId = g.ExamId, PartNo = g.PartNo, GroupOrder = g.GroupOrder,
                CategoryId = g.CategoryId, GroupLevelNo = g.GroupLevelNo, PassageHtml = g.PassageHtml,
                TranscriptEn = g.TranscriptEn, TranslationVi = g.TranslationVi
            }).ToListAsync());
        return await FillAsync(groups, includeDeleted);
    }

    public async Task<List<PlayGroupSource>> ReadPlayAsync(int examId, byte partNo)
    {
        var groups = await _timings.MeasureAsync("groups", () => _db.QuestionGroups.AsNoTracking()
            .Where(g => g.ExamId == examId && g.PartNo == partNo && !g.IsDeleted)
            .OrderBy(g => g.GroupOrder)
            .Select(g => new PlayGroupDto { GroupId = g.GroupId, ExamId = g.ExamId, PartNo = g.PartNo, GroupOrder = g.GroupOrder, PassageHtml = g.PassageHtml })
            .ToListAsync());
        return await FillPlayAsync(groups);
    }

    public async Task<List<PlayGroupSource>> ReadPlayByGroupIdsAsync(IReadOnlyCollection<int> groupIds)
    {
        var ids = groupIds.Distinct().ToList();
        if (ids.Count == 0) return [];
        var groups = await _timings.MeasureAsync("groups", () => _db.QuestionGroups.AsNoTracking()
            .Where(g => ids.Contains(g.GroupId) && !g.IsDeleted)
            .OrderBy(g => g.ExamId).ThenBy(g => g.GroupOrder)
            .Select(g => new PlayGroupDto { GroupId = g.GroupId, ExamId = g.ExamId, PartNo = g.PartNo, GroupOrder = g.GroupOrder, PassageHtml = g.PassageHtml })
            .ToListAsync());
        return await FillPlayAsync(groups);
    }

    // Bản nhẹ của FillAsync: chỉ câu hỏi, phương án và khóa media của nhóm (không lấy clip cắt).
    private async Task<List<PlayGroupSource>> FillPlayAsync(List<PlayGroupDto> groups)
    {
        if (groups.Count == 0) return [];
        var groupIds = groups.Select(g => g.GroupId).ToList();

        var questions = await _timings.MeasureAsync("questions", () => _db.Questions.AsNoTracking()
            .Where(q => groupIds.Contains(q.GroupId) && !q.IsDeleted)
            .Select(q => new { q.GroupId, Dto = new PlayQuestionDto { QuestionId = q.QuestionId, QuestionNo = q.QuestionNo, QuestionText = q.QuestionText } })
            .ToListAsync());
        var questionIds = questions.Select(q => q.Dto.QuestionId).ToList();

        var options = await _timings.MeasureAsync("options", () => _db.QuestionOptions.AsNoTracking()
            .Where(o => questionIds.Contains(o.QuestionId))
            .Select(o => new { o.QuestionId, Dto = new PlayOptionDto { OptionId = o.OptionId, OptionLabel = o.OptionLabel, OptionText = o.OptionText } })
            .ToListAsync());

        var groupMedia = await _timings.MeasureAsync("media", () => _db.Media.AsNoTracking()
            .Where(m => !m.IsDeleted && m.GroupId != null && groupIds.Contains(m.GroupId.Value))
            .Select(m => new { GroupId = m.GroupId!.Value, Media = new PlayMediaSource(m.MediaId, null, 0, m.MediaType, m.AltText, m.SortOrder, m.StorageKey) })
            .ToListAsync());

        return _timings.Measure("assemble", () =>
        {
            var questionsByGroup = questions.ToLookup(q => q.GroupId, q => q.Dto);
            var optionsByQuestion = options.ToLookup(o => o.QuestionId, o => o.Dto);
            var groupMediaByGroup = groupMedia.ToLookup(m => m.GroupId, m => m.Media);
            return groups.Select(group =>
            {
                group.Questions = questionsByGroup[group.GroupId].OrderBy(q => q.QuestionNo).ToList();
                foreach (var question in group.Questions)
                    question.Options = optionsByQuestion[question.QuestionId].OrderBy(o => o.OptionLabel).ToList();
                // Làm đề chỉ dùng audio/hình của chính nhóm câu hỏi; clip cắt dành riêng cho Nghe chép.
                var media = groupMediaByGroup[group.GroupId].OrderBy(m => m.SortOrder).ThenBy(m => m.MediaId).ToList();
                return new PlayGroupSource(group, media);
            }).ToList();
        });
    }

    public async Task<List<OutlineRow>> ReadOutlineAsync(int examId)
    {
        var groups = await _timings.MeasureAsync("outline.groups", () => _db.QuestionGroups.AsNoTracking()
            .Where(g => g.ExamId == examId && !g.IsDeleted)
            .Select(g => new { g.GroupId, g.PartNo, g.GroupOrder }).ToListAsync());
        var questions = await _timings.MeasureAsync("outline.questions", () => _db.Questions.AsNoTracking()
            .Where(q => q.ExamId == examId && !q.IsDeleted)
            .Select(q => new { q.GroupId, q.QuestionNo }).ToListAsync());
        var media = await _timings.MeasureAsync("outline.media", () => _db.Media.AsNoTracking()
            .Where(m => !m.IsDeleted && m.GroupId != null && m.Group!.ExamId == examId && !m.Group.IsDeleted)
            .Select(m => new { GroupId = m.GroupId!.Value, m.MediaType }).Distinct().ToListAsync());
        var questionsByGroup = questions.ToLookup(q => q.GroupId, q => q.QuestionNo);
        var audioGroups = media.Where(m => m.MediaType == "AUDIO").Select(m => m.GroupId).ToHashSet();
        var imageGroups = media.Where(m => m.MediaType == "IMAGE").Select(m => m.GroupId).ToHashSet();
        return groups.OrderBy(g => g.PartNo).ThenBy(g => g.GroupOrder).Select(g =>
        {
            var numbers = questionsByGroup[g.GroupId].ToList();
            return new OutlineRow(g.PartNo, new GroupOutlineDto
            {
                GroupId = g.GroupId, GroupOrder = g.GroupOrder,
                FirstQuestionNo = numbers.Count > 0 ? numbers.Min() : g.GroupOrder,
                QuestionCount = numbers.Count,
                HasAudio = audioGroups.Contains(g.GroupId), HasImage = imageGroups.Contains(g.GroupId)
            });
        }).ToList();
    }

    public async Task<List<ExamDirectionDto>> ReadDirectionsAsync(int examId)
    {
        var rows = await _timings.MeasureAsync("directions", () => _db.ExamDirections.AsNoTracking()
            .Where(d => !d.IsDeleted && d.ExamId == null)
            .Select(d => new ExamDirectionDto
            {
                DirectionId = d.DirectionId, ExamId = d.ExamId, DirectionKind = d.DirectionKind, Skill = d.Skill, PartNo = d.PartNo,
                DirectionsEn = d.DirectionsEn, DirectionsVi = d.DirectionsVi, ExampleEn = d.ExampleEn, ExampleVi = d.ExampleVi
            }).ToListAsync());
        var chosen = rows.GroupBy(d => new { d.DirectionKind, d.Skill, d.PartNo })
            .Select(g => g.OrderByDescending(d => d.ExamId.HasValue).First())
            .OrderBy(d => d.DirectionKind).ThenBy(d => d.Skill).ThenBy(d => d.PartNo).ToList();
        var ids = chosen.Select(d => d.DirectionId).ToList();
        var media = await _timings.MeasureAsync("directions.media", () => _db.Media.AsNoTracking()
            .Where(m => !m.IsDeleted && m.DirectionId != null && ids.Contains(m.DirectionId.Value))
            .OrderBy(m => m.SortOrder).ThenBy(m => m.MediaId)
            .Select(m => new { DirectionId = m.DirectionId!.Value, Dto = new MediaFileDto { MediaId = m.MediaId, MediaType = m.MediaType, StorageKey = m.StorageKey, AltText = m.AltText, SortOrder = m.SortOrder } })
            .ToListAsync());
        var byDirection = media.ToLookup(m => m.DirectionId, m => m.Dto);
        foreach (var d in chosen) d.Media = byDirection[d.DirectionId].ToList();
        return chosen;
    }

    // Nạp phần còn lại của các nhóm bằng mỗi bảng một truy vấn theo danh sách ID, rồi ghép trong bộ nhớ.
    private async Task<List<QuestionGroupDto>> FillAsync(List<QuestionGroupDto> groups, bool includeDeleted)
    {
        if (groups.Count == 0) return groups;
        var groupIds = groups.Select(g => g.GroupId).ToList();

        var tags = await _timings.MeasureAsync("tags", () => _db.QuestionGroupTags.AsNoTracking()
            .Where(t => groupIds.Contains(t.GroupId))
            .Select(t => new { t.GroupId, t.SpecialTagId }).ToListAsync());

        var questions = await _timings.MeasureAsync("questions", () => _db.Questions.AsNoTracking()
            .Where(q => groupIds.Contains(q.GroupId) && (includeDeleted || !q.IsDeleted))
            .Select(q => new
            {
                q.GroupId,
                Dto = new QuestionDto
                {
                    QuestionId = q.QuestionId, QuestionNo = q.QuestionNo, LevelNo = q.LevelNo, QuestionText = q.QuestionText,
                    Explanation = q.Explanation, OptionExplanations = q.OptionExplanations
                }
            }).ToListAsync());
        var questionIds = questions.Select(q => q.Dto.QuestionId).ToList();

        var options = await _timings.MeasureAsync("options", () => _db.QuestionOptions.AsNoTracking()
            .Where(o => questionIds.Contains(o.QuestionId))
            .Select(o => new
            {
                o.QuestionId,
                Dto = new QuestionOptionDto { OptionId = o.OptionId, OptionLabel = o.OptionLabel, OptionText = o.OptionText, IsCorrect = o.IsCorrect }
            }).ToListAsync());

        var vocabularies = await _timings.MeasureAsync("vocabulary", () => _db.VocabularyContexts.AsNoTracking()
            .Where(c => c.QuestionId != null && questionIds.Contains(c.QuestionId.Value) && !c.IsDeleted && !c.Vocabulary.IsDeleted)
            .OrderBy(c => c.ContextId)
            .Select(c => new
            {
                QuestionId = c.QuestionId!.Value,
                Dto = new QuestionVocabularyDto
                {
                    VocabId = c.VocabId, Term = c.SurfaceForm ?? c.Vocabulary.Lemma, Base = c.Vocabulary.Lemma,
                    Pos = c.Vocabulary.PosCode, Ipa = c.Vocabulary.IpaUs, Cefr = c.Vocabulary.CefrLevel,
                    MeaningBase = c.Vocabulary.MeaningVi, TermMeaningVi = c.ContextMeaningVi,
                    DefinitionEn = c.Vocabulary.DefinitionEn, ExampleEn = c.ExampleEn, ExampleVi = c.ExampleVi
                }
            }).ToListAsync());

        var clips = await _timings.MeasureAsync("clips", () => _db.ListeningClips.AsNoTracking()
            .Where(c => !c.IsDeleted && !c.Item.IsDeleted && c.Item.GroupId != null && groupIds.Contains(c.Item.GroupId.Value))
            .OrderBy(c => c.SeqNo)
            .Select(c => new
            {
                GroupId = c.Item.GroupId!.Value,
                Dto = new AudioSegmentDto
                {
                    ClipId = c.ClipId, Seq = c.SeqNo, ClipKey = c.ClipKey, Role = c.ClipRole,
                    Text = c.TranscriptEn, TranslationVi = c.TranslationVi, Speaker = c.Speaker,
                    SourceAudio = c.SourceAudio, ClipAudio = c.ClipAudio, TextSource = c.TextSource,
                    StartSec = c.StartSec, EndSec = c.EndSec, DurationSec = c.DurationSec
                }
            }).ToListAsync());
        var clipIds = clips.Select(c => c.Dto.ClipId).ToList();

        // Media của nhóm và của clip nằm chung bảng; một truy vấn lấy cả hai.
        var media = await _timings.MeasureAsync("media", () => _db.Media.AsNoTracking()
            .Where(m => !m.IsDeleted &&
                        ((m.GroupId != null && groupIds.Contains(m.GroupId.Value)) || (m.ClipId != null && clipIds.Contains(m.ClipId.Value))))
            .OrderBy(m => m.SortOrder).ThenBy(m => m.MediaId)
            .Select(m => new
            {
                m.GroupId, m.ClipId,
                Dto = new MediaFileDto { MediaId = m.MediaId, MediaType = m.MediaType, StorageKey = m.StorageKey, AltText = m.AltText, SortOrder = m.SortOrder }
            }).ToListAsync());

        _timings.Measure("assemble", () =>
        {
            var tagsByGroup = tags.ToLookup(t => t.GroupId, t => t.SpecialTagId);
            var questionsByGroup = questions.ToLookup(q => q.GroupId, q => q.Dto);
            var optionsByQuestion = options.ToLookup(o => o.QuestionId, o => o.Dto);
            var vocabByQuestion = vocabularies.ToLookup(v => v.QuestionId, v => v.Dto);
            var clipsByGroup = clips.ToLookup(c => c.GroupId, c => c.Dto);
            var mediaByGroup = media.Where(m => m.GroupId != null).ToLookup(m => m.GroupId!.Value, m => m.Dto);
            var mediaByClip = media.Where(m => m.ClipId != null).ToLookup(m => m.ClipId!.Value, m => m.Dto);

            foreach (var group in groups)
            {
                group.SpecialTagIds = tagsByGroup[group.GroupId].Order().ToList();
                group.Media = mediaByGroup[group.GroupId].ToList();
                group.AudioSegments = clipsByGroup[group.GroupId].ToList();
                foreach (var clip in group.AudioSegments) clip.Media = mediaByClip[clip.ClipId].ToList();
                group.Questions = questionsByGroup[group.GroupId].OrderBy(q => q.QuestionNo).ToList();
                foreach (var question in group.Questions)
                {
                    question.Options = optionsByQuestion[question.QuestionId].OrderBy(o => o.OptionLabel).ToList();
                    question.Vocabularies = vocabByQuestion[question.QuestionId].ToList();
                }
            }
            return 0;
        });
        return groups;
    }
}
