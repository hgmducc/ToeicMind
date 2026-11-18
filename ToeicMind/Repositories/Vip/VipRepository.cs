using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.DTOs.Vip.Request;
using ToeicMind.Models.Vip;

namespace ToeicMind.Repositories.Vip;

public class VipRepository : IVipRepository
{
    private readonly AppDbContext _db;
    public VipRepository(AppDbContext db) => _db = db;

    public async Task<(UserRole Role, DateTime? VipExpiresAt)?> GetVipInfoAsync(int userId)
    {
        var row = await _db.Users.AsNoTracking().Where(u => u.UserId == userId).Select(u => new { u.Role, u.VipExpiresAt }).FirstOrDefaultAsync();
        return row is null ? null : (row.Role, row.VipExpiresAt);
    }

    public Task<List<VipPlan>> ListPlansAsync(bool activeOnly) =>
        _db.VipPlans.AsNoTracking().Where(p => !activeOnly || p.IsActive).OrderBy(p => p.SortOrder).ThenBy(p => p.PriceVnd).ToListAsync();

    public Task<VipPlan?> GetPlanByCodeAsync(string code) => _db.VipPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Code == code);

    public async Task<(VipPlan? Plan, string? Error)> SavePlanAsync(int? planId, VipPlan requested)
    {
        var entity = planId is null ? requested : await _db.VipPlans.FirstOrDefaultAsync(p => p.PlanId == planId);
        if (entity is null) return (null, "VIP_PLAN_NOT_FOUND");
        var now = DateTime.UtcNow;
        entity.Code = requested.Code;
        entity.Name = requested.Name;
        entity.Description = requested.Description;
        entity.DurationDays = requested.DurationDays;
        entity.PriceVnd = requested.PriceVnd;
        entity.IsActive = requested.IsActive;
        entity.SortOrder = requested.SortOrder;
        entity.UpdatedAt = now;
        if (planId is null)
        {
            entity.CreatedAt = now;
            _db.VipPlans.Add(entity);
        }
        try
        {
            await _db.SaveChangesAsync();
            return (entity, null);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            _db.ChangeTracker.Clear();
            return (null, "VIP_PLAN_CODE_EXISTS");
        }
    }

    public async Task<PaymentOrder> CreateOrderAsync(PaymentOrder order)
    {
        _db.PaymentOrders.Add(order);
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
        return order;
    }

    public Task<PaymentOrder?> GetOrderByTxnRefAsync(string txnRef) =>
        _db.PaymentOrders.AsNoTracking().FirstOrDefaultAsync(o => o.TxnRef == txnRef);

    public Task<PaymentOrder?> GetOrderAsync(int orderId, int? userId) =>
        _db.PaymentOrders.AsNoTracking().FirstOrDefaultAsync(o => o.OrderId == orderId && (userId == null || o.UserId == userId));

    public async Task<(List<OrderRow> Items, int TotalCount)> ListOrdersAsync(OrderListRequestDto query, int? onlyUserId)
    {
        var orders = _db.PaymentOrders.AsNoTracking().AsQueryable();
        var userId = onlyUserId ?? query.UserId;
        if (userId is { } id) orders = orders.Where(o => o.UserId == id);
        if (query.Status is { } status) orders = orders.Where(o => o.Status == status);
        var total = await orders.CountAsync();
        var items = await orders.OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.OrderId)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(o => new OrderRow(o, o.User.Email)).ToListAsync();
        return (items, total);
    }

    public async Task<(PaymentOrder? Order, bool Applied)> CompleteOrderAsync(int orderId, bool success, string? responseCode,
        string? transactionNo, string? bankCode, string? cardType, DateTime now)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        // Chỉ đơn còn PENDING mới được chốt; điều kiện nằm trong câu UPDATE nên hai request đồng thời chỉ một request thắng.
        var status = success ? OrderStatus.Paid : OrderStatus.Failed;
        var changed = await _db.PaymentOrders.Where(o => o.OrderId == orderId && o.Status == OrderStatus.Pending)
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Status, status)
                .SetProperty(o => o.ResponseCode, responseCode)
                .SetProperty(o => o.TransactionNo, transactionNo)
                .SetProperty(o => o.BankCode, bankCode)
                .SetProperty(o => o.CardType, cardType)
                .SetProperty(o => o.PaidAt, success ? now : (DateTime?)null)
                .SetProperty(o => o.UpdatedAt, now));
        var order = await _db.PaymentOrders.AsNoTracking().FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order is null || changed == 0)
        {
            await transaction.RollbackAsync();
            return (order, false);
        }
        if (success)
        {
            // Gia hạn nối tiếp: tính từ thời hạn hiện tại nếu còn VIP, ngược lại từ bây giờ.
            var current = await _db.Users.AsNoTracking().Where(u => u.UserId == order.UserId).Select(u => u.VipExpiresAt).FirstOrDefaultAsync();
            var expires = (current is { } c && c > now ? c : now).AddDays(order.DurationDays);
            await _db.Users.Where(u => u.UserId == order.UserId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.VipExpiresAt, expires).SetProperty(u => u.UpdatedAt, now));
            // Ghi lịch sử VIP. Database chưa chạy phần F (chưa có bảng) thì bỏ qua: thanh toán không được hỏng vì thiếu nhật ký.
            if (await HistoryTableExistsAsync())
            {
                _db.VipHistories.Add(new VipHistory
                {
                    UserId = order.UserId, Kind = VipHistoryKind.Purchase, Days = order.DurationDays,
                    PreviousExpiresAt = current is { } p && p > now ? p : null, NewExpiresAt = expires, OrderId = order.OrderId, CreatedAt = now
                });
                await _db.SaveChangesAsync();
                _db.ChangeTracker.Clear();
            }
        }
        await transaction.CommitAsync();
        return (order, true);
    }

    public async Task<(VipHistory? Entry, string? Error)> AdjustVipAsync(int userId, int actorUserId, int? addDays, string reason, DateTime now)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var user = await _db.Users.Where(u => u.UserId == userId).Select(u => new { u.Role, u.VipExpiresAt }).FirstOrDefaultAsync();
        if (user is null) { await transaction.RollbackAsync(); return (null, "USER_NOT_FOUND"); }
        if (user.Role == UserRole.ADMIN) { await transaction.RollbackAsync(); return (null, "VIP_TARGET_ADMIN"); }
        var active = user.VipExpiresAt is { } c && c > now;
        if (addDays is null && !active) { await transaction.RollbackAsync(); return (null, "VIP_NOT_ACTIVE"); }
        // Cộng nối tiếp như khi mua gói: còn VIP thì cộng vào hạn hiện tại, không thì tính từ bây giờ.
        DateTime? expires = addDays is { } days ? (active ? user.VipExpiresAt!.Value : now).AddDays(days) : null;
        await _db.Users.Where(u => u.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.VipExpiresAt, expires).SetProperty(u => u.UpdatedAt, now));
        var entry = new VipHistory
        {
            UserId = userId, Kind = addDays is null ? VipHistoryKind.AdminRevoke : VipHistoryKind.AdminGrant, Days = addDays,
            PreviousExpiresAt = active ? user.VipExpiresAt : null, NewExpiresAt = expires, ActorUserId = actorUserId, Reason = reason, CreatedAt = now
        };
        _db.VipHistories.Add(entry);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        _db.ChangeTracker.Clear();
        return (entry, null);
    }

    public Task<List<VipHistoryRow>> ListHistoryAsync(int userId, int take) =>
        _db.VipHistories.AsNoTracking().Where(h => h.UserId == userId)
            .OrderByDescending(h => h.CreatedAt).ThenByDescending(h => h.HistoryId).Take(take)
            .Select(h => new VipHistoryRow(h,
                _db.PaymentOrders.Where(o => o.OrderId == h.OrderId).Select(o => o.PlanName).FirstOrDefault(),
                _db.PaymentOrders.Where(o => o.OrderId == h.OrderId).Select(o => (int?)o.Amount).FirstOrDefault(),
                _db.PaymentOrders.Where(o => o.OrderId == h.OrderId).Select(o => o.TxnRef).FirstOrDefault(),
                _db.Users.Where(u => u.UserId == h.ActorUserId).Select(u => u.Username).FirstOrDefault()))
            .ToListAsync();

    // Bảng VipHistory có trong database chưa (phần F của 01_schema.sql). Chỉ ghi nhớ khi đã có để lần chạy migration sau được nhận ngay.
    private static volatile bool _historyTableExists;
    private async Task<bool> HistoryTableExistsAsync()
    {
        if (_historyTableExists) return true;
        var exists = await _db.Database.SqlQueryRaw<int>("SELECT CASE WHEN OBJECT_ID(N'dbo.VipHistory', N'U') IS NULL THEN 0 ELSE 1 END AS [Value]").SingleAsync() == 1;
        if (exists) _historyTableExists = true;
        return exists;
    }
}
