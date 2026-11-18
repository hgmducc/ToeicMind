using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerUI;
using ToeicMind.Data;
using ToeicMind.Repositories.Auth;
using ToeicMind.Repositories.Exams;
using ToeicMind.Repositories.AdminUsers;
using ToeicMind.Repositories.Learning;
using ToeicMind.Repositories.Dashboard;
using ToeicMind.Services.Dashboard;
using ToeicMind.Services.Auth;
using ToeicMind.Services.Email;
using ToeicMind.Services.Exams;
using ToeicMind.Services.Media;
using ToeicMind.Services.AdminUsers;
using ToeicMind.Services.Diagnostics;
using ToeicMind.Services.Json;
using ToeicMind.Services.Learning;
using ToeicMind.Services.Vip;
using ToeicMind.Repositories.Vip;
using ToeicMind.Repositories.Grammar;
using ToeicMind.Services.Grammar;
using ToeicMind.Repositories.Listening;
using ToeicMind.Services.Listening;

var builder = WebApplication.CreateBuilder(args);

// Chỉ nạp secret local trong Development; biến môi trường có sẵn được ưu tiên.
if (builder.Environment.IsDevelopment())
{
    var envPath = Path.Combine(builder.Environment.ContentRootPath, ".env");
    if (File.Exists(envPath))
    {
        DotNetEnv.Env.NoClobber().Load(envPath);
        builder.Configuration.AddEnvironmentVariables().AddCommandLine(args);
    }
}

// ==========================================
// 1. ĐĂNG KÝ DỊCH VỤ (DEPENDENCY INJECTION)
// ==========================================

// Kết nối Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Đăng ký Repository & Service
builder.Services.AddScoped<RequestTimings>();
builder.Services.AddMemoryCache();
// Nén JSON (Brotli/Gzip) để giảm dung lượng đề thi và danh sách lớn; giải nén do trình duyệt xử lý tự động.
builder.Services.AddResponseCompression(options => options.EnableForHttps = true);
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminUserRepository, AdminUserRepository>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<IExamRepository, ExamRepository>();
builder.Services.AddScoped<IExamService, ExamService>();
builder.Services.AddScoped<IExamContentRepository, ExamContentRepository>();
builder.Services.AddScoped<IExamContentReader, ExamContentReader>();
builder.Services.AddScoped<IExamContentService, ExamContentService>();
builder.Services.AddScoped<IMediaStorage, R2MediaStorage>();
builder.Services.AddScoped<IExamMediaService, ExamMediaService>();
builder.Services.AddScoped<PlayMediaSigner>();
builder.Services.AddScoped<IExamPlayService, ExamPlayService>();
builder.Services.AddScoped<IAttemptRepository, AttemptRepository>();
builder.Services.AddScoped<IAttemptService, AttemptService>();
builder.Services.AddHostedService<AttemptAutoSubmitWorker>();
builder.Services.AddScoped<IProgressRepository, ProgressRepository>();
builder.Services.AddScoped<ILearnerService, LearnerService>();
builder.Services.AddScoped<IDictationRepository, DictationRepository>();
builder.Services.AddScoped<IDictationService, DictationService>();
builder.Services.AddScoped<IVocabLearningRepository, VocabLearningRepository>();
builder.Services.AddScoped<IVocabLearningService, VocabLearningService>();
builder.Services.AddScoped<IUserVocabularyRepository, UserVocabularyRepository>();
builder.Services.AddScoped<IUserVocabularyService, UserVocabularyService>();
builder.Services.AddScoped<IGrammarArticleRepository, GrammarArticleRepository>();
builder.Services.AddScoped<IGrammarArticleService, GrammarArticleService>();
builder.Services.AddScoped<IListeningItemRepository, ListeningItemRepository>();
builder.Services.AddScoped<IListeningItemService, ListeningItemService>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IStatsRepository, StatsRepository>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
// Cá nhân hóa và kiểm tra đầu vào (CHG-007).
builder.Services.AddScoped<IPlacementRepository, PlacementRepository>();
builder.Services.AddScoped<IPlacementService, PlacementService>();
builder.Services.AddScoped<ILearnerProfileRepository, LearnerProfileRepository>();
builder.Services.AddScoped<IPersonalizationService, PersonalizationService>();

// VIP: quyền truy cập nội dung và thanh toán VNPay (cấu hình trong section "VnPay").
builder.Services.Configure<VnPayOptions>(builder.Configuration.GetSection("VnPay"));
builder.Services.AddScoped<VnPayClient>();
builder.Services.AddScoped<IVipRepository, VipRepository>();
builder.Services.AddScoped<IAccessService, AccessService>();
builder.Services.AddScoped<IVipService, VipService>();

// Cấu hình xác thực JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var key = builder.Configuration["Jwt:Key"] ?? string.Empty;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var idClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(idClaim, out var userId))
                {
                    context.Fail("Danh tính không hợp lệ");
                    return;
                }

                // Chỉ đọc hai cột cần kiểm tra (mỗi request có token đều chạy truy vấn này).
                var roleClaim = context.Principal?.FindFirst(ClaimTypes.Role)?.Value;
                var user = await db.Users.AsNoTracking().Where(u => u.UserId == userId)
                    .Select(u => new { u.Status, u.Role }).FirstOrDefaultAsync();
                if (user is null || user.Status != UserStatus.Active || user.Role.ToString() != roleClaim)
                {
                    context.Fail("Tài khoản không còn quyền sử dụng token");
                }
            },
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "UNAUTHORIZED",
                    message = "Cần access token hợp lệ để truy cập",
                    traceId = context.HttpContext.TraceIdentifier
                });
            }
        };
    });

builder.Services.AddAuthorization();

// Cấu hình CORS
builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()
                .WithExposedHeaders("Server-Timing", "ETag");
        }
        else
        {
            policy.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("Server-Timing", "ETag");
        }
    });
});

// Controllers & chuẩn hóa phản hồi validation
builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter()));
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .ToDictionary(
                e => e.Key,
                e => e.Value!.Errors.Select(m => m.ErrorMessage).ToArray()
            );

        var body = new
        {
            code = "VALIDATION_ERROR",
            message = "Dữ liệu không hợp lệ",
            errors,
            traceId = context.HttpContext.TraceIdentifier
        };
        return new BadRequestObjectResult(body);
    };
});

// Cấu hình OpenAPI & Swagger UI
builder.Services.AddOpenApi(options =>
{
    // Đăng ký Security Scheme HTTP Bearer vào Components
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Components ??= new OpenApiComponents();
        var scheme = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Nhập JWT token (không cần gõ chữ Bearer)"
        };
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = scheme;
        return Task.CompletedTask;
    });

    // Tự động gắn Security Requirement cho các endpoint yêu cầu [Authorize] (trừ [AllowAnonymous])
    options.AddOperationTransformer((operation, context, cancellationToken) =>
    {
        var metadata = context.Description.ActionDescriptor.EndpointMetadata;
        var hasAuthorize = metadata.OfType<IAuthorizeData>().Any();
        var allowAnonymous = metadata.OfType<IAllowAnonymous>().Any();

        if (hasAuthorize && !allowAnonymous)
        {
            var schemeRef = new OpenApiSecuritySchemeReference("Bearer", context.Document);
            operation.Security ??= new List<OpenApiSecurityRequirement>();
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                [schemeRef] = new List<string>()
            });
        }
        return Task.CompletedTask;
    });
});

// ==========================================
// 2. CẤU HÌNH PIPELINE (MIDDLEWARE)
// ==========================================
var app = builder.Build();

// Kiểm tra cấu hình JWT khi khởi động
var jwtKey = app.Configuration["Jwt:Key"];
var jwtIssuer = app.Configuration["Jwt:Issuer"];
var jwtAudience = app.Configuration["Jwt:Audience"];
var expireMinutes = app.Configuration.GetValue<int>("Jwt:ExpireMinutes");
var refreshDays = app.Configuration.GetValue<int>("Jwt:RefreshTokenDays");

if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32 ||
    string.IsNullOrWhiteSpace(jwtIssuer) || string.IsNullOrWhiteSpace(jwtAudience) ||
    expireMinutes <= 0 || refreshDays <= 0)
{
    throw new InvalidOperationException("Cấu hình Jwt chưa hợp lệ. Cần Key tối thiểu 32 byte, Issuer, Audience và thời hạn dương.");
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            code = "INTERNAL_SERVER_ERROR",
            message = "Đã xảy ra lỗi hệ thống",
            traceId = context.TraceIdentifier
        });
    });
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "ToeicMind API v1");
    });
}

app.UseHttpsRedirection();
app.UseResponseCompression();
app.UseCors();

// Gắn header Server-Timing (thời gian từng bước truy vấn) để biết bước nào chậm; chỉ có khi API có đo.
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        var timings = context.RequestServices.GetService<RequestTimings>();
        if (timings is { Any: true }) context.Response.Headers["Server-Timing"] = timings.ToHeader();
        return Task.CompletedTask;
    });
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
