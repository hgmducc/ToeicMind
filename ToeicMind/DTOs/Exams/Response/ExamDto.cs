using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Exams.Response;

public class ExamDto
{
    public int ExamId { get; set; }
    public int ExamSetId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    /// <summary>Ghi đè quyền làm đề (FREE/VIP) hoặc null = theo bộ đề.</summary>
    public string? AccessLevel { get; set; }
    /// <summary>Quyền làm đề thực tế: FREE hoặc VIP.</summary>
    public string EffectiveAccess { get; set; } = "FREE";
    /// <summary>Chỉ có trong danh sách của người học: đề VIP mà người dùng hiện tại chưa có quyền (khách coi như chưa có).</summary>
    public bool IsLocked { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<VocabularyImportNoticeDto>? ImportWarnings { get; set; }
}
