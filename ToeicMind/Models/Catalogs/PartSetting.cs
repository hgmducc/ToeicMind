using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Catalogs;

[Table("PartSetting", Schema = "dbo")]
public class PartSetting
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.None)]
    public byte PartNo { get; set; }
    [MaxLength(100)]
    public string PartName { get; set; } = string.Empty;
    [Column(TypeName = "varchar(10)")]
    public string Skill { get; set; } = string.Empty;
    public short StandardQuestionCount { get; set; }
    public byte OptionCount { get; set; }
    public short? DefaultSecondsPerQuestion { get; set; }
    public byte? AudioPlayLimit { get; set; }
}
