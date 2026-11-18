# Triển khai xác thực ToeicMind

Ngày: 27/10/2026. Task: P00-03, phần nền tảng P01-01/P01-02, P02-01–03. Nguồn nghiệp vụ: UC-01–03/BA-01, BR-01–04, DEC-011. Phong cách: [TOEIC_Code_Style.md](TOEIC_Code_Style.md).

## ADR-001 — Cấu trúc, token và ánh xạ auth

- Giữ Controller → Service → Repository → DbContext theo UserApi, dùng các thư mục tính năng hiện có. Route auth là `/api/auth`, theo mẫu UserApi; `/api/v1` trong kế hoạch trước đó là đề xuất chưa triển khai.
- Đăng nhập bằng email được trim và chuyển chữ thường. `username` hiện là tên hiển thị, tối đa 100 ký tự, ánh xạ cột `dbo.Users.UserName` có sẵn trong `ToeicDb`; không thêm điều kiện duy nhất cho tên hiển thị.
- Đăng ký yêu cầu xác nhận mật khẩu. BCrypt dùng mặc định của thư viện, mật khẩu tối thiểu 6 ký tự theo mẫu UserApi và tối đa 72 byte UTF-8 để tránh cắt ngầm. API từ chối trường lạ trên DTO đăng ký, bao gồm trường `role`; service luôn tạo `LEARNER`, `ACTIVE`.
- Access token ký HS256, hạn mặc định 15 phút; refresh token 7 ngày. Các giá trị nằm trong cấu hình, có thể điều chỉnh theo môi trường. JWT kiểm tra chữ ký, thuật toán, issuer, audience, lifetime với `ClockSkew = 0`.
- Claims gồm ID, tên hiển thị, email, vai trò và `jti`. API được bảo vệ kiểm tra lại user trong database mỗi request; tài khoản khóa/xóa hoặc vai trò đã thay đổi làm token cũ bị từ chối ngay.
- Refresh token là 64 byte ngẫu nhiên mật mã, trả client dạng Base64; database chỉ lưu SHA-256 dạng hex `CHAR(64)`. Response có cả hạn của access token và refresh token.
- Refresh thu hồi token cũ và thêm token mới trong cùng transaction. UPDATE có điều kiện `RevokedAt IS NULL AND ExpiresAt > UTC now`, kiểm tra số dòng để chỉ một request tiêu thụ token cũ. Nếu insert thất bại, transaction rollback cả việc thu hồi.
- Gửi lại token đã thu hồi hoặc thua cạnh tranh xoay vòng sẽ bị từ chối và thu hồi các refresh token còn hạn của user, như cơ chế phát hiện dùng lại trong UserApi. Client phải tuần tự hóa refresh cho các request/tab dùng chung token.
- Logout thu hồi refresh token được gửi, có thể gọi lại và không cần access token còn hạn. Access token đã cấp còn hiệu lực đến hạn nếu user vẫn ACTIVE; client phải xóa cả hai token. Không thêm bảng session/blacklist JWT.
- Mặc định CORS không mở origin; thêm origin frontend chính xác vào `Cors:AllowedOrigins` khi tích hợp.
- Theo cập nhật phong cách 27/10/2026, `AppDbContext` chỉ có constructor và hai auto-property DbSet. Ánh xạ tên/kiểu cột, unique index và timestamp sinh từ SQL đặt bằng attribute trên `Users`/`RefreshToken`; quan hệ FK thể hiện qua navigation `RefreshToken.User`. Không có `OnModelCreating`; mapper gán UTC cho timestamp trả DTO. Script SQL tiếp tục quản lý DEFAULT/CHECK/FK thực tế; không đổi schema/API trong đợt rút gọn.

Các giá trị kỹ thuật trên là cấu hình triển khai trong phạm vi người dùng giao hoàn thiện auth. Lưu token cụ thể phía frontend và luồng logout trong bài thi vẫn thuộc tích hợp frontend/P06/P08; không tự đóng các ASM/issue ngoài auth.

## API

| Method | Route | Input | Kết quả |
|---|---|---|---|
| POST | `/api/auth/register` | `username`, `email`, `password`, `confirmPassword` | 201 UserDto; 400 dữ liệu sai/trường lạ; 409 email trùng |
| POST | `/api/auth/login` | `email`, `password` | 200 AuthResponseDto; 401 sai thông tin hoặc khóa |
| POST | `/api/auth/refresh` | `refreshToken` | 200 cặp token mới; 401 không hợp lệ/hết hạn/thu hồi/khóa |
| POST | `/api/auth/logout` | `refreshToken` | 204; sau đó client xóa cả hai token |
| GET | `/api/auth/me` | Header `Authorization: Bearer <accessToken>` | 200 UserDto của chính user; 401 token sai/hết hạn/user bị khóa |
| POST | `/api/auth/set-password` | Header Bearer, `newPassword`, `confirmNewPassword` | 200 tạo mật khẩu lần đầu & thu hồi refresh token; 400 đã có mật khẩu/sai xác nhận; 401 chưa đăng nhập |
| PUT | `/api/auth/change-password` | Header Bearer, `oldPassword`, `newPassword`, `confirmNewPassword` | 200 thành công & thu hồi refresh token cũ; 400 sai xác nhận/trùng mk cũ; 401 sai mk cũ |
| POST | `/api/auth/forgot-password` | `email` | 200 gửi OTP (chống dò email); 429 yêu cầu gửi lại < 60s (cooldown) |
| POST | `/api/auth/reset-password` | `email`, `otp`, `newPassword`, `confirmNewPassword` | 200 đặt lại mk thành công & thu hồi token cũ; 400 sai OTP/hết hạn/quá 5 lần thử |
| POST | `/api/auth/google-login` | `idToken` | 200 AuthResponseDto (liên kết hoặc tạo mới LEARNER); 401 token Google sai hoặc tài khoản bị khóa |

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<opaque-token>",
  "expiresAt": "<UTC>",
  "refreshExpiresAt": "<UTC>",
  "user": {
    "userId": 1,
    "username": "Nguyen Van A",
    "email": "learner@example.com",
    "role": "LEARNER",
    "status": "ACTIVE",
    "hasPassword": true,
    "createdAt": "<UTC>"
  }
}
```

Lỗi nghiệp vụ có `code`, `message`, `traceId`. Mã chính: `EMAIL_EXISTS`, `PASSWORD_MISMATCH`, `PASSWORD_TOO_LONG`, `INVALID_CREDENTIALS`, `NO_PASSWORD_SET`, `PASSWORD_ALREADY_SET`, `INVALID_REFRESH_TOKEN`, `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`. Lỗi validation thêm `errors` theo trường; không trả PasswordHash hoặc entity. Lỗi hệ thống không dự kiến qua ExceptionHandler/ProblemDetails và trace ID, không trả nội dung SQL.

Mẫu gọi API ở [ToeicMind.Auth.http](../ToeicMind.Auth.http). Client giữ cặp token mới sau mỗi lần refresh và dùng một refresh đang chạy chung cho các request đồng thời. Không ghi token thật vào file HTTP/source control; lựa chọn nơi lưu token của frontend cần được chốt khi tích hợp.

## Chạy cục bộ

1. Chuỗi kết nối nằm trong `.env` với khóa `ConnectionStrings__DefaultConnection`; `appsettings.json` chỉ giữ giá trị rỗng. Cấu hình local hiện được giữ trên máy, không commit. Hướng dẫn tạo môi trường mới, sinh khóa và Git nằm trong [README](../README.md).
2. Database đã có: cập nhật bằng bộ gốc `../DATABASE/01_schema.sql`, sau đó `02_views_procs_triggers.sql` và `03_seed.sql`. Auth được gộp trong schema đầy đủ; không còn baseline auth riêng trong backend. Không chạy `00_create_database.sql` để dựng lại database. Xem [hướng dẫn cập nhật tại chỗ](TOEIC_Database_Scripts.md).
3. Development: sao chép `.env.example` thành `.env`, điền `Jwt__Key` ngẫu nhiên tối thiểu 32 byte, kết nối SQL và các mục SMTP/Google cần dùng. `DotNetEnv` 3.2.0 nạp file từ content root, giữ ưu tiên biến môi trường có sẵn; tham số dòng lệnh có ưu tiên cao nhất. User Secrets vẫn được hỗ trợ nhưng có ưu tiên thấp hơn `.env`. Không đưa khóa thật vào JSON hoặc template. `.env` bị bỏ qua bởi Git và bị loại khỏi output/publish.
4. Staging/Production: cung cấp `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpireMinutes`, `Jwt__RefreshTokenDays` và `ConnectionStrings__DefaultConnection` bằng cấu hình môi trường/secret của nơi triển khai. User Secrets chỉ được nạp mặc định trong Development.
5. `dotnet run --project ToeicMind.csproj --launch-profile http`; HTTPS profile dùng `--launch-profile https`. Cấu hình JWT được kiểm tra khi khởi động; khóa thiếu/ngắn hoặc thời hạn sai sẽ làm ứng dụng dừng.

## Swagger UI

- Swagger UI bật trong Development tại `http://localhost:5078/swagger` hoặc `https://localhost:7283/swagger` theo launch profile; IDE được cấu hình mở trang `swagger` khi chạy.
- Giao diện dùng `Swashbuckle.AspNetCore.SwaggerUI` 10.3.1, đọc tài liệu OpenAPI hiện có tại `/openapi/v1.json`. Hướng dẫn tích hợp UI với OpenAPI có sẵn: [Microsoft](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/using-openapi-documents).
- Gọi login trong Swagger, sao chép giá trị `accessToken`, nhấn **Authorize**, dán token rồi xác nhận. Scheme HTTP Bearer tự thêm header `Authorization: Bearer <token>`; không nhập refresh token vào ô này.
- Các operation có `[Authorize]` dùng yêu cầu Bearer; operation có `[AllowAnonymous]` như register/login/refresh/logout vẫn công khai. `/api/auth/me` có yêu cầu xác thực trong tài liệu và API thật.
- Kiểm tra 28/10/2026: build solution thành công, 0 warning/0 error; smoke Development trả 200 cho UI, JavaScript và JSON, đủ 9 route auth (gồm đổi mật khẩu, quên mật khẩu OTP, đặt lại mật khẩu và đăng nhập Google), security scheme HTTP Bearer đúng, chỉ `me` và `change-password` yêu cầu token; gọi không token trả 401. Tiến trình kiểm tra đã được dừng.

## Kiểm thử

```powershell
dotnet restore ToeicMind.sln
dotnet build ToeicMind.sln --no-restore
```

Project kiểm thử tự động đã được gỡ khỏi dự án ngày 06/11/2026; các số liệu kiểm thử cũ không còn bằng chứng đi kèm.

Smoke check Development bằng cấu hình thật của máy: khởi động Kestrel tại `127.0.0.1:5089`, OpenAPI trả 200 và đủ 9 route auth; tiến trình smoke đã dừng.

Phạm vi chưa nghiệm thu: luồng frontend, logout trong bài thi, schema/seed TOEIC ngoài auth và thử tải triển khai.
