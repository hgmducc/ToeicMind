# Tích hợp xác thực ToeicMind

Cập nhật 29/10/2026 theo yêu cầu onboarding Google và trang kiểm thử UserDto. Phạm vi P02-01 (đăng ký), P02-02 (đăng nhập). Backend đối chiếu thực tế: `../../ToeicMindBE/ToeicMind`, Controller/AuthService/GoogleAuthService và DTO trong DTOs/Auth.

Cập nhật 31/10/2026: Admin có menu quản trị, sau đăng nhập vẫn mở UserDto. HTTP client, AuthLayout và focus lỗi quên mật khẩu được đồng bộ với FE. Bộ hồi quy auth mở rộng đã qua cả quên mật khẩu/OTP/reset; Google/OTP sử dụng mock. Kết quả nghiệp vụ Admin hiện hành tại [ADMIN_AUDIT.md](ADMIN_AUDIT.md).

> Cập nhật 18/11/2026 (CHG-008):
> - Trang `/account` (`AdminAccountPage.jsx`) bỏ khối "Chi tiết dữ liệu tài khoản (UserDto)", nút "Làm mới thông tin" và dòng "Phiên truy cập có hiệu lực đến".
> - Quản trị viên tự sửa tên hiển thị của mình (`PUT /api/auth/me`) và đổi mật khẩu (sai mật khẩu hiện tại không đăng xuất; đổi xong tự đăng nhập lại để giữ phiên).
> - Không có chức năng sửa dữ liệu cá nhân của người dùng khác.
> - Cấp VIP ở trang Người dùng dùng `VipGrantDialog`: cộng thêm ngày nối tiếp hoặc thu hồi, bắt buộc lý do, xem lịch sử VIP. Chi tiết ở `../ToeicMind/Docs/VIP_HISTORY_2026-11-18.md`.

## 1. Phạm vi hiện tại

| Ứng dụng | Cổng | Hành vi |
| --- | --- | --- |
| ToeicMindFE | 5173 | Đăng nhập, đăng ký email, Google popup, onboarding và trang thông tin kiểm thử |
| ToeicMindAdmin | 5174 | Chỉ đăng nhập; yêu cầu role ADMIN; Google popup, onboarding và trang thông tin kiểm thử |

Yêu cầu mới thay thế phạm vi cũ chỉ thông báo, không lưu phiên. Đăng nhập email/Google hợp lệ lưu accessToken, refreshToken, thời hạn và UserDto vào localStorage, sau đó mở trang thông tin. Không lưu mật khẩu và không hiển thị giá trị token trên trang kiểm thử. Admin không có đăng ký hoặc tự cấp quyền quản trị.

Đăng ký email trả UserDto, không có token. Sau đăng ký, FE mở trang dữ liệu vừa tạo để kiểm thử, có nút đến đăng nhập; không giả lập phiên đăng nhập và không lưu bản ghi đăng ký thành phiên đã xác thực. Chưa có trang học/dashboard nghiệp vụ: trang thông tin là đích đến theo yêu cầu kiểm thử hiện tại.

## 2. Cấu hình

Tham khảo `.env.example`, không ghi đè `.env` đang dùng. Khởi động lại Vite khi đổi cấu hình.

```dotenv
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:5078
VITE_GOOGLE_CLIENT_ID=
```

- API base chứa `/api`, không chứa `/auth`. Dev dùng proxy, production cần reverse proxy `/api` hoặc URL API lúc build. VITE_API_URL cũ vẫn được hỗ trợ.
- Chạy backend ở `../../ToeicMindBE/ToeicMind` bằng `dotnet run --launch-profile http`, cổng HTTP 5078 / HTTPS 7283. strictPort của Vite giúp tránh nhầm ứng dụng/cổng.
- VITE_GOOGLE_CLIENT_ID là **OAuth Web client ID**, phải trùng backend Google:ClientId. Khai báo Authorized JavaScript origins của từng frontend trong Google Cloud: localhost:5173, localhost:5174 và origin triển khai thực tế. 127.0.0.1 là origin khác cần khai báo riêng nếu sử dụng. Không đưa client secret vào VITE_*.
- Nếu gọi backend khác origin, CORS backend phải cho phép origin frontend. Proxy chỉ phục vụ dev.

## 3. Hợp đồng API

JSON camelCase. UserDto gồm `userId`, `username`, `email`, `role`, `status`, `hasPassword`, `createdAt`. hasPassword luôn là boolean: false là chưa có mật khẩu, true là đã có mật khẩu. Frontend từ chối kết quả thiếu hasPassword thay vì đoán trạng thái.

| API | Body/header | Thành công |
| --- | --- | --- |
| POST /api/auth/register | username, email, password, confirmPassword | 201 UserDto, không token |
| POST /api/auth/login | email, password | 200 AuthResponseDto |
| POST /api/auth/google-login | idToken | 200 AuthResponseDto |
| POST /api/auth/set-password | newPassword, confirmNewPassword; Bearer accessToken | 200 message |
| GET /api/auth/me | Bearer accessToken | 200 UserDto |
| POST /api/auth/logout | refreshToken | 204 |
| POST /api/auth/forgot-password | email | 200 message |
| POST /api/auth/reset-password | email, otp, newPassword, confirmNewPassword | 200 message |

AuthResponseDto: accessToken, refreshToken, expiresAt, refreshExpiresAt, user. Đăng ký không gửi role và backend chỉ tạo LEARNER. Admin từ chối kết quả role khác ADMIN và thử thu hồi refresh token vừa cấp.

## 4. Google popup và onboarding

1. Nút chính thức GSI `renderButton` dùng `ux_mode: popup`, `auto_select: false`. Không thay bằng One Tap `prompt()` vì nút phải mở được luồng chọn tài khoản khác. Không dùng lớp phủ iframe trong suốt. Script SDK async/defer trong index.html, host giữ mounted và co giãn theo form.
2. Gửi credential ID token tới google-login, kiểm tra phản hồi và role. Chặn callback/request lặp và gửi đồng thời với form email. SDK/config lỗi có thông báo và cho thử lại; chờ SDK tối đa 15 giây mỗi lần.
3. Lưu phiên hợp lệ trước onboarding. Nếu user.hasPassword là true, mở ngay trang thông tin. Nếu false, mở dialog gợi ý thiết lập mật khẩu dự phòng.
4. “Thiết lập mật khẩu” mở form hai ô. Kiểm tra ít nhất 6 ký tự, tối đa 72 ký tự và 72 byte UTF-8, xác nhận trùng khớp; giữ nguyên mật khẩu khi gửi. POST set-password có header Bearer.
5. Thành công: xóa ô mật khẩu, cập nhật user.hasPassword=true vào state/localStorage, đóng dialog và hiện trang thông tin. Không trì hoãn bằng timer và không gửi lại khi đang xử lý.
6. “Bỏ qua”, Escape hoặc click ngoài dialog khi không gửi API: giữ hasPassword=false, không gọi set-password; đóng dialog và mở trang thông tin. Google vẫn đăng nhập bình thường; email/mật khẩu chưa được bật. Trang thông tin cho phép mở lại form thiết lập.
7. Dialog khóa đóng khi gửi, quản lý Tab/focus, hiển thị lỗi ngay trong form. PASSWORD_ALREADY_SET được đối chiếu lại qua /me; chỉ cập nhật true nếu backend xác nhận. 401 yêu cầu đăng nhập lại.

Tham khảo chính thức: [Google Identity Services JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference), [hiển thị nút Google](https://developers.google.com/identity/gsi/web/guides/display-button).

## 5. Lỗi và phiên

- NO_PASSWORD_SET (400): thông báo tiếng Việt hướng dẫn chọn Google, đánh dấu nút Google; không giả lập đăng nhập, không cấp/lưu token.
- PASSWORD_MISMATCH / PASSWORD_TOO_LONG: đánh dấu ô xác nhận/mật khẩu mới. PASSWORD_ALREADY_SET hướng dẫn dùng chức năng đổi mật khẩu; không ghi đè mật khẩu đã có.
- Các lỗi 401/409/429/validation/mạng/timeout giữ trạng thái có thể thử lại. HTTP client timeout 15 giây, credentials omit, cache no-store; không log token/mật khẩu.
- Khóa lưu: toeicmind_admin_session / toeicmind_fe_session, tách theo ứng dụng. Chỉ lưu whitelist token, thời hạn, bảy trường UserDto và pendingPasswordPrompt; không lưu password hoặc dữ liệu ngoài hợp đồng.
- Tải lại trang: xác minh /me trước khi hiển thị tài khoản; Admin kiểm tra lại role. Phiên hỏng/không hợp lệ được xóa, quay về login. pendingPasswordPrompt giúp khôi phục onboarding còn dang dở; bỏ qua/thiết lập xong thì không tự mở lại khi reload.
- Storage bị chặn: tiếp tục bằng state trong bộ nhớ và thông báo phiên không tồn tại sau reload. Đăng xuất xóa phiên ngay rồi thử logout backend; không chờ mạng mới xóa giao diện.
- Cơ chế Refresh Token (Cập nhật 30/10/2026): Đã tích hợp API `POST /api/auth/refresh` và luồng tự động làm mới token. Khi access token hết hạn (401), `apiClient.js` tự động gửi refresh token để xoay vòng (token rotation) lấy cặp token mới mà không làm gián đoạn trải nghiệm người dùng; hỗ trợ mutex single-flight ngăn chặn tình trạng nhiều request đồng thời làm hỏng cơ chế xoay vòng token. Khi tải lại trang nếu access token hết hạn, `App.jsx` tự động khôi phục phiên bằng refresh token trước khi buộc đăng nhập lại. Trang UserInfoPage cung cấp nút "Làm mới Refresh Token" phục vụ kiểm thử trực tiếp.

## 6. Tổ chức mã

- App.jsx: điều hướng login/forgot/user_info, lưu/khôi phục phiên, onboarding.
- features/auth/services/authApi.js: DTO, HTTP và kiểm tra phản hồi.
- features/auth/services/sessionStore.js: kiểm tra phiên, whitelist và storage.
- features/auth/hooks/useAuthForm.js: trạng thái form email, kiểm tra role, NO_PASSWORD_SET.
- features/auth/components/GoogleSignInButton.jsx: lifecycle SDK, nút popup, lỗi tải và responsive.
- SetPasswordModal.jsx: onboarding/form, validation, focus và API set-password.
- UserInfoPage.jsx: đủ UserDto/JSON, làm mới từ /me, trạng thái mật khẩu, thiết lập và đăng xuất. Không hiện token.
- Quy chuẩn thiết kế dùng chung: `../../ToeicMindAdmin/docs/DESIGN_SYSTEM.md`. Hai frontend build độc lập và giữ bản tương ứng, không import chéo mã.

## 7. Bằng chứng kiểm tra 29/10/2026 — luồng mới

- Mỗi frontend: npm test đạt 35/35; npm run build thành công. Lint không có lỗi; còn cảnh báo Date có từ trước tại AuthLayout.
- Playwright với SDK Google/API mock: popup và tắt auto_select; callback trùng; lưu token trước onboarding; reload khôi phục modal/phiên; bỏ qua không gọi set-password; NO_PASSWORD_SET không có phiên; validation rỗng/xác nhận/72 byte; header/body set-password; khóa Escape và gửi lặp khi đang gửi; lỗi API và thử lại; cập nhật hasPassword; PASSWORD_ALREADY_SET đối chiếu /me; email login sau thiết lập; logout; đủ UserDto; Admin từ chối LEARNER; đăng ký email mở trang dữ liệu chưa xác thực. Bàn phím Tab ở trong dialog và hiện/ẩn mật khẩu đã kiểm tra.
- Responsive: trang thông tin ở 320/375/760/1280px; dialog ở 320×568px không tràn ngang.
- SDK Google thật đã tải iframe ở localhost:5173 và localhost:5174, không tràn ngang ở 320px. Chưa đăng nhập thành công bằng tài khoản Google thật hoặc xác minh thao tác chọn tài khoản khác với tài khoản thật.
- Backend: 41/41 test đạt trên SQL Server test riêng; Google validator mock trong API tests, không phải Google token thật. Không sửa backend trong đợt cập nhật frontend này.

Chạy lại UI regression: khởi động hai dev server đúng cổng, cung cấp Playwright qua dependency có sẵn hoặc biến PLAYWRIGHT_MODULE (đường dẫn package Playwright), chọn Chromium qua PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH nếu cần, rồi chạy `node scripts/check-auth-ui.cjs` từ một trong hai frontend. Script luôn mock các API xác thực/SDK và chỉ dùng dữ liệu kiểm thử. Không cần tài khoản thật.

## 8. Định tuyến Admin — 13/11/2026

Quyết định mới nhất cùng ngày: Admin dùng PC (cửa sổ từ 1024px); điện thoại/cửa sổ nhỏ chỉ thấy thông báo dùng máy tính, áp dụng cả trang đăng nhập. Đã gỡ luồng đặt lại mật khẩu người dùng khác khỏi UI/service frontend và endpoint `POST /api/admin/users/{id}/reset-password` ở backend. Các luồng tự quản lý mật khẩu qua auth tiếp tục hoạt động.

Kiểm tra bản PC: 59/59 unit test và build frontend đạt; backend build riêng thành công, 0 warning/error. `check-admin-navigation.mjs` dùng API mock kiểm tra dashboard lỗi 503/thử lại, sidebar thu gọn/mở rộng, bảng người dùng không có đặt lại mật khẩu, PC 1024/1280/1440/1920 và thông báo dùng máy tính ở 320/375/760/1023. Kiểm tra UI bằng Chromium, không gọi API/ghi database thật. Lint còn cảnh báo cũ ở DirectionsView và MediaPreview; build còn cảnh báo bundle lớn. Ảnh kiểm tra lưu trong `artifacts/admin-desktop/`.

Cập nhật cùng ngày: trang `/account` dùng `AdminAccountPage` để hiển thị hồ sơ và bảo mật; UserDto được giữ trong mục chi tiết mở rộng. `/stats` chuyển về `/dashboard`, nơi hiển thị cả thống kê hoạt động và quản lý đề. Hai trang `/import` và `/learner-preview` đã gỡ; URL cũ đi theo fallback về Tổng quan.

Kiểm tra thay đổi: `npm run build` và 59/59 unit test đạt. `node scripts/check-admin-navigation.mjs` chạy Chromium với API mock: sửa hướng dẫn chung (`examId: null`), tải ảnh Part 1 lỗi 503 rồi thử lại, route đã gỡ/gộp, làm mới tài khoản/UserDto và responsive 320/375/760/1440px. Chưa kiểm thử ghi SQL hoặc tải ảnh lên R2 thật trong đợt này. Backend đối chiếu thực tế tại `../ToeicMind`; đã sửa truy vấn hướng dẫn hiệu lực để dùng bộ chung và build output riêng do tiến trình đang chạy khóa file thực thi.

- Admin dùng React Router với URL riêng cho đăng nhập, quên mật khẩu, tài khoản và toàn bộ màn hình nghiệp vụ. Bảng ánh xạ menu nằm tại `src/routes/adminRoutes.js`.
- Route nghiệp vụ yêu cầu phiên ADMIN hợp lệ; truy cập trực tiếp khi chưa đăng nhập chuyển về `/login`. Route xác thực khi đã đăng nhập chuyển về `/account`.
- Trình biên soạn dùng `/exams/new` và `/exams/:examId/edit`. Tải lại trang, Back/Forward và liên kết trực tiếp được hỗ trợ; khi còn thay đổi chưa lưu, ứng dụng cảnh báo trước khi rời route hoặc đóng/tải lại trang.
- Máy chủ production phải fallback các URL phía client về `index.html`; các đường dẫn `/api` vẫn được dành cho backend.
