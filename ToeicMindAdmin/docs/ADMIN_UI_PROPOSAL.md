# Đề xuất Kiến trúc & Giao diện Trang Quản trị ToeicMind Admin

Tài liệu thiết kế phiên bản 1.1 — Cập nhật ngày 30/10/2026.
Trạng thái triển khai và kiểm thử mới nhất ở [ADMIN_AUDIT.md](ADMIN_AUDIT.md); các mục dưới đây là đề xuất, không phải bằng chứng đã hoàn thành.
Tương thích hoàn toàn với [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) và [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md).

---

## 1. Mục tiêu & Định hướng thiết kế
Trang Quản trị **ToeicMindAdmin** phục vụ cho người vận hành, giáo viên và ban quản trị nền tảng luyện thi TOEIC.

- **Phong cách thị giác**: Thừa hưởng token chuẩn của hệ thống ToeicMind (xanh lá trầm `#25634d`, nền canvas sáng `#f8faf7`, panel xanh nhạt `#eaf0e5`, viền `#dce4db`).
- **Trọng tâm người dùng**: Tối ưu khả năng thao tác dữ liệu, tìm kiếm nhanh, kiểm duyệt câu hỏi, audio nghe, hình ảnh Part 1-4 và theo dõi tiến độ của học viên.
- **Tính phản hồi (Responsive)**: Hoạt động mượt mà trên Desktop (mặc định cho admin), hỗ trợ tablet và di động khi cần tra cứu nhanh.

---

## 2. Các phân hệ chức năng chính (Core Modules)

### 2.1. Tổng quan (Dashboard Overview)
- **Thẻ chỉ số (KPIs)**:
  - Tổng số Bộ đề thi & số lượng Đề thi trong hệ thống.
  - Số lượng đề thi đã xuất bản (`PUBLISHED`) và đề thi bản nháp (`DRAFT`).
  - Trạng thái giám sát Backend API (`http://localhost:5078/api`).
- **Lối tắt hành động nhanh**:
  - Chuyển hướng nhanh tới trình tải lên thư mục đề thi và biên soạn trực tiếp.
  - Xem danh sách đề thi gần đây.
  - Bảng tra cứu quy chuẩn 7 phần thi TOEIC (Full 200 câu).

### 2.2. Quản lý Bộ đề & Đề thi (Exam Sets & Exams Management)
- **Quản lý Bộ đề (E06 - E11)**:
  - Tạo mới bộ đề (`POST /api/admin/exam-sets`).
  - Sửa tên, mô tả bộ đề (`PUT /api/admin/exam-sets/{id}`).
  - Xóa mềm / Khôi phục bộ đề (`DELETE`, `POST /restore`).
  - Lọc danh sách đề thi theo từng bộ đề.
- **Quản lý Đề thi (E12 - E17)**:
  - Lọc theo Bộ đề, Trạng thái (`DRAFT` / `PUBLISHED`), Thùng rác (`isDeleted`).
  - Tìm kiếm tức thời theo Tên đề hoặc Mã đề (`examCode`).
  - Chuyển trạng thái Xuất bản (`POST /publish`) / Đưa về nháp (`POST /unpublish`).
  - Kiểm tra điều kiện xuất bản (`GET /publish-check`).
  - Mở trực tiếp vào Trình biên soạn & Chỉnh sửa 7 Parts.

### 2.3. Tải lên Thư mục Bộ đề & Trình Biên soạn trực tiếp (Exam Upload & Live Direct Editor)
- **Cơ chế tải lên 1 thư mục hoàn chỉnh**:
  - Thư mục gồm: 1 file Excel (`.xlsx` hoặc `.csv`) chứa 200 câu hỏi và 1 thư mục con chứa toàn bộ media/audio (`.mp3`, `.wav`, `.jpg`, `.png`).
  - Trình duyệt quét tệp qua `webkitdirectory` hoặc Drag & Drop.
  - Tự động bóc tách và liên kết âm thanh, hình ảnh vào từng nhóm câu hỏi tương ứng.
  - Cung cấp nút "Nạp dữ liệu mẫu (ETS TOEIC 2024 - 200 câu)" để thử nghiệm ngay lập tức.
  - Cung cấp nút tải về mẫu Excel chuẩn định dạng TOEIC 7 Parts.
- **Trình Biên soạn & Chỉnh sửa trực tiếp 7 Parts (Live Direct Editor)**:
  - Thanh Tabs điều hướng 7 Parts (Part 1 -> Part 7) hiển thị số câu hiện có / số câu chuẩn và trạng thái âm thanh, hình ảnh.
  - Chỉnh sửa trực tiếp từng nhóm câu hỏi:
    - **Audio Player**: Nghe thử trực tiếp file âm thanh của nhóm (từ file cục bộ hoặc Cloudflare R2), cho phép đổi file audio.
    - **Image Viewer**: Xem trước ảnh Part 1 / biểu đồ Part 3-4 / bài đọc ảnh Part 7, cho phép thêm/đổi ảnh.
    - **Passage HTML**: Xem và sửa văn bản đoạn văn Part 6 & Part 7.
    - **Transcript & Translation**: Sửa lời thoại tiếng Anh và bản dịch tiếng Việt.
    - **Danh sách câu hỏi con**: Sửa nội dung câu hỏi, đổi độ khó (Level 1-4), tích chọn đáp án đúng (A, B, C, D), sửa text phương án, sửa giải thích chung và giải thích từng phương án theo quy chuẩn backend (`A: ... - Đúng/Sai: ...`).
- **Thanh công cụ dính đáy màn hình (Sticky Action Bar)**:
  - Thống kê tiến độ trực quan (X/200 câu).
  - Nút "Kiểm tra xuất bản (Publish Check)": Chạy kiểm tra 7 điều kiện xuất bản, hiển thị modal liệt kê chi tiết các lỗi kèm nút nhảy tới sửa ngay.
  - Nút "Lưu đề thi lên Hệ thống (Save Draft)": Lưu metadata, lưu nhóm câu hỏi và upload media lên Cloudflare R2 qua API.
  - Nút "Xuất bản chính thức (Publish)": Kích hoạt đề thi cho người học.

### 2.4. Thông tin Tài khoản & Phiên kiểm thử (UserDto & Admin Profile)
- Hiển thị đầy đủ 7 trường `UserDto` và JSON của phiên đăng nhập quản trị.
- Cho phép làm mới thông tin từ `GET /api/auth/me`.
- Thiết lập mật khẩu dự phòng khi đăng nhập Google chưa có mật khẩu.
- Đăng xuất an toàn và xóa phiên lưu trữ.

---

## 3. Kiến trúc Mã nguồn Frontend
- `src/lib/apiClient.js`: Bổ sung `putJson`, `deleteJson`, `uploadMultipart`, từ điển lỗi backend.
- `src/features/exams/services/examService.js`: Kết nối 34 endpoint đề thi Admin (E01, E06-E34).
- `src/features/exams/utils/folderParser.js`: Bóc tách thư mục tải lên, map media tự động, sinh bộ đề mẫu 200 câu.
- `src/features/exams/components/`:
  - `AdminLayout.jsx`: Khung sườn quản trị với Sidebar, Topbar, Brand, Profile Admin.
  - `DashboardView.jsx`: Trang tổng quan, KPIs, hoạt động gần đây.
  - `ExamManagementView.jsx`: Quản lý bộ đề và danh sách đề thi.
  - `ExamUploadView.jsx`: Tải lên thư mục bộ đề và trình chỉnh sửa trực tiếp 7 Parts.
  - `ExamQuestionEditor.jsx`: Trình xem/sửa chi tiết từng nhóm câu hỏi, audio player, image preview, bảng đáp án.
  - `PublishCheckModal.jsx`: Modal hiển thị kết quả kiểm tra điều kiện xuất bản đề thi.
- `src/styles/admin.css`: Quy chuẩn giao diện quản trị hiện đại, chuẩn token của Design System.
