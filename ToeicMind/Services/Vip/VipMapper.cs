using ToeicMind.DTOs.Vip.Response;
using ToeicMind.Models.Vip;

namespace ToeicMind.Services.Vip;

/// <summary>Chuyển entity gói VIP và đơn thanh toán sang DTO (thời điểm UTC ghi dấu Kind = Utc).</summary>
public static class VipMapper
{
    public static VipPlanDto ToDto(VipPlan plan) => new()
    {
        PlanId = plan.PlanId, Code = plan.Code, Name = plan.Name, Description = plan.Description, DurationDays = plan.DurationDays,
        PriceVnd = plan.PriceVnd, IsActive = plan.IsActive, SortOrder = plan.SortOrder
    };

    public static PaymentOrderDto ToDto(PaymentOrder order, string? userEmail = null) => new()
    {
        OrderId = order.OrderId, UserId = order.UserId, UserEmail = userEmail, PlanCode = order.PlanCode, PlanName = order.PlanName,
        DurationDays = order.DurationDays, Amount = order.Amount, TxnRef = order.TxnRef, Status = order.Status, ResponseCode = order.ResponseCode,
        TransactionNo = order.TransactionNo, BankCode = order.BankCode, CreatedAt = Utc(order.CreatedAt), ExpiresAt = Utc(order.ExpiresAt),
        PaidAt = order.PaidAt is { } paid ? Utc(paid) : null
    };

    public static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
