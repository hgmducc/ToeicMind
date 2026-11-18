using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Learning;

/// <summary>Từ trong bộ từ cá nhân: hoặc tham chiếu từ hệ thống (VocabId), hoặc từ tự thêm (CustomWord + CustomMeaning).</summary>
[Table("UserVocabulary", Schema = "dbo")]
public class UserVocabulary
{
    [Key]
    public int UserVocabId { get; set; }
    public int UserId { get; set; }
    public int? VocabId { get; set; }
    [MaxLength(100)]
    public string? CustomWord { get; set; }
    [MaxLength(500)]
    public string? CustomMeaning { get; set; }
    [MaxLength(1000)]
    public string? CustomExample { get; set; }
    public int? SourceQuestionId { get; set; }
    public int? SourceClipId { get; set; }
    public int? SourceVocabGroupId { get; set; }
    public DateTime CreatedAt { get; set; }
}
