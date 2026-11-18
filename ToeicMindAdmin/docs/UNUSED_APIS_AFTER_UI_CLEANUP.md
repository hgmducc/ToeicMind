# API sau khi tinh gọn giao diện và dọn backend

Cập nhật 13/11/2026. Backend: `G:\ToeicMind\ToeicMind`. Đã thực hiện yêu cầu xóa API sau khi đối chiếu Admin (`src/`) và Người học (`../LEARNER/js`). Đây là kết quả rà soát mã nguồn, không phải thống kê traffic production hoặc client ngoài workspace.

## 1. Đã xóa 12 endpoint trong đợt dọn backend

| Method | Route đã gỡ | Lý do |
| --- | --- | --- |
| POST | `/api/admin/exams/import-v1` | Bỏ trang Nhập JSON |
| PUT | `/api/admin/exams/{examId}/import-v1` | Bỏ trang Nhập JSON |
| GET | `/api/exam-sets/{id}` | Không có lời gọi trong hai client hiện tại |
| GET | `/api/exams/{id}` | Người học dùng danh sách/outline/modes/nội dung từng Part |
| DELETE | `/api/admin/directions/{id}` | Bỏ hướng dẫn riêng theo đề |
| GET | `/api/admin/users/{id}` | UI lấy metadata người dùng từ danh sách |
| GET | `/api/admin/exam-sets/{id}` | UI lấy metadata từ danh sách/response tạo, sửa, khôi phục |
| GET | `/api/admin/exams/{examId}/groups/{groupId}` | UI đọc danh sách nhóm của đề |
| POST | `/api/admin/exams/{examId}/groups` | UI lưu cả gói nội dung |
| PUT | `/api/admin/exams/{examId}/groups/{groupId}` | UI lưu cả gói nội dung |
| DELETE | `/api/admin/exams/{examId}/groups/{groupId}` | Nhóm bị bỏ được xử lý trong transaction lưu gói |
| DELETE | `/api/admin/exams/{examId}/groups/{groupId}/questions/{questionId}` | Câu bị bỏ được xử lý khi lưu gói |

Các wrapper frontend thừa đã được gỡ khỏi [adminApi.js](../src/features/admin/services/adminApi.js) và [examService.js](../src/features/exams/services/examService.js). Đã gỡ các phương thức service/interface và mapper/DTO chỉ phục vụ route bị xóa; giữ repository còn được nhập Excel và media sử dụng.

## 2. Endpoint đã gỡ ở đợt trước

`POST /api/admin/users/{id}/reset-password`: đã gỡ nút/dialog, service frontend, controller, service/interface backend và DTO. Đã kiểm chứng lại trong đợt này để bảo đảm không xuất hiện trở lại.

Tổng số operation bị loại được kiểm tra là **13**, gồm 12 mới và 1 đã gỡ trước đó.

## 3. API vẫn còn được sử dụng

| Nhóm | API giữ lại | Nơi sử dụng |
| --- | --- | --- |
| Danh sách người học | `GET /api/exam-sets`, `GET /api/exams` | `../LEARNER/js/pages/tests.js` |
| Vào đề/làm bài | `GET /api/exams/{id}/modes`, `/outline`, `/directions`, `/parts/{partNo}`, `/parts/{partNo}/media` | Ứng dụng Người học |
| Nhập/lưu Excel | `POST /api/admin/exams/import`, `PUT /api/admin/exams/{examId}/content`, `GET /api/admin/exams/{examId}/import-source` | Trình biên soạn Admin |
| Đọc nhóm | `GET /api/admin/exams/{examId}/groups` | Trình biên soạn/xem trước |
| Tổng quan | `GET /api/admin/dashboard/summary`, `/activity`, `/exams`, `/hardest-questions` | Tổng quan sau khi gộp Thống kê |
| Hướng dẫn | `GET/POST /api/admin/directions`, `PUT /api/admin/directions/{id}`, `POST /api/admin/directions/seed` | Quản lý bộ hướng dẫn chung |
| Media | Upload nhóm/clip/hướng dẫn, URL ký và xóa media | Trình biên soạn, trang Media và Hướng dẫn |
| Phiên | `POST /api/auth/refresh`, `GET /api/auth/me` | HTTP client, khôi phục phiên và tài khoản |
| Mật khẩu chủ tài khoản | `POST /api/auth/set-password`, `/forgot-password`, `/reset-password` | Chủ tài khoản tự thiết lập/quên mật khẩu |

Xóa trang Nhập JSON không có nghĩa xóa API nhận JSON từ dữ liệu Excel. Bỏ nút refresh token thủ công không có nghĩa bỏ API refresh phiên. Không xóa API danh sách chỉ vì trang xem thử của Admin đã gỡ.

## 4. Kiểm chứng và sao lưu

- Backend build đạt, 0 warning/error. OpenAPI binary mới có 98 operation.
- HTTP/OpenAPI smoke trên tiến trình tách biệt: không còn 13 operation bị loại; HTTP trả 404/405. Có 18 operation cần giữ được kiểm tra còn route/security metadata và trả 401 khi không có token.
- Smoke không kết nối database thật, không đăng nhập hoặc chạy CRUD/R2 thật; tiến trình kiểm thử đã dừng.
- Frontend build và 59/59 unit test đạt; Chromium với API mock đạt cho dashboard, menu, thông báo điện thoại, hướng dẫn và tài khoản.
- Không thay schema hoặc xóa dữ liệu/media. Source backend trước khi dọn có thể khôi phục từ `G:\ToeicMind\ToeicMind\artifacts\api-cleanup-backup-20261113-180835.zip`.
- Backend chính đang chạy chưa bị dừng; cần triển khai/khởi động lại để nhận việc gỡ route.

Danh sách đầy đủ về phạm vi mã phụ thuộc, lý do giữ repository và bằng chứng: [API_CLEANUP_2026-11-13.md](../../ToeicMind/Docs/API_CLEANUP_2026-11-13.md).
