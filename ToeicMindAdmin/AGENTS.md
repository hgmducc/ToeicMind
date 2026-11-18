# Chỉ dẫn phát triển ToeicMindAdmin

- Trước khi chỉnh giao diện, đọc [quy chuẩn thiết kế chung](docs/DESIGN_SYSTEM.md) và [tích hợp xác thực](docs/AUTH_INTEGRATION.md).
- `docs/DESIGN_SYSTEM.md` trong repository này là tài liệu chuẩn cho cả ToeicMindAdmin và ToeicMindFE. Cập nhật tài liệu khi thay đổi quy ước chung; tránh tạo thêm một bản quy chuẩn độc lập.
- Giữ cấu trúc theo trách nhiệm: component dùng lại trong `src/components`, nghiệp vụ xác thực trong `src/features/auth`, giao tiếp HTTP trong tầng dịch vụ, token giao diện trong `src/styles/tokens.css`.
- Hai ứng dụng build độc lập. Khi sửa token/component giao diện dùng chung, đồng bộ bản tương ứng trong `../ToeicMindFE`; không import mã trực tiếp từ thư mục frontend bên cạnh.
- Admin chỉ có đăng nhập. Chỉ báo thành công khi API trả `user.role === 'ADMIN'`; không bổ sung đăng ký hoặc tự cấp quyền quản trị.
- Phạm vi mới (29/10/2026): lưu access/refresh token sau đăng nhập hợp lệ; Google chưa có mật khẩu phải có onboarding thiết lập hoặc bỏ qua; sau đăng nhập/đăng ký hiển thị trang UserDto để kiểm thử. Không lưu mật khẩu. Đăng ký email chỉ trả UserDto, không tự tạo token.
- Không ghi thông tin bí mật hoặc tài khoản thật vào source, log hay tài liệu. Đối chiếu mã backend trong `../ToeicMindBE/ToeicMind` khi thay đổi hợp đồng API.
- Kiểm tra build, các trạng thái form bị ảnh hưởng và màn hình nhỏ sau thay đổi; ghi rõ kiểm tra dùng API thật hay mock. Không ghi nhận kiểm tra chưa chạy là đã đạt.
- Chỉ dẫn mới nhất của người dùng và quyết định đã xác nhận trong phiên làm việc được ưu tiên; không tự thêm vòng xin phép cho lựa chọn kỹ thuật thông thường trong phạm vi đã giao.
