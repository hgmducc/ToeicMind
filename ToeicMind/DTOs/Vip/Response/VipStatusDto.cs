namespace ToeicMind.DTOs.Vip.Response;

/// <summary>Trạng thái VIP của người dùng hiện tại. ADMIN luôn có toàn quyền (IsAdmin, IsVip = true).</summary>
public class VipStatusDto
{
    public bool IsVip { get; set; }
    public bool IsAdmin { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int DaysLeft { get; set; }
}