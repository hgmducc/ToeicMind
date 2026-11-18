using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Catalogs;

[Table("QuestionCategory", Schema = "dbo")]
public class QuestionCategory
{
    [Key]
    public int CategoryId { get; set; }
    public byte PartNo { get; set; }
    public int? ParentCategoryId { get; set; }
    [MaxLength(50), Column(TypeName = "varchar(50)")]
    public string Code { get; set; } = string.Empty;
    [MaxLength(100)]
    public string NameVi { get; set; } = string.Empty;
    [MaxLength(200)]
    public string? NameEn { get; set; }
    public short SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
