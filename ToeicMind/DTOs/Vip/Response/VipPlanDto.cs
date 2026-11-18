namespace ToeicMind.DTOs.Vip.Response;

public class VipPlanDto
{
    public int PlanId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DurationDays { get; set; }
    public int PriceVnd { get; set; }
    public bool IsActive { get; set; }
    public short SortOrder { get; set; }
}