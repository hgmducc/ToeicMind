# Tích hợp API Admin — 30/10/2026

Trạng thái đã được đối chiếu mã và kiểm thử: [ADMIN_AUDIT.md](ADMIN_AUDIT.md). Hợp đồng chuẩn: [tài liệu backend](../../ToeicMindBE/ToeicMind/Hướng%20dẫn/TOEIC_API_Documentation.md).

| Luồng Admin | API đang gọi |
|---|---|
| Đăng nhập/Google/onboarding/UserDto | login, google-login, me, refresh, logout, set-password, forgot-password, reset-password |
| Tổng quan | GET admin/exam-sets, admin/exams; tổng theo totalCount và bộ lọc DRAFT/PUBLISHED |
| Bộ đề | GET/POST admin/exam-sets, PUT/DELETE admin/exam-sets/{id}, POST restore |
| Danh sách/metadata đề | GET admin/exams, GET/PUT admin/exams/{id}, DELETE, POST restore/unpublish |
| Danh mục | GET exam-catalogs; chỉ dùng phân loại lá và cờ của đúng Part |
| Nhập mới | POST admin/exams/import: metadata, groups, vocab, audioSegments, sourceSheets |
| Lưu lại toàn bộ nội dung | PUT admin/exams/{id}/content; giữ GroupId/QuestionId/ClipId |
| Mở lại/đối soát | GET admin/exams/{id}/groups và GET admin/exams/{id}/import-source |
| Audio/ảnh nhóm | POST admin/exams/{id}/groups/{groupId}/media |
| Audio cắt | POST admin/exams/{id}/groups/{groupId}/segments/{clipId}/media |
| Xem/nghe media | GET admin/media/{id}/url; không hiển thị hoặc log URL ký |
| Hướng dẫn | GET/POST admin/directions, PUT/DELETE admin/directions/{id}; POST admin/directions/seed khi thiếu mặc định; POST media, DELETE admin/media/{id} |
| Kiểm tra/xuất bản | GET publish-check; POST publish sau xác nhận, hiển thị đầy đủ issues |

Frontend có thể lưu/xóa câu hoặc nhóm bằng PUT toàn bộ nội dung; không cần gọi từng endpoint CRUD nhóm/câu. Mọi nội dung trong request được lưu cùng transaction. Media upload là bước riêng, có báo lỗi và thử lại; không tải clip vào slot audio chính.

Không còn dữ liệu mẫu dự phòng khi lỗi API/Excel, publish thành công giả, hoặc báo đã lưu Vocab chỉ vì đã hiển thị ở client. Không có đăng ký Admin/tự cấp role. Các API dành cho Người học không được đưa vào giao diện Admin.
