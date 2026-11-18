using ToeicMind.DTOs.Vip.Request;
using ToeicMind.DTOs.Vip.Response;

namespace ToeicMind.Services.Vip;

/// <summary>Kết quả xử lý phản hồi VNPay (return URL hoặc IPN).</summary>
public enum VnPayOutcome
{
    InvalidSignature,
    OrderNotFound,
    AmountMismatch,
    /// <summary>Đơn đã được chốt trước đó (idempotent): trả lại trạng thái hiện tại, không cộng VIP lần nữa.</summary>
    AlreadyConfirmed,
    Paid,
    Failed
}

/// <summary>Hợp đồng nghiệp vụ VIP: gói, trạng thái, mua qua VNPay, xác nhận thanh toán, quản trị.</summary>
public interface IVipService
{
    Task<List<VipPlanDto>> ListPlansAsync(bool activeOnly);
    Task<VipStatusDto> GetStatusAsync(int userId);
    Task<(CreateOrderResultDto? Result, string? Error)> CreateOrderAsync(int userId, CreateOrderRequestDto dto, string ipAddress);
    Task<OrderPageDto> ListOrdersAsync(OrderListRequestDto query, int? onlyUserId);
    Task<(PaymentOrderDto? Result, string? Error)> GetOrderAsync(int userId, int orderId);

    // Xử lý tham số vnp_* VNPay gửi về (cùng một logic cho IPN và return URL).
    Task<(VnPayOutcome Outcome, PaymentOrderDto? Order)> ConfirmPaymentAsync(IReadOnlyDictionary<string, string> query);
    string FrontendResultUrl { get; }

    Task<(VipPlanDto? Result, string? Error)> SavePlanAsync(int? planId, SaveVipPlanRequestDto dto);
    // Quản trị viên cộng thêm ngày hoặc thu hồi VIP, có lý do; ghi VipHistory (không tạo đơn thanh toán).
    Task<(AdminVipHistoryItemDto? Result, string? Error)> GrantVipAsync(int actorUserId, int userId, GrantVipRequestDto dto);

    // Lịch sử VIP: người học xem của mình (không lý do/người thực hiện); quản trị viên xem đủ.
    Task<List<VipHistoryItemDto>> ListHistoryAsync(int userId);
    Task<List<AdminVipHistoryItemDto>> ListHistoryForAdminAsync(int userId);
}
