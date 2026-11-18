using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Identity;

[Table("RefreshTokens", Schema = "dbo")]
[Index(nameof(TokenHash), IsUnique = true, Name = "UQ_RefreshTokens_TokenHash")]
public class RefreshToken
{

    [Key]
    public long RefreshTokenId { get; set; }

    public int UserId { get; set; }

    [Required]
    [StringLength(64)]
    [Column(TypeName = "char(64)")]
    public string TokenHash { get; set; } = string.Empty;

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public Users User { get; set; } = null!;
}
