using ToeicMind.DTOs.Vip.Request;
using ToeicMind.Models.Vip;

namespace ToeicMind.Repositories.Vip;

/// <summary>Một đơn thanh toán kèm email người mua (cho Admin).</summary>
public record OrderRow(PaymentOrder Order, string UserEmail);

/// <summary>Một dòng lịch sử VIP kèm thông tin đơn (PURCHASE) và tên quản trị viên (ADMIN_*).</summary>
public record VipHistoryRow(VipHistory Entry, string? PlanName, int? Amount, string? TxnRef, string? ActorName);

/// <summary>Hợp đồng truy cập dữ liệu VIP: thời hạn VIP của người dùng, gói, đơn thanh toán (xem VipRepository).</summary>
public interface IVipRepository
{
    // Vai trò và thời hạn VIP hiện tại; null nếu không có người dùng.
    Task<(UserRole Role, DateTime? VipExpiresAt)?> GetVipInfoAsync(int userId);

    Task<List<VipPlan>> ListPlansAsync(bool activeOnly);
    Task<VipPlan?> GetPlanByCodeAsync(string code);
    // planId null = tạo mới. Lỗi: VIP_PLAN_NOT_FOUND, VIP_PLAN_CODE_EXISTS.
    Task<(VipPlan? Plan, string? Error)> SavePlanAsync(int? planId, VipPlan requested);

    Task<PaymentOrder> CreateOrderAsync(PaymentOrder order);
    Task<PaymentOrder?> GetOrderByTxnRefAsync(string txnRef);
    // userId != null: chỉ đơn của người đó.
    Task<PaymentOrder?> GetOrderAsync(int orderId, int? userId);
    Task<(List<OrderRow> Items, int TotalCount)> ListOrdersAsync(OrderListRequestDto query, int? onlyUserId);

    // Chốt đơn đang PENDING (chỉ một lần, an toàn khi VNPay gọi IPN và trình duyệt quay về cùng lúc). Thành công: cộng thời hạn VIP cho người mua trong cùng giao dịch.
    // Applied = false nếu đơn đã được chốt trước đó.
    Task<(PaymentOrder? Order, bool Applied)> CompleteOrderAsync(int orderId, bool success, string? responseCode, string? transactionNo,
        string? bankCode, string? cardType, DateTime now);

    // Quản trị viên cộng thêm ngày VIP (nối tiếp hạn hiện tại) hoặc thu hồi; cập nhật Users và ghi VipHistory trong cùng giao dịch.
    // Lỗi: USER_NOT_FOUND, VIP_TARGET_ADMIN, VIP_NOT_ACTIVE (thu hồi khi không còn VIP).
    Task<(VipHistory? Entry, string? Error)> AdjustVipAsync(int userId, int actorUserId, int? addDays, string reason, DateTime now);

    // Lịch sử VIP của một người dùng, mới nhất trước.
    Task<List<VipHistoryRow>> ListHistoryAsync(int userId, int take);
}
