using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

[Table("Exam", Schema = "dbo")]
public class Exam
{
    [Key]
    public int ExamId { get; set; }

    public int ExamSetId { get; set; }

    [MaxLength(30), Column(TypeName = "varchar(30)")]
    public string ExamCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(10), Column(TypeName = "varchar(10)")]
    public string Status { get; set; } = "DRAFT";

    public bool IsPublic { get; set; }

    /// <summary>Ghi đè quyền làm đề của bộ đề: FREE hoặc VIP; NULL = theo ExamSet.ExamAccess.</summary>
    [MaxLength(10), Column(TypeName = "varchar(10)")]
    public string? AccessLevel { get; set; }

    /// <summary>Quyền làm đề thực tế (AccessLevel ?? ExamSet.ExamAccess). Không lưu; chỉ có khi truy vấn danh sách/chi tiết dựng sẵn giá trị này.</summary>
    [NotMapped]
    public string EffectiveAccess { get; set; } = Access.Free;

    public string? ImportSourceJson { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(ExamSetId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public ExamSet ExamSet { get; set; } = null!;

    [ForeignKey(nameof(CreatedBy)), DeleteBehavior(DeleteBehavior.NoAction)]
    public Identity.Users Creator { get; set; } = null!;
}
