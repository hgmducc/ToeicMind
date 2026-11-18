using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Learning;

/// <summary>Tiến độ Nghe chép của người học theo từng bộ clip (ListeningItem): số lần luyện, chế độ và độ chính xác gần nhất/tốt nhất.</summary>
[Table("UserListeningProgress", Schema = "dbo")]
[PrimaryKey(nameof(UserId), nameof(ItemId))]
public class UserListeningProgress
{
    public int UserId { get; set; }
    public int ItemId { get; set; }
    public int PracticeCount { get; set; }
    public DateTime FirstPracticedAt { get; set; }
    public DateTime LastPracticedAt { get; set; }
    [MaxLength(20), Column(TypeName = "varchar(20)")]
    public string? LastMode { get; set; }
    [Column(TypeName = "decimal(5,2)")]
    public decimal? LastAccuracy { get; set; }
    [Column(TypeName = "decimal(5,2)")]
    public decimal? BestAccuracy { get; set; }
}
