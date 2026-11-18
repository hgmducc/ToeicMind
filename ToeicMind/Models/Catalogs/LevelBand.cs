using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Catalogs;

[Table("LevelBand", Schema = "dbo")]
public class LevelBand
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.None)]
    public byte LevelNo { get; set; }
    [MaxLength(50)]
    public string NameVi { get; set; } = string.Empty;
    [MaxLength(20)]
    public string ShortLabel { get; set; } = string.Empty;
}
