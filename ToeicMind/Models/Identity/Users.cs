using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Identity;

[Table("Users", Schema = "dbo")]
[Index(nameof(Email), IsUnique = true, Name = "UQ_Users_Email")]
public class Users
{
    [Key]
    public int UserId { get; set; }

    [MaxLength(100)]
    [Column("UserName")]
    public string Username { get; set; } = string.Empty;

    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? PasswordHash { get; set; }

    [Column(TypeName = "varchar(10)")]
    public UserRole Role { get; set; } = UserRole.LEARNER;

    [MaxLength(10)]
    [Column(TypeName = "varchar(10)")]
    public string Status { get; set; } = UserStatus.Active;

    [MaxLength(100)]
    public string? GoogleId { get; set; }

    /// <summary>Hết hạn VIP (UTC). NULL hoặc đã qua = chưa có VIP. ADMIN luôn có toàn quyền nên không cần giá trị này.</summary>
    public DateTime? VipExpiresAt { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public DateTime CreatedAt { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public DateTime UpdatedAt { get; set; }
}
