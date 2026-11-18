# Phong cách code ToeicMind

Ngày ghi nhận: 27/10/2026. Nguồn: người dùng yêu cầu áp dụng phong cách và cách tổ chức của `C:\Users\Admin\OneDrive\PROJECT_TOEIC\BE\UserApi`; đã đọc Controller, Service, Repository, DTO, mapper, DbContext, Program và `huongdan.md` của dự án đó. Đây là quy ước dùng cho các lần phát triển tiếp theo.

## 1. Tổ chức và trách nhiệm

```text
Client → Controller → Service → Repository → AppDbContext → SQL Server

Controllers/                  HTTP, route, status code, phân quyền
DTOs/<Feature>/Request/        Dữ liệu đầu vào và DataAnnotations
DTOs/<Feature>/Response/       Dữ liệu trả về
Models/Identity/              Entity auth
Repositories/<Feature>/       Interface + implementation truy cập dữ liệu
Services/<Feature>/           Interface + nghiệp vụ, JWT, mapper
Data/                         DbContext và ánh xạ EF Core
../DATABASE/                  Nguồn script SQL chuẩn, cập nhật tại chỗ
```

- Giữ các tầng và thư mục tính năng đang có. Không tự chuyển sang cấu trúc Application/Domain/Infrastructure hoặc thêm generic repository khi chưa có nhu cầu.
- Controller chỉ xử lý HTTP và gọi service; không truy cập DbContext hoặc tự băm mật khẩu/tạo token.
- Service xử lý nghiệp vụ qua interface repository, trả DTO. Lỗi nghiệp vụ dùng tuple `(T? Result, string? Error)` hoặc `null` theo hợp đồng; controller chuyển sang HTTP.
- Repository nhận DbContext, trả entity hoặc kết quả thao tác; xử lý transaction, lỗi unique và điều kiện cập nhật đồng thời tại đây.
- Mapper tĩnh, ví dụ `UserMapper.ToDto`, là nơi ánh xạ entity sang DTO. Không trả entity có `PasswordHash` ra API.
- Interface và implementation nằm trong các file riêng; đăng ký bằng `AddScoped` trong `Program.cs`.

## 2. Cú pháp và cách đặt tên

- File trùng tên class/interface; namespace dạng file scoped `namespace ToeicMind.Services.Auth;`.
- Class/property/method dùng PascalCase; biến và tham số dùng camelCase. Interface bắt đầu bằng `I`, DTO kết thúc bằng `Dto`, thao tác bất đồng bộ kết thúc bằng `Async`.
- Field dependency dùng `private readonly` với tên `_db`, `_repo`, `_auth`, `_jwt`, `_config` theo trách nhiệm.
- Constructor gán một dependency dùng `=>`; nhiều dependency dùng block thông thường.
- **LINQ dùng chuỗi phương thức với lambda**, theo đúng mẫu người dùng cung cấp. Phương thức có một biểu thức dùng `=>` và trả thẳng `Task`; không thêm `async/await` khi chỉ chuyển tiếp một tác vụ.

```csharp
private readonly AppDbContext _db;
public AuthRepository(AppDbContext db) => _db = db;

public Task<Users?> GetByEmailAsync(string email) =>
    _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);

public Task<bool> ExistsByEmailAsync(string email) =>
    _db.Users.AnyAsync(u => u.Email == email);
```

- Dùng block và `await` khi cần xử lý sau thao tác bất đồng bộ, nhiều bước nghiệp vụ hoặc transaction. Không ép mọi phương thức thành một dòng.
- `AsNoTracking()` cho truy vấn chỉ đọc. Chỉ dùng `Include` với navigation thực sự; `Users.Role` ở ToeicMind là enum ánh xạ `VARCHAR`, không có bảng `Roles` để Include.
- Cập nhật hàng loạt dùng `Where(...).ExecuteUpdateAsync(...)` khi phù hợp; không tải cả bảng để lọc trong bộ nhớ. Không dựa vào ChangeTracker để đọc trạng thái vừa cập nhật trực tiếp.
- String không nullable khởi tạo bằng `string.Empty`; chỉ dùng `null!` khi vòng đời framework bảo đảm gán giá trị. Dùng early return và `is null` để giữ luồng dễ đọc.
- Comment ngắn bằng tiếng Việt cho lý do nghiệp vụ, transaction và bảo mật; không mô tả lại mọi dòng code.

## 3. DTO, HTTP và dữ liệu

- DTO request dùng `[Required]`, `[EmailAddress]`, `[MinLength]`, `[MaxLength]`, `[Compare]` phù hợp. Đăng ký không nhận vai trò từ client.
- Controller dùng `[ApiController]`, `[Route("api/[controller]")]`, `[Authorize]` và `[AllowAnonymous]` rõ ràng. Khu Admin dùng `[Authorize(Roles = "ADMIN")]`.
- Thành công dùng DTO và HTTP 200/201/204; lỗi auth dùng 401, sai quyền 403, validation 400, trùng email 409. Lỗi API có `code`, `message`, `traceId`; lỗi validation thêm `errors`.
- (13/11/2026) Controller kế thừa `ApiControllerBase` (đã bật `[ApiController]`): dùng `UserId`/`UserIdOrNull`, `Respond(await service...)` để đổi `(kết quả, mã lỗi)` thành 200/201 hoặc lỗi, `Fail(code)` cho lỗi đơn lẻ. Mã lỗi nghiệp vụ mới khai báo một lần trong bảng `ApiErrors`, không viết `switch` thông báo trong controller (ngoại lệ: Auth, vì thông báo khác nhau theo luồng).
- (13/11/2026) Quy tắc truy cập: danh sách/danh mục/cấu trúc (không có chữ câu hỏi, script, đáp án, link media ký) là `[AllowAnonymous]`; nội dung làm bài và mọi thao tác ghi tiến độ cần `[Authorize]`. Action công khai có tiến độ cá nhân nhận `int? userId` từ `UserIdOrNull` (khách = `null`, chưa có tiến độ). Controller mặc định `[Authorize]`, mở công khai bằng `[AllowAnonymous]` trên từng action.
- (13/11/2026, CHG-006) Quyền nội dung dùng `IAccessService` (`CanUseAsync`/`HasVipAsync`); kiểm tra ở **service**, không ở controller. Nội dung chặn trả mã `VIP_REQUIRED` (HTTP 402). Mức quyền là hằng số `Access.Free/Vip`. Cấu hình thanh toán/khóa bí mật chỉ qua `VnPay__*` trong `.env`/secret, không đưa vào mã hoặc tài liệu.
- (13/11/2026) Ưu tiên một endpoint cho cùng một dữ liệu: thêm tham số tùy chọn (`days`, `includeReview`…) hoặc trường vào DTO thay vì thêm route mới trả tập con của dữ liệu đã có.
- Thời điểm lưu UTC, cột SQL `DATETIME2`. Ánh xạ enum thành chuỗi tương ứng CHECK trong database. Cột thời gian mặc định không dùng `DatabaseGeneratedOption.Identity`.
- Script SQL trong `../DATABASE` là nguồn triển khai schema; chỉ sửa/bổ sung vào bộ gốc người dùng đã chạy, không tạo bộ schema rút gọn riêng trong backend. Không tự gọi `EnsureCreated`, `Migrate` hay chạy DDL trong lúc khởi động API.
- Giữ các quy tắc ToeicMind: đăng ký luôn LEARNER, không sao chép bảng Roles từ UserApi. API quản lý người dùng của ADMIN (`/api/admin/users`) được thêm theo yêu cầu ngày 03/11/2026, viết lại theo mô hình ToeicMind (vai trò là cột enum, trạng thái ACTIVE/LOCKED, không xóa cứng). Kiểm tra `Status` và vai trò hiện tại khi xác thực JWT.
- Khóa JWT, chuỗi kết nối và thông tin SMTP qua `.env` chỉ trong Development hoặc User Secrets/biến môi trường; Staging/Production dùng secret của nơi triển khai. `.env` không commit hoặc đưa vào output/publish; chỉ chia sẻ `.env.example` không chứa secret. Refresh token lưu SHA-256 hex 64 ký tự, xoay vòng nguyên giao dịch; không log token gốc hoặc mật khẩu.

### DbContext tối giản — cập nhật theo yêu cầu người dùng 27/10/2026

`AppDbContext` chỉ gồm constructor và một auto-property `DbSet` mỗi bảng. Thêm bảng mới thì thêm một dòng; ưu tiên convention của EF Core và attribute trên model. Không thêm `OnModelCreating` để khai báo lại những gì convention/attribute đã biểu diễn được.

```csharp
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Users> Users { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
}
```

Các chi tiết không theo convention đặt ngay trên model bằng `[Table]`, `[Key]`, `[Column]`, `[Index]`, `[ForeignKey]` và DataAnnotations tương ứng schema SQL có sẵn. Navigation thật thể hiện quan hệ; `RefreshToken.User` dùng FK `UserId`. `Role` là enum, dùng `[Column(TypeName = "varchar(10)")]` để ánh xạ chuỗi. EF Core hỗ trợ chọn chuyển đổi enum sang chuỗi theo kiểu cột đã khai báo: [tài liệu Microsoft](https://learn.microsoft.com/en-us/ef/core/modeling/value-conversions#pre-defined-conversions).

Cột do SQL cung cấp giá trị như `CreatedAt` khai báo trực tiếp trên model:

```csharp
[DatabaseGenerated(DatabaseGeneratedOption.Computed)]
public DateTime CreatedAt { get; set; }
```

Attribute báo EF đọc giá trị từ database; DEFAULT/trigger được quản lý trong script SQL, không được tự sinh chỉ bằng attribute. Baseline auth hiện đặt `SYSUTCDATETIME()` cho `CreatedAt`/`UpdatedAt` khi INSERT; chưa có trigger tự đổi `UpdatedAt` khi UPDATE. Xem [giá trị do database sinh](https://learn.microsoft.com/en-us/ef/core/modeling/relational/default-values#datetime-value-generation).

SQL `DATETIME2` không giữ `DateTime.Kind`; timestamp trong dự án được lưu UTC. Khi trả DTO, mapper gán `DateTimeKind.Utc` bằng `DateTime.SpecifyKind` cho giá trị UTC đọc từ SQL, thay cho converter trong DbContext. Chỉ dùng Fluent API cho ánh xạ thực tế mà convention/attribute không đáp ứng; không thêm tầng cấu hình để lặp lại quy ước.

Với DTO mới (Learning, Dashboard), thời điểm UTC đọc từ SQL được ghi ra JSON có hậu tố `Z` nhờ `UtcDateTimeJsonConverter` đăng ký toàn cục trong `Program.cs`; mapper cũ vẫn dùng `SpecifyKind`, hai cách cho cùng kết quả.

Truy vấn chỉ để hiển thị (danh sách lớn, đọc nội dung đề) dùng truy vấn phẳng chiếu thẳng ra DTO (`AsNoTracking`, `Select`, mỗi bảng một truy vấn theo danh sách ID) như `ExamContentReader`, không nạp cả đồ thị entity bằng `Include` sâu. Entity đầy đủ chỉ dùng khi cần sửa dữ liệu.

## 4. Kiểm tra và cập nhật

- Build khi sửa code; chạy test nghiệp vụ có ý nghĩa cho rủi ro thay đổi. Test transaction/unique/FK/concurrency dùng SQL Server thật và database riêng do test tạo.
- Không thêm test chỉ để kiểm tra cách viết `=>` hoặc phản chiếu từng dòng implementation.
- Cập nhật task, bằng chứng và việc tiếp theo trong [kế hoạch](TOEIC_Development_Plan_v1.0.md). Hợp đồng auth hiện tại ở [TOEIC_Auth_Implementation.md](TOEIC_Auth_Implementation.md).
