namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một nhóm khi xem lại: đoạn văn, transcript, bản dịch, media và các câu.</summary>
public class ReviewGroupDto
{
    public int GroupId { get; set; }
    public byte PartNo { get; set; }
    public string? PassageHtml { get; set; }
    public string? TranscriptEn { get; set; }
    public string? TranslationVi { get; set; }
    public List<PlayMediaDto> Media { get; set; } = [];
    public List<ReviewQuestionDto> Questions { get; set; } = [];
}
