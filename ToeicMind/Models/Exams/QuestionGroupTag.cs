using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

[Table("QuestionGroupTag", Schema = "dbo")]
[PrimaryKey(nameof(GroupId), nameof(SpecialTagId))]
public class QuestionGroupTag
{
    public int GroupId { get; set; }
    public int SpecialTagId { get; set; }
    public byte PartNo { get; set; }
    [ForeignKey(nameof(GroupId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public QuestionGroup Group { get; set; } = null!;
}
