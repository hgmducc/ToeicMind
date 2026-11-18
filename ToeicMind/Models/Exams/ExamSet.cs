using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

[Table("ExamSet", Schema = "dbo")]
public class ExamSet
{
    [Key]
    public int ExamSetId { get; set; }

    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    /// <summary>Quyền theo từng tính năng của bộ đề (FREE hoặc VIP): làm đề, từ vựng, Nghe (Nghe chép, ngân hàng Part 1–4), Đọc (ngân hàng Part 5–7, Ngữ pháp).</summary>
    [MaxLength(10), Column(TypeName = "varchar(10)")]
    public string ExamAccess { get; set; } = Access.Free;

    [MaxLength(10), Column(TypeName = "varchar(10)")]
    public string VocabAccess { get; set; } = Access.Free;

    [MaxLength(10), Column(TypeName = "varchar(10)")]
    public string ListeningAccess { get; set; } = Access.Free;

    [MaxLength(10), Column(TypeName = "varchar(10)")]
    public string ReadingAccess { get; set; } = Access.Free;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(CreatedBy)), DeleteBehavior(DeleteBehavior.NoAction)]
    public Identity.Users Creator { get; set; } = null!;
}
