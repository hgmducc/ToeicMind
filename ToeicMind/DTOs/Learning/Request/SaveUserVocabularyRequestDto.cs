using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Lưu một từ vào bộ từ cá nhân: hoặc VocabId (từ hệ thống), hoặc CustomWord + CustomMeaning (từ tự thêm).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveUserVocabularyRequestDto
{
    [Range(1, int.MaxValue)]
    public int? VocabId { get; set; }
    [MaxLength(100)]
    public string? CustomWord { get; set; }
    [MaxLength(500)]
    public string? CustomMeaning { get; set; }
    [MaxLength(1000)]
    public string? CustomExample { get; set; }
    [Range(1, int.MaxValue)]
    public int? SourceQuestionId { get; set; }
}
