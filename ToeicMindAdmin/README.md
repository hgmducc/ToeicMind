# ToeicMind Admin

Giao diện đăng nhập dành cho quản trị viên, sử dụng React và Vite. Trang chỉ chấp nhận tài khoản có vai trò `ADMIN`; không có đăng ký. Đăng nhập thành công hiển thị thông báo tại chỗ, chưa chuyển trang hoặc lưu phiên đăng nhập.

## Chạy cục bộ

```powershell
npm install
npm run dev
```

Mở `http://localhost:5174`. Cổng được cố định để chạy song song với ToeicMindFE tại `http://localhost:5173`.

Khởi động backend từ thư mục `../BE/ToeicMind`:

```powershell
dotnet run --launch-profile http
```

Backend HTTP mặc định ở `http://localhost:5078`. Tham khảo `.env.example` khi cấu hình môi trường; giữ nguyên `.env` hiện có nếu đã cấu hình. Hướng dẫn proxy, API và xử lý lỗi nằm trong [AUTH_INTEGRATION.md](docs/AUTH_INTEGRATION.md).

## Tài liệu phát triển

- [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md): quy chuẩn giao diện chung của hai frontend, là tài liệu chuẩn cho những lần phát triển tiếp theo.
- [AUTH_INTEGRATION.md](docs/AUTH_INTEGRATION.md): hợp đồng backend, cấu hình và checklist kiểm tra đăng nhập/đăng ký.
- [AGENTS.md](AGENTS.md): chỉ dẫn làm việc với repository.

Kiểm tra bản build bằng `npm run build`; xem bản build bằng `npm run preview`. Lệnh build kiểm tra đóng gói frontend, không thay thế kiểm thử với backend thật.
