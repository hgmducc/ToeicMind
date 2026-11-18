# ToeicMind FE

Giao diện người học ToeicMind, sử dụng React và Vite: đăng nhập/đăng ký, trang chủ học tập, đề thi (Luyện thi liền mạch và Luyện tập), Nghe/Đọc theo Part, Nghe chép, từ vựng (mỗi từ được hỏi bằng 2–3 dạng câu hỏi ngẫu nhiên để đánh giá độ quen thuộc), lịch sử, báo lỗi và nâng cấp VIP qua VNPay. Tích hợp từ giao diện HTML `LEARNER`; chi tiết ở [LEARNER_INTEGRATION.md](docs/LEARNER_INTEGRATION.md).

## Chạy cục bộ

```powershell
npm install
npm run dev
```

Mở `http://localhost:5173`. Trang quản trị ToeicMindAdmin chạy riêng tại `http://localhost:5174`.

Khởi động backend từ thư mục `../ToeicMind`:

```powershell
dotnet run --launch-profile http
```

Backend HTTP mặc định ở `http://localhost:5078`. Tham khảo `.env.example` khi cấu hình môi trường; giữ nguyên `.env` hiện có nếu đã cấu hình. Hướng dẫn proxy, API và xử lý lỗi nằm trong [AUTH_INTEGRATION.md](docs/AUTH_INTEGRATION.md).

## Tài liệu phát triển

- [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md): điểm truy cập quy chuẩn giao diện chung, dẫn đến tài liệu chuẩn tại ToeicMindAdmin.
- [AUTH_INTEGRATION.md](docs/AUTH_INTEGRATION.md): hợp đồng backend, cấu hình và checklist kiểm tra đăng nhập/đăng ký.
- [LEARNER_INTEGRATION.md](docs/LEARNER_INTEGRATION.md): trang và API của giao diện người học, luồng học từ vựng 2–3 dạng câu hỏi, **hướng dẫn test thanh toán VNPay**, bằng chứng kiểm tra và hạn chế.
- [AGENTS.md](AGENTS.md): chỉ dẫn làm việc với repository.

Lệnh kiểm tra: `npm test` (đơn vị), `npm run lint`, `npm run build`, `npm run check:payment` (cấu hình thanh toán VNPay, không in bí mật) và `npm run test:ui` (Chromium + backend giả; cần Playwright, xem LEARNER_INTEGRATION.md mục 5). Xem bản build bằng `npm run preview`. Lệnh build kiểm tra đóng gói frontend, không thay thế kiểm thử với backend thật.
