# Chỉ dẫn làm việc với ToeicMind

- Tài liệu chuẩn để tổ chức công việc phát triển là [TOEIC_Development_Plan_v1.0.md](Docs/TOEIC_Development_Plan_v1.0.md). Đọc tài liệu này trước khi triển khai công việc tiếp theo.
- Phong cách code đã được người dùng yêu cầu theo dự án `UserApi`: đọc [TOEIC_Code_Style.md](Docs/TOEIC_Code_Style.md) trước khi sửa code. Giữ Controller → Service → Repository → DbContext; truy vấn dùng chuỗi phương thức LINQ với lambda, phương thức một biểu thức dùng `=>` và trả trực tiếp `Task`.
- Giữ `AppDbContext` tối giản: constructor và một dòng `DbSet<T> { get; set; }` cho mỗi bảng. Ưu tiên convention của EF Core và attribute trên model; chỉ dùng Fluent API khi convention/attribute không đáp ứng ánh xạ thực tế.
- Nguồn SQL chuẩn là `../DATABASE` (thư mục `ToeicMindBE/DATABASE` người dùng đã chạy). Chỉ bổ sung/ALTER phần thiếu trong bộ này, giữ database/dữ liệu hiện có; không tạo baseline rút gọn hoặc bộ SQL thứ hai trong backend. Database đã có không chạy `00_create_database.sql`. Xem `Docs/TOEIC_Database_Scripts.md`.
- Đối chiếu phần liên quan trong `Docs/TOEIC_UseCase_Spec_v1.3.md` và `Docs/TOEIC_DatabaseDesign_v1.3.md` khi sửa nghiệp vụ, API hoặc dữ liệu. Đây là bản mới nhất được cung cấp ngày 30/10/2026.
- Gắn công việc với mã task trong kế hoạch; giữ phạm vi MVP/V2, quan hệ phụ thuộc và tiêu chí nghiệm thu. Cập nhật trạng thái, bằng chứng kiểm tra và việc tiếp theo sau khi làm.
- Issue/ASM còn mở không phải quyết định đã được xác nhận. Giải quyết phần phụ thuộc cần thiết và tiếp tục công việc độc lập; không tự coi giả định là yêu cầu đã chốt.
- Chỉ dẫn mới nhất của người dùng và quyết định đã được xác nhận trong phiên làm việc được ưu tiên. Không hỏi lại quyết định đã có; không tạo thêm vòng phê duyệt cho lựa chọn kỹ thuật thông thường trong phạm vi được giao.
