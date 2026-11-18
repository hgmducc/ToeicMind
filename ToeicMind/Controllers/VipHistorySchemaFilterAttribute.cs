using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Controllers;

/// <summary>
/// Database chưa áp dụng phần F (lịch sử VIP) của 01_schema.sql: thiếu bảng/cột (SQL 208/207).
/// Báo VIP_HISTORY_SCHEMA_MISSING (503) thay vì lỗi hệ thống chung. Chỉ gắn cho API lịch sử/cấp VIP.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class VipHistorySchemaFilterAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        var sql = context.Exception as SqlException ?? (context.Exception as DbUpdateException)?.InnerException as SqlException
                  ?? context.Exception.InnerException as SqlException;
        if (sql is not { Number: 207 or 208 } || !sql.Message.Contains("VipHistory", StringComparison.OrdinalIgnoreCase)) return;
        context.Result = ApiErrors.Result(context.HttpContext, "VIP_HISTORY_SCHEMA_MISSING");
        context.ExceptionHandled = true;
    }
}
