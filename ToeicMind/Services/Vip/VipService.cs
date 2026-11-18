using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using ToeicMind.DTOs.Vip.Request;
using ToeicMind.DTOs.Vip.Response;
using ToeicMind.Models.Vip;
using ToeicMind.Repositories.Vip;

namespace ToeicMind.Services.Vip;

/// <summary>
/// Nghiệp vụ VIP. Luồng mua: tạo đơn PENDING → chuyển sang VNPay → VNPay gọi IPN (server) và đưa trình duyệt về return URL;
/// cả hai cùng gọi <see cref="ConfirmPaymentAsync"/>, đơn chỉ được chốt đúng một lần nên VIP không bị cộng hai lần.
/// </summary>
public class VipService : IVipService
{
    private readonly IVipRepository _repo;
    private readonly VnPayClient _vnpay;
    private readonly VnPayOptions _options;

    public VipService(IVipRepository repo, VnPayClient vnpay, IOptions<VnPayOptions> options)
    {
        _repo = repo;
        _vnpay = vnpay;
        _options = options.Value;
    }

    public string FrontendResultUrl => _options.FrontendResultUrl;

    public async Task<List<VipPlanDto>> ListPlansAsync(bool activeOnly) =>
        (await _repo.ListPlansAsync(activeOnly)).Select(VipMapper.ToDto).ToList();

    public async Task<VipStatusDto> GetStatusAsync(int userId)
    {
        var info = await _repo.GetVipInfoAsync(userId);
        var isAdmin = info?.Role == UserRole.ADMIN;
        var expires = info?.VipExpiresAt is { } e && e > DateTime.UtcNow ? e : (DateTime?)null;
        return new VipStatusDto
        {
            IsAdmin = isAdmin, IsVip = isAdmin || expires is not null,
            ExpiresAt = expires is { } at ? VipMapper.Utc(at) : null,
            DaysLeft = expires is { } until ? (int)Math.Ceiling((until - DateTime.UtcNow).TotalDays) : 0
        };
    }

    public async Task<(CreateOrderResultDto? Result, string? Error)> CreateOrderAsync(int userId, CreateOrderRequestDto dto, string ipAddress)
    {
        if (!_vnpay.IsConfigured) return (null, "PAYMENT_NOT_CONFIGURED");
        var plan = await _repo.GetPlanByCodeAsync(dto.PlanCode.Trim());
        if (plan is null || !plan.IsActive) return (null, "VIP_PLAN_NOT_FOUND");
        // Admin đã có toàn quyền nên không cần mua.
        if ((await GetStatusAsync(userId)).IsAdmin) return (null, "ADMIN_NO_PURCHASE");

        var now = DateTime.UtcNow;
        var order = await _repo.CreateOrderAsync(new PaymentOrder
        {
            UserId = userId, PlanId = plan.PlanId, PlanCode = plan.Code, PlanName = plan.Name, DurationDays = plan.DurationDays,
            Amount = plan.PriceVnd, Provider = "VNPAY", TxnRef = NewTxnRef(now), Status = OrderStatus.Pending, IpAddress = ipAddress,
            CreatedAt = now, UpdatedAt = now, ExpiresAt = now.AddMinutes(Math.Clamp(_options.OrderExpireMinutes, 5, 60))
        });
        // Nội dung gửi VNPay dùng tiếng Việt không dấu theo khuyến nghị của VNPay.
        var url = _vnpay.BuildPaymentUrl(order.TxnRef, order.Amount, $"Thanh toan goi VIP {order.PlanCode} ma don {order.TxnRef}", ipAddress, now, order.ExpiresAt);
        return (new CreateOrderResultDto { OrderId = order.OrderId, TxnRef = order.TxnRef, Amount = order.Amount, PaymentUrl = url, ExpiresAt = VipMapper.Utc(order.ExpiresAt) }, null);
    }

    public async Task<OrderPageDto> ListOrdersAsync(OrderListRequestDto query, int? onlyUserId)
    {
        var (items, total) = await _repo.ListOrdersAsync(query, onlyUserId);
        return new OrderPageDto
        {
            Items = items.Select(r => VipMapper.ToDto(r.Order, onlyUserId is null ? r.UserEmail : null)).ToList(),
            TotalCount = total, Page = query.Page, PageSize = query.PageSize
        };
    }

    public async Task<(PaymentOrderDto? Result, string? Error)> GetOrderAsync(int userId, int orderId)
    {
        var order = await _repo.GetOrderAsync(orderId, userId);
        return order is null ? (null, "ORDER_NOT_FOUND") : (VipMapper.ToDto(order), null);
    }

    public async Task<(VnPayOutcome Outcome, PaymentOrderDto? Order)> ConfirmPaymentAsync(IReadOnlyDictionary<string, string> query)
    {
        if (!_vnpay.VerifySignature(query)) return (VnPayOutcome.InvalidSignature, null);
        var order = query.TryGetValue("vnp_TxnRef", out var txnRef) ? await _repo.GetOrderByTxnRefAsync(txnRef) : null;
        if (order is null) return (VnPayOutcome.OrderNotFound, null);
        // vnp_Amount = số tiền VND nhân 100.
        if (!query.TryGetValue("vnp_Amount", out var amount) || !long.TryParse(amount, out var paid) || paid != (long)order.Amount * 100)
            return (VnPayOutcome.AmountMismatch, VipMapper.ToDto(order));
        if (order.Status != OrderStatus.Pending) return (VnPayOutcome.AlreadyConfirmed, VipMapper.ToDto(order));

        query.TryGetValue("vnp_ResponseCode", out var responseCode);
        query.TryGetValue("vnp_TransactionStatus", out var transactionStatus);
        var success = responseCode == "00" && transactionStatus == "00";
        var (saved, applied) = await _repo.CompleteOrderAsync(order.OrderId, success, responseCode, Limit(query, "vnp_TransactionNo", 30),
            Limit(query, "vnp_BankCode", 20), Limit(query, "vnp_CardType", 20), DateTime.UtcNow);
        if (saved is null) return (VnPayOutcome.OrderNotFound, null);
        return (!applied ? VnPayOutcome.AlreadyConfirmed : success ? VnPayOutcome.Paid : VnPayOutcome.Failed, VipMapper.ToDto(saved));
    }

    public async Task<(VipPlanDto? Result, string? Error)> SavePlanAsync(int? planId, SaveVipPlanRequestDto dto)
    {
        var (plan, error) = await _repo.SavePlanAsync(planId, new VipPlan
        {
            Code = dto.Code.Trim().ToUpperInvariant(), Name = dto.Name.Trim(), Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            DurationDays = dto.DurationDays, PriceVnd = dto.PriceVnd, IsActive = dto.IsActive, SortOrder = dto.SortOrder
        });
        return error is not null ? (null, error) : (VipMapper.ToDto(plan!), null);
    }

    public async Task<(AdminVipHistoryItemDto? Result, string? Error)> GrantVipAsync(int actorUserId, int userId, GrantVipRequestDto dto)
    {
        var action = (dto.Action ?? string.Empty).Trim().ToUpperInvariant();
        if (action is not ("GRANT" or "REVOKE")) return (null, "VIP_ACTION_INVALID");
        if (action == "GRANT" && dto.Days is not (>= 1 and <= 3660)) return (null, "VIP_DAYS_INVALID");
        var reason = (dto.Reason ?? string.Empty).Trim();
        if (reason.Length == 0) return (null, "VIP_REASON_REQUIRED");
        if (reason.Length > 300) reason = reason[..300];
        var (entry, error) = await _repo.AdjustVipAsync(userId, actorUserId, action == "GRANT" ? dto.Days : null, reason, DateTime.UtcNow);
        return error is not null ? (null, error) : (ToAdminDto(new VipHistoryRow(entry!, null, null, null, null)), null);
    }

    public async Task<List<VipHistoryItemDto>> ListHistoryAsync(int userId) =>
        (await _repo.ListHistoryAsync(userId, 100)).Select(row => Fill(new VipHistoryItemDto(), row)).ToList();

    public async Task<List<AdminVipHistoryItemDto>> ListHistoryForAdminAsync(int userId) =>
        (await _repo.ListHistoryAsync(userId, 100)).Select(ToAdminDto).ToList();

    private static AdminVipHistoryItemDto ToAdminDto(VipHistoryRow row)
    {
        var dto = Fill(new AdminVipHistoryItemDto(), row);
        dto.Reason = row.Entry.Reason;
        dto.ActorUserId = row.Entry.ActorUserId;
        dto.ActorName = row.ActorName;
        return dto;
    }

    private static T Fill<T>(T dto, VipHistoryRow row) where T : VipHistoryItemDto
    {
        var h = row.Entry;
        dto.HistoryId = h.HistoryId; dto.Kind = h.Kind; dto.Days = h.Days;
        dto.PreviousExpiresAt = h.PreviousExpiresAt is { } p ? VipMapper.Utc(p) : null;
        dto.NewExpiresAt = h.NewExpiresAt is { } n ? VipMapper.Utc(n) : null;
        dto.CreatedAt = VipMapper.Utc(h.CreatedAt);
        dto.PlanName = row.PlanName; dto.Amount = row.Amount; dto.TxnRef = row.TxnRef;
        return dto;
    }

    // Mã đơn gửi VNPay: tiền tố + thời điểm + số ngẫu nhiên, chỉ gồm chữ số/chữ cái, duy nhất nhờ ràng buộc UNIQUE.
    private static string NewTxnRef(DateTime utc) => $"TM{utc:yyMMddHHmmss}{RandomNumberGenerator.GetInt32(100000, 1000000)}";

    private static string? Limit(IReadOnlyDictionary<string, string> query, string key, int max) =>
        query.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value) ? (value.Length > max ? value[..max] : value) : null;
}
