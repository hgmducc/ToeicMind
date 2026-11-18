namespace ToeicMind.DTOs.Exams.Response;
public class QuestionGroupDto
{
    public List<AudioSegmentDto> AudioSegments { get; set; } = [];
    public int GroupId { get; set; }
    public int ExamId { get; set; }
    public byte PartNo { get; set; }
    public short GroupOrder { get; set; }
    public int CategoryId { get; set; }
    public byte? GroupLevelNo { get; set; }
    public string? PassageHtml { get; set; }
    public string? TranscriptEn { get; set; }
    public string? TranslationVi { get; set; }
    public List<int> SpecialTagIds { get; set; } = [];
    public List<QuestionDto> Questions { get; set; } = [];
    public List<MediaFileDto> Media { get; set; } = [];
}
