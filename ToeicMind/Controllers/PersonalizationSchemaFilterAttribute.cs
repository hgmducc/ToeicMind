using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Controllers;

/// <summary>
/// Database chưa áp dụng phần E (CHG-007) của 01_schema.sql: thiếu bảng/cột (SQL 208/207) hoặc CHECK cũ của Attempt chặn Scope = PLACEMENT (SQL 547).
/// Báo PERSONALIZATION_SCHEMA_MISSING (503) thay vì lỗi hệ thống chung. Chỉ gắn cho API cá nhân hóa/kiểm tra đầu vào.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class PersonalizationSchemaFilterAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        var sql = context.Exception as SqlException ?? (context.Exception as DbUpdateException)?.InnerException as SqlException
                  ?? context.Exception.InnerException as SqlException;
        if (sql is not { Number: 207 or 208 or 547 }) return;
        // 547 cũng là lỗi khóa ngoại thật; chỉ coi là thiếu migration khi vướng CHECK phạm vi của Attempt.
        if (sql.Number == 547 && !sql.Message.Contains("CK_Attempt_", StringComparison.Ordinal)) return;
        context.Result = ApiErrors.Result(context.HttpContext, "PERSONALIZATION_SCHEMA_MISSING");
        context.ExceptionHandled = true;
    }
}
