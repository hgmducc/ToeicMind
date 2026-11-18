using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Vip;

/// <summary>Gói VIP bán cho người học (thời hạn và giá bằng VND).</summary>
[Table("VipPlan", Schema = "dbo")]
[Index(nameof(Code), IsUnique = true, Name = "UQ_VipPlan_Code")]
public class VipPlan
{
    [Key]
    public int PlanId { get; set; }

    [MaxLength(30), Column(TypeName = "varchar(30)")]
    public string Code { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public int DurationDays { get; set; }
    public int PriceVnd { get; set; }
    public bool IsActive { get; set; } = true;
    public short SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
