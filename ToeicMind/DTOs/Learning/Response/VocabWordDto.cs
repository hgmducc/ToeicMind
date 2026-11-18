namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một từ vựng kèm tiến độ học. Status: NEW (chưa học), LEARNING, MASTERED.</summary>
public class VocabWordDto
{
    public int VocabId { get; set; }
    public string Lemma { get; set; } = string.Empty;
    public string PosCode { get; set; } = string.Empty;
    public string? IpaUs { get; set; }
    public string? IpaUk { get; set; }
    public string CefrLevel { get; set; } = string.Empty;
    public string MeaningVi { get; set; } = string.Empty;
    public string? DefinitionEn { get; set; }
    public string Status { get; set; } = "NEW";
    public bool IsDue { get; set; }
    public int IntervalDays { get; set; }
    public short Repetitions { get; set; }
    public short Lapses { get; set; }
    public DateTime? NextReviewAt { get; set; }
    public DateTime? LastReviewedAt { get; set; }
}
