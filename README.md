# ToeicMind

| Thư mục | Thành phần | Địa chỉ chạy local |
| --- | --- | --- |
| [ToeicMind](ToeicMind/README.md) | API ASP.NET Core (.NET 10) và SQL Server | `http://localhost:5078` |
| [ToeicMindFE](ToeicMindFE/README.md) | Giao diện người học (React, Vite) | `http://localhost:5173` |
| [ToeicMindAdmin](ToeicMindAdmin/README.md) | Giao diện quản trị (React, Vite) | `http://localhost:5174` |
| [samples](samples/) | Dữ liệu mẫu để nhập nội dung | |

## Cấu hình và chạy local

1. Trong `ToeicMind`, cấu hình `.env`, SQL Server và khóa JWT theo [hướng dẫn backend](ToeicMind/README.md#chạy-trên-máy-mới). Bộ SQL của dự án nằm ở [ToeicMind/Docs/DATABASE](ToeicMind/Docs/DATABASE/).
2. Trong `ToeicMindFE` và `ToeicMindAdmin`, sao chép `.env.example` thành `.env` nếu chưa có. Các ứng dụng đọc `.env` trong thư mục riêng của mình.
3. Trong `ToeicMind`, chạy `dotnet run --launch-profile http`.
4. Trong `ToeicMindFE` và `ToeicMindAdmin`, chạy `npm ci` rồi `npm run dev` ở hai terminal riêng. Proxy của Vite trỏ đến API local theo mặc định.

Khi cần đăng nhập Google, dùng cùng Web OAuth client ID cho `Google__ClientId` của backend và `VITE_GOOGLE_CLIENT_ID` ở frontend. Các biến `VITE_*` có thể xuất hiện trong mã gửi đến trình duyệt. Điền khóa JWT, mật khẩu SMTP, khóa R2 và VNPay trong `ToeicMind/.env` hoặc trong cấu hình bí mật của môi trường triển khai.
