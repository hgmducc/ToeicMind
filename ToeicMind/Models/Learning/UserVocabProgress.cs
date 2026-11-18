using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Learning;

/// <summary>
/// Tiến độ học một từ vựng hệ thống của người học theo thuật toán lặp lại ngắt quãng (SM-2 cải biên).
/// Chưa có dòng nghĩa là từ còn mới. Status: LEARNING (khoảng cách dưới 21 ngày) hoặc MASTERED (từ 21 ngày trở lên).
/// </summary>
[Table("UserVocabProgress", Schema = "dbo")]
[PrimaryKey(nameof(UserId), nameof(VocabId))]
[Index(nameof(UserId), nameof(NextReviewAt), Name = "IX_UserVocabProgress_User_Next")]
public class UserVocabProgress
{
    public int UserId { get; set; }
    public int VocabId { get; set; }
    [MaxLength(10), Column(TypeName = "varchar(10)")]
    public string Status { get; set; } = "LEARNING";
    public short Repetitions { get; set; }
    public int IntervalDays { get; set; }
    [Column(TypeName = "decimal(4,2)")]
    public decimal EaseFactor { get; set; } = 2.5m;
    public short Lapses { get; set; }
    public int TotalReviews { get; set; }
    public int CorrectReviews { get; set; }
    public byte LastGrade { get; set; }
    public DateTime FirstSeenAt { get; set; }
    public DateTime LastReviewedAt { get; set; }
    public DateTime NextReviewAt { get; set; }
}
