using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Catalogs;

[Table("SpecialTag", Schema = "dbo")]
public class SpecialTag
{
    [Key]
    public int SpecialTagId { get; set; }
    public byte PartNo { get; set; }
    [MaxLength(50), Column(TypeName = "varchar(50)")]
    public string Code { get; set; } = string.Empty;
    [MaxLength(100)]
    public string NameVi { get; set; } = string.Empty;
}
