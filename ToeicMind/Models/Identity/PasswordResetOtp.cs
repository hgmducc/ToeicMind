using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Identity;

[Table("PasswordResetOtps", Schema = "dbo")]
[Index(nameof(Email), nameof(ExpiresAt), nameof(IsUsed), Name = "IX_PasswordResetOtps_Email_Active")]
public class PasswordResetOtp
{
    [Key]
    public long OtpId { get; set; }

    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "char(64)")]
    public string OtpHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public int AttemptsCount { get; set; }

    public bool IsUsed { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public DateTime CreatedAt { get; set; }
}
