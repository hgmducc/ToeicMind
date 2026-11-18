using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Learning;

/// <summary>Bảng quy đổi số câu đúng (0–100) sang điểm (5–495) cho từng kỹ năng LISTENING / READING.</summary>
[Table("ScoreConversion", Schema = "dbo")]
[PrimaryKey(nameof(Skill), nameof(CorrectCount))]
public class ScoreConversion
{
    [Column(TypeName = "varchar(10)")]
    public string Skill { get; set; } = string.Empty;
    public short CorrectCount { get; set; }
    public short ScaledScore { get; set; }
}
