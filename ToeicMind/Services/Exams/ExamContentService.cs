using Ganss.Xss;
using ToeicMind.DTOs.Exams.Request;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Exams;

namespace ToeicMind.Services.Exams;

/// <summary>Nghiệp vụ nội dung đề: kiểm tra dữ liệu, làm sạch HTML, chuyển DTO sang entity rồi giao Repository lưu; nhập cả đề; xuất bản.</summary>
public class ExamContentService : IExamContentService
{
    private readonly IExamContentRepository _repo;
    private readonly IExamRepository _exams;
    private readonly IExamContentReader _reader;
    private readonly HtmlSanitizer _html = new();

    public ExamContentService(IExamContentRepository repo, IExamRepository exams, IExamContentReader reader)
    {
        _repo = repo;
        _exams = exams;
        _reader = reader;
    }

    public Task<ExamCatalogDto> GetCatalogAsync() => _repo.GetCatalogAsync();

    public async Task<(IReadOnlyList<QuestionGroupDto>? Result, string? Error)> GetGroupsAsync(int examId, byte? partNo)
    {
        var exam = await _exams.GetExamAsync(examId, false);
        if (exam is null || exam.IsDeleted) return (null, "EXAM_NOT_FOUND");
        // Đọc bằng truy vấn phẳng (mỗi bảng một lần) thay cho nạp cả đồ thị entity: nhanh hơn nhiều với đề 200 câu.
        return (await _reader.ReadByExamAsync(examId, partNo), null);
    }

    private QuestionGroup MapGroup(int examId, SaveGroupRequestDto dto)
    {
        var now = DateTime.UtcNow;
        return new QuestionGroup
        {
            ExamId = examId,
            PartNo = dto.PartNo,
            GroupOrder = dto.Questions.Count > 0 ? dto.Questions.Min(q => q.QuestionNo) : dto.GroupOrder!.Value,
            CategoryId = dto.CategoryId,
            GroupLevelNo = dto.GroupLevelNo,
            PassageHtml = Optional(dto.PassageHtml) is { } passage ? _html.Sanitize(passage) : null,
            TranscriptEn = Optional(dto.TranscriptEn),
            TranslationVi = Lines(dto.TranslationVi),
            CreatedAt = now,
            UpdatedAt = now,
            Tags = dto.SpecialTagIds.Select(id => new QuestionGroupTag { SpecialTagId = id, PartNo = dto.PartNo }).ToList(),
            ReplaceAudioSegments = dto.AudioSegments is not null,
            ListeningItems = dto.AudioSegments is not { Count: > 0 } ? [] : [new ListeningItem
            {
                PartNo = dto.PartNo, CreatedAt = now, UpdatedAt = now,
                Clips = dto.AudioSegments.Select(s => new ListeningClip
                {
                    ClipId = s.ClipId ?? 0, PartNo = dto.PartNo, SeqNo = s.Seq, ClipKey = s.ClipKey.Trim(),
                    ClipRole = s.Role, TranscriptEn = s.Text.Trim(), TranslationVi = Lines(s.TranslationVi),
                    Speaker = Optional(s.Speaker), SourceAudio = Optional(s.SourceAudio), ClipAudio = Optional(s.ClipAudio),
                    TextSource = Optional(s.TextSource), StartSec = s.StartSec, EndSec = s.EndSec, DurationSec = s.DurationSec, CreatedAt = now
                }).ToList()
            }],
            Questions = dto.Questions.Select(q => new Question
            {
                QuestionId = q.QuestionId ?? 0,
                ExamId = examId,
                QuestionNo = q.QuestionNo,
                LevelNo = q.LevelNo,
                QuestionText = Optional(q.QuestionText),
                Explanation = Optional(q.Explanation),
                OptionExplanations = Optional(q.OptionExplanations),
                CreatedAt = now,
                UpdatedAt = now,
                ReplaceVocabularies = q.Vocabularies is not null,
                Vocabularies = q.Vocabularies?.Select(v => new VocabularyContext
                {
                    SurfaceForm = v.Term.Trim(),
                    ContextMeaningVi = Optional(v.TermMeaningVi),
                    ExampleEn = Optional(v.ExampleEn),
                    ExampleVi = Optional(v.ExampleVi),
                    Vocabulary = new Vocabulary
                    {
                        Lemma = v.Base.Trim(),
                        PosCode = v.Pos,
                        IpaUs = Optional(v.Ipa),
                        CefrLevel = v.Cefr,
                        MeaningVi = v.MeaningBase.Trim(),
                        DefinitionEn = Optional(v.DefinitionEn),
                        CreatedAt = now,
                        UpdatedAt = now
                    }
                }).ToList() ?? [],
                Options = q.Options.Select(o => new QuestionOption { OptionLabel = o.OptionLabel, OptionText = o.OptionText, IsCorrect = o.IsCorrect }).ToList()
            }).ToList()
        };
    }

    public async Task<(ExamDto? Result, string? Error, List<ExamIssueDto> Issues)> SavePackageAsync(int? examId, SaveExamContentRequestDto dto, int userId)
    {
        var issues = dto.Groups.SelectMany(g => ExamContentValidator.Validate(g)).ToList();
        if (dto.Groups.Select(g => g.Questions.Count > 0 ? g.Questions.Min(q => q.QuestionNo) : g.GroupOrder).Distinct().Count() != dto.Groups.Count ||
            dto.Groups.SelectMany(g => g.Questions).GroupBy(q => q.QuestionNo).Any(g => g.Count() > 1))
            issues.Add(new() { Code = "QUESTION_NUMBER_DUPLICATE", Message = "Trùng số câu hoặc thứ tự nhóm trong đề." });
        if (dto.Groups.Where(g => g.GroupId.HasValue).GroupBy(g => g.GroupId).Any(g => g.Count() > 1) ||
            !examId.HasValue && dto.Groups.Any(g => g.GroupId.HasValue || g.Questions.Any(q => q.QuestionId.HasValue) || g.AudioSegments?.Any(s => s.ClipId.HasValue) == true))
            issues.Add(new() { Code = "IMPORT_ID_INVALID", Message = "ID nội dung không hợp lệ cho thao tác nhập mới." });
        var source = dto.SourceSheets is null ? null : System.Text.Json.JsonSerializer.Serialize(dto.SourceSheets);
        if (source?.Length > 5_000_000 || dto.SourceSheets?.Any(s => s.Value.ValueKind != System.Text.Json.JsonValueKind.Array) == true)
            issues.Add(new() { Code = "IMPORT_SOURCE_INVALID", Message = "Các sheet nguồn phải là mảng dữ liệu, tổng tối đa 5 MB." });
        if (issues.Count > 0) return (null, "EXAM_CONTENT_INVALID", issues);
        var now = DateTime.UtcNow;
        // Nhập lại vào đề đã có mà không gửi mã đề thì giữ mã hiện tại, không sinh mã ngẫu nhiên mới.
        string examCode;
        if (!string.IsNullOrWhiteSpace(dto.ExamCode)) examCode = dto.ExamCode.Trim().ToUpperInvariant();
        else if (examId.HasValue && await _exams.GetExamAsync(examId.Value, false) is { } existing) examCode = existing.ExamCode;
        else examCode = $"EXAM-{Guid.NewGuid():N}"[..30];
        var exam = new Exam
        {
            ExamId = examId ?? 0,
            ExamSetId = dto.ExamSetId,
            ExamCode = examCode,
            Title = dto.Title.Trim(),
            Description = Optional(dto.Description),
            AccessLevel = dto.AccessLevel,
            CreatedBy = userId,
            CreatedAt = now,
            UpdatedAt = now,
            ImportSourceJson = source
        };
        var groups = dto.Groups.Select(g => { var mapped = MapGroup(exam.ExamId, g); mapped.GroupId = g.GroupId ?? 0; return mapped; }).ToList();
        // Repository dùng lại Vocabulary; giữ giá trị đầu vào để báo cáo các nghĩa được bảo toàn.
        var vocabularyRows = groups.SelectMany(g => g.Questions).SelectMany(q => q.Vocabularies.Select(c =>
            new { q.QuestionNo, Context = c, MeaningBase = c.Vocabulary.MeaningVi })).ToList();
        var (saved, error) = await _repo.SavePackageAsync(exam, groups);
        if (saved is null) return (null, error, []);
        // Đọc lại để có quyền làm đề thực tế (gồm quyền kế thừa từ bộ đề).
        var result = ExamMapper.ToDto(await _exams.GetExamAsync(saved.ExamId, false) ?? saved);
        result.ImportWarnings = vocabularyRows.Where(r => r.MeaningBase != r.Context.Vocabulary.MeaningVi)
            .Select(r => new VocabularyImportNoticeDto
            {
                QuestionNo = r.QuestionNo,
                Term = r.Context.SurfaceForm!,
                Base = r.Context.Vocabulary.Lemma,
                Pos = r.Context.Vocabulary.PosCode,
                ImportedMeaningBase = r.MeaningBase,
                StoredMeaningBase = r.Context.Vocabulary.MeaningVi,
                Message = $"Câu {r.QuestionNo}, {r.Context.SurfaceForm} ({r.Context.Vocabulary.Lemma}/{r.Context.Vocabulary.PosCode}): giữ nghĩa gốc “{r.Context.Vocabulary.MeaningVi}” thay cho “{r.MeaningBase}”. Nghĩa theo ngữ cảnh vẫn được lưu riêng."
            }).ToList();
        return (result, null, []);
    }

    public Task<string?> GetImportSourceAsync(int examId) => _repo.GetImportSourceAsync(examId);

    public async Task<List<ExamDirectionDto>> GetDirectionsAsync(int? examId, bool effective) =>
        (await _repo.GetDirectionsAsync(examId, effective)).Select(ExamContentMapper.ToDto).ToList();

    public async Task<(ExamDirectionDto? Result, string? Error)> SaveDirectionAsync(int? id, SaveDirectionRequestDto dto)
    {
        if (dto.DirectionKind == "SECTION" && (dto.Skill is null || dto.PartNo.HasValue) ||
            dto.DirectionKind == "PART" && (!dto.PartNo.HasValue || dto.Skill is not null)) return (null, "DIRECTION_KEY_INVALID");
        var now = DateTime.UtcNow;
        var direction = new ExamDirection
        {
            ExamId = dto.ExamId,
            DirectionKind = dto.DirectionKind,
            Skill = dto.Skill,
            PartNo = dto.PartNo,
            DirectionsEn = dto.DirectionsEn.Trim(),
            DirectionsVi = Optional(dto.DirectionsVi),
            ExampleEn = Optional(dto.ExampleEn),
            ExampleVi = Optional(dto.ExampleVi),
            CreatedAt = now,
            UpdatedAt = now
        };
        var (result, error) = await _repo.SaveDirectionAsync(direction, id);
        return (result is null ? null : ExamContentMapper.ToDto(result), error);
    }

    public Task<(int Inserted, List<ExamDirectionDto> Directions)> SeedDefaultDirectionsAsync() =>
        _repo.SeedDefaultDirectionsAsync();

    public async Task<List<ExamIssueDto>> ValidatePublishAsync(int examId)
    {
        var issues = await _repo.ValidatePublishAsync(examId);
        issues.AddRange(ValidateStored(await _repo.GetGroupsAsync(examId, null)));
        return issues;
    }

    public Task<List<ExamIssueDto>> PublishAsync(int examId) => _repo.PublishAsync(examId, ValidateStored);
    public Task<string?> UnpublishAsync(int examId) => _repo.UnpublishAsync(examId);

    private static List<ExamIssueDto> ValidateStored(IReadOnlyList<QuestionGroup> groups)
    {
        var issues = new List<ExamIssueDto>();
        foreach (var group in groups)
            foreach (var question in group.Questions.Where(q => !q.IsDeleted && !string.IsNullOrWhiteSpace(q.OptionExplanations)))
            {
                var options = question.Options.Select(o => new SaveQuestionOptionRequestDto
                { OptionLabel = o.OptionLabel, OptionText = o.OptionText, IsCorrect = o.IsCorrect }).ToList();
                if (!ExamContentValidator.ValidExplanations(question.OptionExplanations!, group.PartNo == 2 ? "ABC" : "ABCD", options))
                    issues.Add(new()
                    {
                        Code = "OPTION_EXPLANATIONS_INVALID",
                        Message = $"Câu {question.QuestionNo}: nhãn giải thích không khớp đáp án.",
                        PartNo = group.PartNo,
                        GroupId = group.GroupId,
                        QuestionId = question.QuestionId
                    });
            }
        return issues;
    }

    private static string? Optional(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    /// <summary>Văn bản nhiều dòng (bản dịch): bỏ dòng trắng và khoảng trắng đầu/cuối mỗi dòng, xuống dòng chuẩn hóa thành \n.
    /// File Excel thường có dòng trống giữa các đáp án (A), (B)… làm bản dịch hiển thị thừa khoảng trống.</summary>
    private static string? Lines(string? text) =>
        Optional(text is null ? null : string.Join('\n', text.ReplaceLineEndings("\n").Split('\n').Select(line => line.Trim()).Where(line => line.Length > 0)));
}
