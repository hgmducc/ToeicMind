# Tích hợp xác thực ToeicMind

Cập nhật 29/10/2026 theo yêu cầu onboarding Google và trang kiểm thử UserDto. Phạm vi P02-01 (đăng ký), P02-02 (đăng nhập). Backend đối chiếu thực tế: `../../ToeicMindBE/ToeicMind`, Controller/AuthService/GoogleAuthService và DTO trong DTOs/Auth.

> Cập nhật 14/11/2026: giao diện người học (LEARNER) đã được tích hợp ([LEARNER_INTEGRATION.md](LEARNER_INTEGRATION.md)). Đăng nhập hợp lệ nay mở **Trang chủ** (`/`) thay vì trang UserDto; trang UserDto vẫn dùng để kiểm thử tại `/account` (menu người dùng) và vẫn hiện sau **đăng ký email** (chưa có phiên). Đổi đích tại `LANDING_PATH` (`src/routes/learnerRoutes.js`). Ứng dụng dùng react-router (đường dẫn thường, không hash): mở trang cần đăng nhập khi chưa có phiên sẽ quay lại đúng trang đó sau khi đăng nhập. Các mô tả “mở trang thông tin sau đăng nhập” bên dưới là lịch sử của giai đoạn trước.

> Cập nhật 17/11/2026 (chỉ FE): **đăng ký email** hiện thông báo “Đăng ký thành công”, tự gọi `login` bằng email/mật khẩu vừa nhập (mật khẩu chỉ nằm trong biến cục bộ, không lưu) rồi mở Trang chủ kèm lời chào; nếu đăng nhập tự động lỗi thì chuyển sang tab Đăng nhập, giữ email và báo tài khoản đã được tạo. Trang UserDto sau đăng ký và route `/registered` đã bỏ. **Google chưa có mật khẩu** mở thẳng form tạo mật khẩu (nhắc lần sau đăng nhập bằng email/mật khẩu) kèm nút Bỏ qua; không còn bước hỏi riêng. Admin giữ nguyên hai bước. Các mục 1, 4 và 6 bên dưới đã cập nhật theo đó.

## 1. Phạm vi hiện tại

| Ứng dụng | Cổng | Hành vi |
| --- | --- | --- |
| ToeicMindFE | 5173 | Đăng nhập, đăng ký email, Google popup, onboarding và trang thông tin kiểm thử |
| ToeicMindAdmin | 5174 | Chỉ đăng nhập; yêu cầu role ADMIN; Google popup, onboarding và trang thông tin kiểm thử |

Yêu cầu mới thay thế phạm vi cũ chỉ thông báo, không lưu phiên. Đăng nhập email/Google hợp lệ lưu accessToken, refreshToken, thời hạn và UserDto vào localStorage, sau đó mở trang thông tin. Không lưu mật khẩu và không hiển thị giá trị token trên trang kiểm thử. Admin không có đăng ký hoặc tự cấp quyền quản trị.

Đăng ký email trả UserDto, không có token. Từ 17/11/2026, sau đăng ký FE gọi login thật bằng thông tin vừa nhập (không giả lập phiên, không dùng bản ghi đăng ký làm phiên) và mở Trang chủ; chỉ khi bước này lỗi mới quay về tab Đăng nhập.

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
3. Lưu phiên hợp lệ trước onboarding. Nếu user.hasPassword là true, mở ngay trang thông tin. Nếu false, mở ngay dialog tạo mật khẩu.
4. Dialog là một bước: tiêu đề “Tạo mật khẩu cho tài khoản”, lời nhắc tạo mật khẩu để lần sau đăng nhập bằng email và mật khẩu hoặc bỏ qua, form hai ô, nút “Tạo mật khẩu” và “Bỏ qua”; ô đầu được focus khi mở. Kiểm tra ít nhất 6 ký tự, tối đa 72 ký tự và 72 byte UTF-8, xác nhận trùng khớp; giữ nguyên mật khẩu khi gửi. POST set-password có header Bearer.
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
- Cập nhật 31/10/2026: đã đồng bộ HTTP client refresh tự động với Admin. Các request 401 dùng một lượt refresh chung, giữ đúng khóa phiên của từng ứng dụng; refresh hoàn tất sau logout không khôi phục phiên cũ. Lỗi refresh tạm thời giữ phiên để thử lại; refresh không hợp lệ xóa phiên và yêu cầu đăng nhập lại.

## 6. Tổ chức mã

- App.jsx: phiên (lưu/khôi phục/refresh/hết hạn), onboarding mật khẩu; chưa đăng nhập → `/login`, `/forgot-password` trong AuthLayout; đã đăng nhập → LearnerLayout + `routes/LearnerRoutes.jsx`.
- features/auth/services/authApi.js: DTO, HTTP và kiểm tra phản hồi.
- features/auth/services/sessionStore.js: kiểm tra phiên, whitelist và storage.
- features/auth/hooks/useAuthForm.js: trạng thái form email, kiểm tra role, NO_PASSWORD_SET; đăng ký → login tự động (có dự phòng về tab Đăng nhập).
- features/auth/components/GoogleSignInButton.jsx: lifecycle SDK, nút popup, lỗi tải và responsive.
- SetPasswordModal.jsx: form tạo mật khẩu một bước (onboarding và từ trang tài khoản), validation, focus và API set-password.
- UserInfoPage.jsx (cập nhật 18/11/2026, CHG-008): trang Tài khoản cho người dùng, **không còn JSON UserDto, nút "Làm mới thông tin" hay dòng hạn access/refresh token**. Gồm:
  - hồ sơ (email đăng nhập, ngày tham gia, gói học, cách đăng nhập);
  - form tự sửa tên hiển thị (`PUT /api/auth/me`, chỉ gửi `{ username }`);
  - form đổi mật khẩu (`PUT /api/auth/change-password`):
    - sai mật khẩu hiện tại (401 `INVALID_OLD_PASSWORD`) báo lỗi ngay tại ô, không đăng xuất;
    - đổi thành công thì FE tự đăng nhập lại bằng mật khẩu mới, vì backend thu hồi mọi refresh token;
  - tạo mật khẩu cho tài khoản Google, lối sang Lộ trình, Đăng xuất.

  Quản trị viên không có API sửa hồ sơ người khác. `lib/apiClient.js` không coi 401 mang mã `INVALID_OLD_PASSWORD` là hết phiên.
- Quy chuẩn thiết kế dùng chung: `../../ToeicMindAdmin/docs/DESIGN_SYSTEM.md`. Hai frontend build độc lập và giữ bản tương ứng, không import chéo mã.

## 7. Bằng chứng kiểm tra 29/10/2026 — luồng mới

- Mỗi frontend: npm test đạt 35/35; npm run build thành công. Lint không có lỗi; còn cảnh báo Date có từ trước tại AuthLayout.
- Playwright với SDK Google/API mock: popup và tắt auto_select; callback trùng; lưu token trước onboarding; reload khôi phục modal/phiên; bỏ qua không gọi set-password; NO_PASSWORD_SET không có phiên; validation rỗng/xác nhận/72 byte; header/body set-password; khóa Escape và gửi lặp khi đang gửi; lỗi API và thử lại; cập nhật hasPassword; PASSWORD_ALREADY_SET đối chiếu /me; email login sau thiết lập; logout; đủ UserDto; Admin từ chối LEARNER; đăng ký email mở trang dữ liệu chưa xác thực. Bàn phím Tab ở trong dialog và hiện/ẩn mật khẩu đã kiểm tra.
- Responsive: trang thông tin ở 320/375/760/1280px; dialog ở 320×568px không tràn ngang.
- SDK Google thật đã tải iframe ở localhost:5173 và localhost:5174, không tràn ngang ở 320px. Chưa đăng nhập thành công bằng tài khoản Google thật hoặc xác minh thao tác chọn tài khoản khác với tài khoản thật.
- Backend: 41/41 test đạt trên SQL Server test riêng; Google validator mock trong API tests, không phải Google token thật. Không sửa backend trong đợt cập nhật frontend này.

Chạy lại UI regression: khởi động hai dev server đúng cổng, cung cấp Playwright qua dependency có sẵn hoặc biến PLAYWRIGHT_MODULE (đường dẫn package Playwright), chọn Chromium qua PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH nếu cần, rồi chạy `node scripts/check-auth-ui.cjs` từ một trong hai frontend. Script luôn mock các API xác thực/SDK và chỉ dùng dữ liệu kiểm thử. Không cần tài khoản thật.

Cập nhật kiểm thử 31/10/2026: FE 35/35, build/lint qua; hồi quy hai frontend dùng bản mở rộng tại `../../ToeicMindAdmin/scripts/check-auth-ui.cjs` đã qua cả quên mật khẩu/OTP/reset, focus lỗi, chặn gửi lặp, INVALID_OTP, OTP_COOLDOWN và xóa mật khẩu sau thành công. Google/OTP dùng mock, không gửi email hoặc đăng nhập Google thật. Cảnh báo Date cũ trong AuthLayout đã được xử lý đồng bộ.

Cập nhật kiểm thử 17/11/2026 (đăng ký email → Trang chủ, Google → form tạo mật khẩu): `npm test` 63/63, lint không báo lỗi, `npm run build` thành công. `scripts/check-auth-ui.cjs` (FE, **API và SDK Google đều mock**, không dùng backend/Google thật) đạt: form tạo mật khẩu hiện ngay và ô đầu được focus; Bỏ qua không gọi set-password; đăng ký chỉ gửi bốn trường DTO (không `role`); sau đăng ký tự gọi login rồi vào `/` kèm lời chào, phiên được lưu và không chứa mật khẩu; login tự động lỗi → tab Đăng nhập giữ email, không có phiên; dialog ở 320×568px không tràn ngang. Chưa chạy lại hồi quy của Admin (không đổi mã Admin, chỉ cập nhật tài liệu chuẩn).
