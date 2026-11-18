using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Controllers;

/// <summary>
/// Thiếu bảng/cột của CHG-005 (SQL 208 = tên đối tượng sai, 207 = tên cột sai): báo rõ cần chạy migration
/// (VOCAB_SCHEMA_MISSING, 503) thay vì lỗi hệ thống chung.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class VocabSchemaFilterAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        var sql = context.Exception as SqlException ?? (context.Exception as DbUpdateException)?.InnerException as SqlException;
        if (sql is not { Number: 207 or 208 }) return;
        context.Result = ApiErrors.Result(context.HttpContext, "VOCAB_SCHEMA_MISSING");
        context.ExceptionHandled = true;
    }
}
