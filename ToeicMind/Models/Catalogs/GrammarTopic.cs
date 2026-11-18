using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Catalogs;

/// <summary>Chủ điểm ngữ pháp (15 chủ điểm của Part 5). Mỗi chủ điểm ứng với đúng một phân loại lá trong QuestionCategory (CategoryId).</summary>
[Table("GrammarTopic", Schema = "dbo")]
public class GrammarTopic
{
    [Key]
    public int GrammarTopicId { get; set; }
    public int CategoryId { get; set; }
    public byte PartNo { get; set; }
    public byte SortOrder { get; set; }
    [MaxLength(500)]
    public string? Summary { get; set; }
}
