# ToeicMind Backend

ASP.NET Core Web API (.NET 10), SQL Server. Tài liệu tổ chức công việc: [kế hoạch phát triển](Docs/TOEIC_Development_Plan_v1.0.md); hợp đồng endpoint, request/response và mã lỗi: [API Documentation](Docs/TOEIC_API_Documentation.md); cấu hình và kiểm thử auth: [triển khai auth](Docs/TOEIC_Auth_Implementation.md).

## Chạy trên máy mới

1. Cài .NET SDK 10 và chuẩn bị database `ToeicDb` bằng bộ SQL trong [Docs/DATABASE](Docs/DATABASE/). Với database đã có, cập nhật tại chỗ theo thứ tự `01_schema.sql` → `02_views_procs_triggers.sql` → `03_seed.sql`. Xem [hướng dẫn database](Docs/TOEIC_Database_Scripts.md) để chọn lệnh tương ứng với môi trường. API không chạy DDL khi khởi động.
2. Chuẩn bị chuỗi kết nối SQL phù hợp để điền vào `.env` sau bước 3. Nếu dùng SQL Authentication, mật khẩu chỉ nằm trong `.env`.
3. Nếu chưa có `.env`, tạo file từ mẫu và sinh khóa JWT ngẫu nhiên bằng PowerShell; lệnh không in khóa ra màn hình. Máy hiện tại đã có `.env`, hãy giữ nguyên file đó:

```powershell
if (Test-Path -LiteralPath .env) {
    throw '.env da ton tai; giu nguyen file hien co.'
}
Copy-Item .env.example .env -ErrorAction Stop
$jwtBytes = New-Object byte[] 64
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($jwtBytes)
$rng.Dispose()
$jwtKey = [Convert]::ToBase64String($jwtBytes)
$envContent = Get-Content -Raw -LiteralPath .env
$envContent = $envContent.Replace("Jwt__Key=''", "Jwt__Key='$jwtKey'")
[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $envContent, [System.Text.UTF8Encoding]::new($false))
```

4. Điền `ConnectionStrings__DefaultConnection` trong `.env` theo SQL Server của bạn và các cấu hình tùy chọn nếu cần:
   - Gửi OTP thật: `Email__SenderEmail`, `Email__Username`, `Email__Password` (mật khẩu ứng dụng SMTP), cùng host/port/TLS của nhà cung cấp. Khi chưa cấu hình SMTP, code hiện tại ghi OTP vào log để thử local; không dùng chế độ này khi triển khai thật.
   - Đăng nhập Google: điền Web client ID của dự án Google vào `Google__ClientId`; frontend dùng cùng client ID. Backend xác minh ID token, không cần Google client secret. Chưa cấu hình thì chưa sử dụng luồng Google thật.
   - Media đề thi: `R2__Endpoint`, `R2__BucketName`, `R2__AccessKeyId`, `R2__SecretAccessKey`, region `auto`. Chỉ ADMIN được upload/xem trước URL ký; mặc định URL 10 phút, audio 25 MiB, image 10 MiB. Không commit note khóa hoặc `.env`.
5. Chạy API:

```powershell
dotnet restore ToeicMind.sln
dotnet run --project ToeicMind.csproj --launch-profile http
```

Mở `http://localhost:5078/swagger`. `.env` được nạp tự động chỉ trong Development, từ thư mục chứa project. Thứ tự ưu tiên: tham số dòng lệnh → biến môi trường đã có → `.env` → User Secrets → `appsettings*.json`. Tham khảo thư viện [DotNetEnv](https://github.com/tonerdo/dotnet-env) về định dạng và `NoClobber`.

Staging/Production: khai báo các biến tương ứng trong phần cấu hình secret của nơi triển khai. `.env` không được nạp tại đó và bị loại khỏi output/publish. JWT issuer/audience/thời hạn có mặc định trong JSON; có thể ghi đè qua `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpireMinutes`, `Jwt__RefreshTokenDays`.

### Lỗi cổng 5078 đang được sử dụng

Nếu `dotnet run` báo `Failed to bind to address http://127.0.0.1:5078: address already in use`, kiểm tra tiến trình đang giữ cổng:

```powershell
Get-NetTCPConnection -LocalPort 5078 -State Listen |
    Select-Object LocalAddress, LocalPort, OwningProcess
```

Nếu backend đã chạy, có thể mở `http://localhost:5078/swagger` để dùng bản đó. Khi cần chạy lại, nhấn `Ctrl+C` tại terminal của backend cũ. Nếu không còn terminal đó, kiểm tra PID trong `OwningProcess` bằng `Get-Process -Id <PID>`, chỉ dừng tiến trình backend đã xác định bằng `Stop-Process -Id <PID>`, rồi chạy lại lệnh ở bước 5. Giữ cổng 5078 để frontend tiếp tục gọi đúng địa chỉ đã cấu hình.

## Git và bí mật

Các quy tắc trong [`.gitignore` ở thư mục gốc](../.gitignore) áp dụng cho cả ba ứng dụng. Các file `.env.example` cung cấp giá trị mẫu cho người clone repo. Giữ file `.env` chứa giá trị thật trên từng máy.

`.gitignore` không chặn việc nhập khóa vào `appsettings.json` vì file này vẫn được Git theo dõi. Các trường kết nối SQL, JWT key, SMTP và Google phải để trống trong JSON. `Google__ClientId` chỉ điền ở `.env`; backend hiện tại không sử dụng `Google:ClientSecret`.

Kiểm tra từ thư mục gốc trước khi commit:

```powershell
git check-ignore -v ToeicMind/.env ToeicMindFE/.env ToeicMindAdmin/.env
git diff --cached --stat
```

Nếu đã lộ bí mật, thu hồi hoặc đổi giá trị tại nhà cung cấp rồi xử lý lịch sử Git. Xem [hướng dẫn GitHub về dữ liệu nhạy cảm](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

Để đưa mã lên GitHub/GitLab, tạo repository trống (không khởi tạo README/license/.gitignore), rồi thay URL mẫu và chạy:

```powershell
git remote add origin https://github.com/TAI_KHOAN/ToeicMindBE.git
git push -u origin main
```

Đăng nhập khi Git yêu cầu; không đặt token/mật khẩu vào URL. Chưa có remote thì commit vẫn được lưu trên máy, chưa xuất hiện trên GitHub/GitLab.

## Kiểm thử

```powershell
dotnet restore ToeicMind.sln
dotnet build ToeicMind.sln --no-restore
```

Dự án hiện không có project kiểm thử tự động. Kiểm tra bằng build sạch (0 lỗi, 0 cảnh báo) và chạy thử API qua Swagger hoặc các file `*.http`.
