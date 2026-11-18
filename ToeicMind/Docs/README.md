# Mục lục tài liệu ToeicMind

Thư mục này giữ tài liệu đang dùng, bằng chứng triển khai và bộ bốn script SQL được cung cấp tại `DATABASE/`. Bố cục triển khai cũ dùng `../DATABASE`; xem `TOEIC_Database_Scripts.md` để chọn đúng đường dẫn và database đích.

## Tài liệu chuẩn

- `TOEIC_Development_Plan_v1.0.md`: điểm vào và nhật ký công việc.
- `TOEIC_UseCase_Spec_v1.3.md`: đặc tả nghiệp vụ hiện hành.
- `TOEIC_DatabaseDesign_v1.3.md`: thiết kế dữ liệu hiện hành.
- `TOEIC_Code_Style.md`: quy ước code của dự án.
- `TOEIC_Database_Scripts.md`: cách dùng nguồn SQL chuẩn và nâng cấp database hiện có.
- `TOEIC_API_Documentation.md`: hợp đồng API tổng hợp hiện hành.

## Tài liệu triển khai theo phạm vi

- `TOEIC_Auth_Implementation.md`: xác thực và phân quyền.
- `TOEIC_Exam_API_Implementation.md`: bộ đề và đề thi.
- `TOEIC_Exam_Content_API.md`: nội dung đề, hướng dẫn và media.
- `TOEIC_Exam_Import_API.md`: nhập nội dung Admin.
- `TOEIC_Learner_API.md`: API người học và thống kê Admin.
- `TOEIC_Performance_Exam_Loading.md`: thiết kế tối ưu tải đề.
- `PERSONALIZATION_2026-11-17.md`: kiểm tra đầu vào, mục tiêu và lộ trình gợi ý bài học (CHG-007).

## Bằng chứng thay đổi còn được tham chiếu

- `API_CLEANUP_2026-11-13.md`: bằng chứng gỡ API cũ.
- `API_OPTIMIZATION_2026-11-13.md`: thay đổi tiếp sau đợt dọn API; không thay thế bằng chứng kiểm tra của báo cáo trước.

## Script SQL

Mọi thay đổi đã được hợp nhất vào [DATABASE/01_schema.sql](DATABASE/01_schema.sql):

- CHG-005: bảng `UserVocabProgress` (A7.2), cột `StudyDay.VocabReviewCount`, FK và index ôn từ.
- CHG-003: index tải đề/API học tập (C2/C3), giữ đủ cột INCLUDE và thứ tự khóa của các index còn cần thiết.
- CHG-006: VIP/VNPay (phần D), gồm cả ba gói mặc định.
- CHG-007: cá nhân hóa và kiểm tra đầu vào (phần E): `LearnerProfile`, `PlacementTest`, `PlacementTestGroup`, `PlacementAttempt`, `Attempt.Scope = PLACEMENT`.

Ba file migration/index rời đã được xóa sau kiểm chứng SQL Server; bản sao phục hồi nằm trong `artifacts/chg006-sql-merge/` và `artifacts/chg003-chg005-sql-merge/`. Khi triển khai dùng đủ bộ bốn file trong `DATABASE`, database đã có chạy `01 → 02 → 03` và bỏ `00`.

## Quy tắc bảo trì

- Bảo trì một bộ `00_create_database.sql`–`03_seed.sql`; cập nhật trực tiếp bộ `DATABASE` đang được dùng, không tạo thêm bản baseline hoặc migration trùng.
- Tài liệu bị thay thế phải ghi rõ bản thay thế và cập nhật mọi liên kết trước khi xóa.
- Báo cáo kiểm chứng chỉ giữ riêng khi chứa bằng chứng không có trong kế hoạch hoặc tài liệu API tổng hợp.
- Không lưu output build, file sao lưu, dữ liệu nhập hoặc dữ liệu kiểm thử trong `Docs`.
