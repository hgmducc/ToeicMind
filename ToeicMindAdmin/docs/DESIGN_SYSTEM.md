# Quy chuẩn giao diện ToeicMind

Phiên bản 2.0 — 17/11/2026. Áp dụng cho **ToeicMindAdmin** và **ToeicMindFE**. Đây là tài liệu chuẩn để phát triển giao diện trong những lần làm việc tiếp theo; đọc cùng [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md) trước khi thay đổi màn hình xác thực. Các mục 1–13 ghi lại nền tảng và luồng đã triển khai; mục 14 là chuẩn thiết kế bắt buộc cho thay đổi mới và được ưu tiên khi có khác biệt về quy ước trình bày.

Cập nhật 30/10/2026: Admin có dashboard và quản trị đề; sau đăng nhập vẫn mở UserDto để kiểm thử, menu chuyển sang nghiệp vụ. HTTP client dùng chung đã có refresh tự động; các mô tả “chưa có dashboard/chưa tự refresh” ở lịch sử bên dưới được thay thế bởi cập nhật này. Chi tiết nghiệm thu: [ADMIN_AUDIT.md](ADMIN_AUDIT.md).

Cập nhật 14/11/2026: ToeicMindFE đã có giao diện người học đầy đủ (mục 13). Sau đăng nhập FE mở Trang chủ; trang UserDto kiểm thử nằm ở `/account`. Các câu ở mục 5, 8 và 10 nói “sau đăng nhập mở trang UserDto” hoặc “chưa có trang học” đã được thay thế cho **FE** bởi cập nhật này; phần Admin giữ theo mục 12 và cập nhật 30/10 ở trên. Tài liệu tích hợp chi tiết (bảng trang ↔ API, từ vựng, test thanh toán, bằng chứng kiểm tra): [LEARNER_INTEGRATION.md](../../ToeicMindFE/docs/LEARNER_INTEGRATION.md).

## 1. Định hướng

ToeicMind sử dụng nền sáng, xanh lá trầm và điểm nhấn xanh non. Giao diện tạo cảm giác tập trung, nhẹ nhàng; ưu tiên thao tác chính và nội dung tiếng Việt rõ ràng. Giữ cùng logo, kiểu chữ, token, form và cách thông báo ở cả hai ứng dụng. Nội dung minh họa và nhãn vai trò có thể khác nhau theo đối tượng sử dụng.

Không thêm chức năng ngoài yêu cầu để lấp chỗ trống. Khi bổ sung tính năng mới (Google login, quên mật khẩu, đổi mật khẩu, ...), triển khai trọn luồng cả backend lẫn frontend cùng lúc và cập nhật tài liệu này.

## 2. Token giao diện

Khai báo tại `src/styles/tokens.css`. Component dùng biến CSS thay vì lặp lại mã màu hoặc tạo bảng màu riêng.

Bảng dưới là bộ token gốc. Từ 18/11/2026, token hiện hành là bộ ngữ nghĩa ở mục 14.2 và 14.8. Trong đó `--color-muted` và `--color-success` đã đậm hơn để đạt tương phản; radius vẫn giữ 12/16/24px.

| Token | Giá trị | Vai trò |
| --- | --- | --- |
| `--color-canvas` | `#f8faf7` | Nền trang |
| `--color-surface` | `#ffffff` | Form, thẻ và input |
| `--color-ink` | `#193b32` | Chữ chính, tiêu đề |
| `--color-muted` | `#65756e` | Chữ bổ trợ |
| `--color-primary` | `#25634d` | Nút chính, liên kết |
| `--color-primary-hover` | `#1d503e` | Hover nút chính |
| `--color-accent` | `#dbef9d` | Điểm nhấn minh họa |
| `--color-panel` | `#eaf0e5` | Nền khối giới thiệu |
| `--color-border` | `#dce4db` | Viền input, đường phân cách |
| `--color-danger` | `#b34040` | Lỗi nhập liệu/API |
| `--color-success` | `#23734e` | Thông báo thành công |
| `--color-danger-bg` | `#fff3f1` | Nền thông báo lỗi |
| `--color-success-bg` | `#eff8f1` | Nền thông báo thành công |

Quy ước kích thước:

- Chữ: Manrope variable 400–800 từ file WOFF2 cục bộ; fallback `Segoe UI, sans-serif`. Body 14px, line-height 1.6; tiêu đề form 32px; tiêu đề giới thiệu dùng `clamp(32px, 3.3vw, 49px)`, tăng lên 52px từ màn hình 1500px. Co giãn tiêu đề ở màn hình nhỏ, không ép nội dung tiếng Việt vào một dòng.
- Khoảng cách: ưu tiên thang `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`.
- Bo góc: `--radius-control: 12px` cho input/nút; `--radius-card: 16px` cho thẻ; `--radius-panel: 24px` cho panel lớn. Dùng pill cho nhãn ngắn khi phù hợp.
- Input cao 50px; nút chính cao tối thiểu 50px; nút Google cao 50px. Nút hiện/ẩn mật khẩu có vùng bấm 42 × 42px.
- Focus bàn phím nổi bật bằng outline xanh 3px; input dùng viền và vòng sáng 3px thay outline. Không xóa dấu hiệu focus mà không có thay thế.
- Bóng đổ nhẹ, ưu tiên viền và khoảng trắng để phân tách nội dung. Không dùng chuyển động liên tục gây mất tập trung.

Hai font nằm tại `public/fonts/manrope-latin.woff2` và `public/fonts/manrope-vietnamese.woff2`; khai báo `@font-face` trong `tokens.css`, dùng `font-display: swap` và unicode range tương ứng. Giữ kèm [giấy phép SIL Open Font License 1.1](../public/fonts/OFL.txt) khi phân phối font. Không cần gọi Google Fonts lúc chạy trang.

## 3. Bố cục xác thực

Desktop có hai cột: khối thương hiệu/giới thiệu/minh họa bên trái, form bên phải. Khung trang rộng tối đa 1800px, form rộng tối đa 400px và có một nút hành động chính. Logo nằm ở vị trí dễ nhận biết; nhãn Admin phân biệt trang quản trị.

| Màn hình | Quy tắc |
| --- | --- |
| Từ 1500px | Hai cột, panel có padding ngang 64px; tiêu đề giới thiệu 52px |
| 1101–1499px | Hai cột bằng nhau, khoảng trắng rộng |
| 1025–1100px | Hai cột, giảm padding; tiêu đề giới thiệu 36px |
| 761–1024px | Tỷ lệ cột `.92fr 1fr`; tiêu đề giới thiệu 32px, form 29px; thu nhỏ artwork |
| Từ 760px trở xuống | Một cột, ẩn toàn bộ panel giới thiệu/artwork; hiện logo ở header, form tiêu đề 30px |
| Từ 420px trở xuống | Giảm padding, giữ input/nút đủ lớn; không tràn ngang |

Chiều rộng nhỏ nhất đang hỗ trợ là 320px. Ở breakpoint 420px, tiêu đề form còn 28px và padding ngang trang là 22px.

**FE** chuyển giữa đăng nhập và đăng ký ngay trong trang (tab). **Admin** chỉ hiện đăng nhập, không có tab, liên kết hoặc form đăng ký. Cả hai đều có Google login và quên mật khẩu.

Minh họa được dựng bằng component và CSS để dùng cùng bảng màu, không phụ thuộc ảnh hoặc font tải từ dịch vụ ngoài. Số liệu minh họa phải được trình bày như ví dụ; không mô tả là dữ liệu học viên thực.

## 4. Component và tổ chức mã

```text
src/
├── components/
│   ├── ui/
│   │   ├── Brand.jsx
│   │   ├── Icon.jsx           # Icon stroke (SVG path), multi-name lookup
│   │   └── GoogleIcon.jsx     # SVG Google logo 4 màu (fill, không stroke)
│   └── auth/
│       ├── AuthLayout.jsx
│       └── AuthArtwork.jsx
├── features/
│   └── auth/
│       ├── AuthPage.jsx           # Form đăng nhập (+ đăng ký ở FE)
│       ├── ForgotPasswordPage.jsx # Quên MK 2 bước: email → OTP + mật khẩu mới
│       ├── components/
│       │   └── AuthField.jsx
│       ├── hooks/
│       │   ├── useAuthForm.js       # Trạng thái đăng nhập/đăng ký
│       │   └── useForgotPassword.js # Trạng thái 2-bước quên mật khẩu
│       ├── services/
│       │   └── authApi.js           # login, register, logout, googleLogin,
│       │                            # forgotPassword, resetPassword
│       └── validation.js            # validateAuth, validateForgotPassword,
│                                    # validateResetPassword, mapApiFieldErrors
├── config/
│   ├── app.js          # APP_AUDIENCE: 'admin' | 'learner'
│   └── api.js          # API_BASE_URL, API_TIMEOUT_MS
├── lib/
│   └── apiClient.js    # postJson, ApiError, error message map
├── styles/
│   ├── tokens.css      # Font cục bộ, màu, khoảng cách dùng chung
│   ├── global.css      # Reset, focus, quy tắc toàn trang
│   └── auth.css        # Bố cục và giao diện xác thực
├── index.css           # Import tokens → global → auth
└── App.jsx             # Phiên, onboarding và view login/forgot/user_info
public/
├── favicon.svg
└── fonts/
    ├── manrope-latin.woff2
    ├── manrope-vietnamese.woff2
    └── OFL.txt
index.html              # Khai báo Google GSI script (async defer)
```

Đường dẫn chi tiết của tầng API và form được ghi trong [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md). Tách hiển thị, validation, trạng thái form và giao tiếp HTTP theo trách nhiệm; không gọi `fetch` từ component input hoặc artwork.

Hai frontend có các bản component và stylesheet tương ứng để tự cài đặt/build độc lập. Khi đổi thiết kế chung, cập nhật **cả hai bản** trong cùng đầu việc. Không import từ thư mục dự án bên cạnh. Khi quy mô đủ lớn có thể tách package chung theo một đầu việc riêng.

## 5. Form và trạng thái

### 5.1 Quy tắc chung (tất cả form)

- Luôn có label hiển thị; placeholder chỉ minh họa giá trị. Dùng kiểu input và `autocomplete` phù hợp cho email, tên người dùng, mật khẩu hiện tại/mới, OTP.
- Mật khẩu có nút hiện/ẩn với tên truy cập rõ ràng; nút này không submit form. Không thay đổi hoặc trim mật khẩu khi gửi API.
- Đánh dấu trường lỗi, hiển thị hướng dẫn ngay dưới input; nối bằng `aria-describedby`, đặt `aria-invalid` khi cần. Khi submit không hợp lệ, đưa focus đến lỗi đầu tiên.
- Khi gửi: nút thể hiện trạng thái đang xử lý, chặn submit lặp; không để người dùng nhận nhầm phản hồi của form cũ sau khi đổi chế độ.
- Thành công: xóa ô mật khẩu và chuyển sang trang thông tin tài khoản phục vụ kiểm thử (FE từ 14/11/2026: Trang chủ hoặc trang đang mở dở, mục 13.1). Đăng nhập hợp lệ lưu access/refresh token và UserDto vào localStorage riêng của từng ứng dụng; tuyệt đối không lưu mật khẩu. Đăng ký email (chỉ FE, từ 17/11/2026): backend chỉ trả UserDto nên sau khi tạo tài khoản FE hiện thông báo thành công rồi đăng nhập bằng đúng thông tin vừa nhập để vào Trang chủ (mục 5.2).
- Lỗi API/mạng: dùng thông báo tiếng Việt có thể hành động, giữ dữ liệu cần sửa; không hiển thị stack trace hoặc token.
- Không dùng alert trình duyệt làm thông báo chính. Không chỉ dựa vào màu để truyền đạt lỗi/thành công.

### 5.2 Luồng đăng nhập / đăng ký (useAuthForm)

- Đăng ký email thành công (FE, từ 17/11/2026): hiện thông báo “Đăng ký thành công”, gọi `login` bằng email/mật khẩu vừa nhập (chỉ giữ trong biến cục bộ, không lưu) rồi vào Trang chủ kèm lời chào; backend vẫn chỉ trả UserDto khi đăng ký và FE không tự cấp token. Nếu đăng nhập tự động lỗi thì chuyển sang tab Đăng nhập, giữ email, xóa mật khẩu và báo tài khoản đã được tạo. Đăng nhập email thành công lưu phiên và mở trang thông tin (FE: Trang chủ, mục 13.1).
- Đổi tab (login ↔ register): giữ email, xóa mật khẩu và lỗi.
- Admin kiểm tra `result.user.role === 'ADMIN'` sau login. Nếu LEARNER → logout token vừa cấp + báo lỗi, không giữ token.

### 5.3 Luồng Google login (AuthPage)

- Dùng Google Identity Services (GSI): `initialize` và nút chính thức `renderButton` với popup. Không phủ iframe trong suốt lên nút tự dựng.
- Script GSI khai báo trong `index.html` với `async defer`. Không import GSI vào bundle.
- Cần biến môi trường `VITE_GOOGLE_CLIENT_ID`. Nếu thiếu CLIENT_ID hoặc SDK chưa load → hiển thị thông báo lỗi rõ ràng, không mock thành công.
- Admin Google login: kiểm tra role sau khi nhận response; LEARNER bị từ chối + logout.
- FE Google login: cả ADMIN và LEARNER đều được phép.
- Nút Google chính thức được giữ mounted khi gửi API; host có chiều rộng co giãn tối đa 400px. Nút dự phòng (`google-button`) xuất hiện khi SDK chưa sẵn sàng hoặc đang gửi, có spinner riêng (`button-spinner--dark`). Khóa cả Google và form khi một phương thức đang gửi. Chờ SDK tối đa 15 giây mỗi lần; nút dự phòng báo lỗi và cho thử lại.
- `googleNotice` và `notice` (từ useAuthForm) là hai state riêng. Bắt đầu phương thức xác thực mới, sửa input hoặc đổi tab phải xóa thông báo cũ. Callback lặp không được gửi thêm request; callback từ màn hình đã unmount không được báo thành công. Google thành công lưu phiên trước khi mở onboarding. Nếu `hasPassword === false`, FE mở ngay modal tạo mật khẩu kèm lời nhắc “lần sau đăng nhập bằng email và mật khẩu” và nút Bỏ qua (từ 17/11/2026, không còn bước hỏi riêng; Admin vẫn hai bước gợi ý → nhập). Bỏ qua giữ false và mở trang đích; API set-password thành công cập nhật true vào state và phiên lưu. Người đã có mật khẩu đi thẳng trang thông tin.

### 5.4 Luồng quên mật khẩu (ForgotPasswordPage + useForgotPassword)

Bước 1 — Nhập email:
- Form 1 ô email, nút "Gửi mã OTP".
- Submit `POST /api/auth/forgot-password`; khi 200 (kể cả email không tồn tại) → chuyển sang bước 2 + hiển thị notice thành công.
- Lỗi 429 OTP_COOLDOWN: báo đợi 60 giây.

Bước 2 — Nhập OTP + mật khẩu mới:
- 3 ô: OTP (inputMode numeric, maxLength 6), mật khẩu mới, xác nhận mật khẩu mới.
- Nút "Gửi lại mã OTP" (resendOtp) và "Đổi email" (backToStep1) bên dưới form.
- Submit `POST /api/auth/reset-password`; thành công → notice + xóa ô mật khẩu; người dùng tự quay lại đăng nhập.
- Ánh xạ lỗi: `INVALID_OTP / OTP_EXPIRED_OR_NOT_FOUND / OTP_MAX_ATTEMPTS_EXCEEDED` → field `otp`; `PASSWORD_MISMATCH` → `confirmNewPassword`; `PASSWORD_TOO_LONG` → `newPassword`.

Điều hướng: `App.jsx` quản lý state `view: 'login' | 'forgot'`; ForgotPasswordPage nhận prop `onBack` để quay về.

## 6. CSS — Classes quan trọng

### Classes form cơ bản (auth.css)
| Class | Mô tả |
| --- | --- |
| `.auth-shell` | Grid 2 cột, max-width 1800px |
| `.story-panel` | Panel trái (giới thiệu, minh họa) |
| `.auth-main` | Cột phải chứa form |
| `.auth-content` | Vùng giữa form (grid place-items center) |
| `.auth-form-container` | Wrapper form, max-width 400px |
| `.auth-heading` | Tiêu đề + mô tả trên form |
| `.eyebrow` | Nhãn nhỏ phía trên tiêu đề |
| `.auth-tabs` | Tab đăng nhập / đăng ký (chỉ FE) |
| `.auth-form` | Form (flex column gap) |
| `.field-group` | Wrapper 1 field (label + control + error) |
| `.field-input` | Input chuẩn, cao 50px |
| `.submit-button` | Nút submit chính, xanh lá |
| `.form-notice` | Thông báo thành công/lỗi |
| `.auth-switch` | Dòng chuyển đổi đăng nhập ↔ đăng ký |
| `.admin-access-note` | Ghi chú quyền Admin |

### Classes mới (phiên bản 1.1)
| Class | Mô tả |
| --- | --- |
| `.google-button` | Nút đăng nhập Google; nền trắng, viền border |
| `.auth-divider` | Dấu phân cách "hoặc" giữa form và Google button |
| `.forgot-link-row` / `.forgot-password-row` | Dòng chứa link "Quên mật khẩu?" (flex justify-end) |
| `.forgot-link` | Link "Quên mật khẩu?" (text-button variant) |
| `.forgot-otp-actions` | Dòng actions bước 2 (Gửi lại OTP / Đổi email) |
| `.button-spinner--dark` | Spinner cho nút nền sáng (Google button) |

## 7. Icon catalog

`Icon.jsx` dùng lookup object `paths` với SVG path JSX. Gọi `<Icon name="..." size={20} />`.

| Tên | Dùng ở |
| --- | --- |
| `mail` | Field email |
| `lock` | Field mật khẩu |
| `user` | Field tên hiển thị |
| `eye` / `eye-off` | Toggle hiện/ẩn mật khẩu |
| `arrow-right` | Nút submit (icon phải) |
| `arrow-left` | Quay lại (trong ForgotPasswordPage) |
| `arrow-up-right` | Artwork |
| `check` | Artwork |
| `circle-check` | Notice thành công |
| `alert-circle` | Notice lỗi |
| `shield` | Admin access note, Admin artwork |
| `book` | Artwork FE |
| `headphones` | Artwork |
| `sparkles` | Artwork / fallback |
| `layers` | Admin artwork |
| `key` | Field OTP |
| `refresh-cw` | Nút "Gửi lại OTP" |

`GoogleIcon.jsx` là component riêng cho SVG Google logo 4 màu (fill). Không dùng `Icon` cho Google vì không phải stroke.

Từ 14/11/2026 hai ứng dụng dùng **cùng một bộ 43 icon** (hai bản `Icon.jsx` giống nhau; icon vẽ nét 1,7 trên khung 24×24, không tô nền). Ngoài bảng trên có: `home`, `file`, `text`, `list`, `star`, `flag`, `flame`, `target` (điều hướng, thống kê, nhãn), `play`, `pause`, `volume`, `shuffle`, `refresh` (âm thanh và dạng câu hỏi từ vựng), `search`, `plus`, `x`, `trash`, `copy`, `link`, `info`, `clock`, `log-out`, `chevron-down`, `chevron-left`, `chevron-right` (điều khiển chung). Thêm icon mới phải thêm vào cả hai bản.

## 8. Nội dung và khả năng tiếp cận

Dùng thuật ngữ thống nhất: "Đăng nhập", "Đăng ký", "Địa chỉ email", "Mật khẩu", "Xác nhận mật khẩu", "Tên hiển thị", "Quản trị viên", "Mã OTP". CTA đăng ký là "Tạo tài khoản", CTA Admin là "Đăng nhập quản trị", CTA gửi OTP là "Gửi mã OTP", CTA đặt lại là "Đặt lại mật khẩu". Nội dung ngắn, đúng hành vi; đích đến sau xác thực của Admin theo mục 12, của FE theo mục 13.

Tất cả điều khiển phải dùng được bằng bàn phím, có focus rõ ràng và thứ tự Tab hợp lý. Icon trang trí được ẩn khỏi trình đọc màn hình. Thông báo lỗi dùng `role="alert"` hoặc vùng live phù hợp; thành công dùng `role="status"`. Tôn trọng `prefers-reduced-motion`, giữ độ tương phản đủ đọc và cho phép zoom mà không mất thao tác.

## 9. Quy trình cập nhật

1. Đọc tài liệu này và [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md), xác định component/token đang có và phạm vi người dùng yêu cầu.
2. Dùng lại component, mở rộng biến thể theo ý nghĩa khi cần; giữ các trạng thái mặc định, hover, focus, disabled, loading và error nhất quán.
3. Đồng bộ thay đổi thiết kế chung vào hai frontend, cập nhật tài liệu chuẩn nếu quy ước thay đổi.
4. Build từng ứng dụng. Kiểm tra desktop/mobile, bàn phím, hiện/ẩn mật khẩu, lỗi dữ liệu/API, trạng thái chờ và thành công; ghi rõ phần nào dùng mock, phần nào đã gọi backend thật.

## 10. Trạng thái triển khai

| Tính năng | Admin | FE | Backend |
| --- | --- | --- | --- |
| Đăng nhập email | ✅ | ✅ | ✅ |
| Đăng ký tài khoản | ❌ (không áp dụng) | ✅ | ✅ |
| Đăng nhập Google | ✅ (cần VITE_GOOGLE_CLIENT_ID) | ✅ (cần VITE_GOOGLE_CLIENT_ID) | ✅ |
| Quên mật khẩu (OTP) | ✅ | ✅ | ✅ |
| Đặt lại mật khẩu | ✅ | ✅ | ✅ |
| Đổi mật khẩu | — | — | ✅ (chưa có UI) |
| Lưu phiên / refresh token | ✅ lưu phiên; chưa tự refresh | ✅ lưu phiên; chưa tự refresh | ✅ |
| Điều hướng sau đăng nhập | ✅ trang UserDto kiểm thử | ✅ Trang chủ (UserDto ở `/account`) | — |
| Học tập: trang chủ, đề thi, từ vựng, nghe chép, báo cáo | — | ✅ (mục 13) | ✅ |
| Thanh toán VIP (VNPay) | — | ✅ giao diện; chưa thanh toán bằng thẻ test thật từ FE | ✅ (chữ ký VNPay hợp lệ chưa xác nhận bằng giao dịch thật) |

Yêu cầu mới nhất của người dùng và quyết định đã xác nhận trong phiên làm việc được ưu tiên; không tự thêm vòng xin phép cho lựa chọn kỹ thuật thông thường trong phạm vi đã giao.


## 11. Onboarding và trang kiểm thử (phiên bản 1.2)

- `SetPasswordModal`: dialog native có tên/mô tả truy cập, quản lý focus và bàn phím; Admin: hai bước gợi ý → nhập mật khẩu mới/xác nhận, có bỏ qua ở cả hai bước. FE (từ 17/11/2026): một bước, mở thẳng form mật khẩu mới/xác nhận với lời nhắc dùng cho lần đăng nhập sau và nút Bỏ qua. Khi gửi API, không đóng bằng Escape/backdrop hoặc gửi lặp. Đóng/unmount không giữ các ô mật khẩu hoặc timer chờ.
- `hasPassword: false` không khóa tài khoản: Google vẫn hoạt động, chỉ đăng nhập email/mật khẩu bị từ chối cho tới khi thiết lập thành công. Thông báo `NO_PASSWORD_SET` hướng dẫn chọn Google và đánh dấu nút Google.
- `UserInfoPage`: hiện đủ bảy thuộc tính UserDto, JSON tương ứng và trạng thái mật khẩu. Phiên đã xác thực có nút làm mới (`GET /auth/me`), thiết lập mật khẩu nếu chưa có và đăng xuất. Không hiện giá trị token. FE không còn trang UserDto sau đăng ký (đã bỏ `registrationOnly` ngày 17/11/2026); trang này chỉ còn ở `/account`.
- Phiên lưu tách biệt Admin/người học. Reload xác minh bằng `/auth/me` trước khi hiển thị trang thông tin; Admin tiếp tục yêu cầu role ADMIN. Onboarding chưa hoàn tất được khôi phục khi reload. Đăng xuất xóa phiên cục bộ ngay rồi thử thu hồi refresh token.
- Trang thông tin và dialog phải không tràn ngang ở 320px; dialog cuộn dọc ở màn hình thấp. Các thay đổi chung được đồng bộ giữa hai frontend.

## 12. Màn hình quản trị nội dung — 30/10/2026

Quyết định mới nhất 13/11/2026: Admin chỉ hỗ trợ cửa sổ từ 1024px trên máy tính. Dưới ngưỡng này, hiển thị thông báo “Vui lòng sử dụng máy tính” thay giao diện ứng dụng (kể cả đăng nhập); không tải ứng dụng khi mở lần đầu ở màn hình nhỏ. Nếu đang dùng PC rồi thu hẹp cửa sổ, giữ state màn hình đang làm việc để tránh mất nội dung. Bỏ các media query dành riêng cho điện thoại trong `admin.css`; quy tắc responsive của component xác thực dùng chung với Người học giữ nguyên. Sidebar rộng 240px, thu gọn thành dải icon 80px có tên truy cập và tooltip; logo trong sidebar chỉ hiện biểu tượng. Trang Tổng quan là một màn hình thống nhất gồm KPI, biểu đồ, tác vụ và bảng theo dõi, dùng API thật và hiển thị rõ loading/lỗi/rỗng. Admin không có chức năng đặt lại mật khẩu tài khoản người dùng khác.

Cập nhật Admin 13/11/2026: Hướng dẫn chỉ quản lý bộ chung cho mọi đề; Part 1 có tải ảnh PNG/JPEG/WebP và audio MP3/WAV. Trình biên soạn chỉ xem hướng dẫn chung. Bỏ Nhập JSON và Xem như học viên; thống kê nằm trong Tổng quan. Trang tài khoản Admin dùng `AdminAccountPage` với hồ sơ, bảo mật, làm mới thông tin và UserDto trong mục mở rộng; thiết kế này riêng Admin, không đổi component/token dùng chung với Người học.

- Dùng cùng token, font và focus; stylesheet nghiệp vụ riêng tại `styles/admin.css`, không đưa layout quản trị vào FE Người học.
- Sidebar cố định trên desktop; dưới 1024px có nút mở, backdrop, quản lý focus/Tab và Escape. Bảng dữ liệu cuộn trong container, không làm tràn toàn trang.
- Form có label, khóa khi gửi và giữ dữ liệu khi lỗi. Thông báo dùng role alert/status và có nội dung cụ thể. Không thay lỗi API bằng số liệu minh họa.
- Trình câu hỏi phân trang 5 nhóm; bảng sheet 20 dòng, giữ tất cả cột. Phân biệt bản xem trước, sheet nguồn đối soát và dữ liệu đọc lại từ hệ thống.
- Nhãn lưu/xuất bản chỉ báo hoàn tất sau khi backend xác nhận. Media thiếu/tải lỗi phải hiển thị rõ; chỉ dùng URL ký để xem dữ liệu đã lưu.
- Dialog xuất bản dùng dialog native để giữ focus và bàn phím. Tôn trọng reduced motion; các bảng dài, HTML, vocab và media phải dùng được ở 320px.

## 13. Giao diện người học (ToeicMindFE) — 14/11/2026

Giao diện người học được dựng lại bằng React từ bản HTML `LEARNER`, dùng đúng token, font, form, trạng thái và quy tắc khả năng tiếp cận ở các mục trên; CSS/JS của bản HTML cũ không được giữ lại. Bảng trang ↔ API, chi tiết từ vựng, hướng dẫn test thanh toán và bằng chứng kiểm tra nằm ở [LEARNER_INTEGRATION.md](../../ToeicMindFE/docs/LEARNER_INTEGRATION.md).

### 13.1 Khung ứng dụng và điều hướng

- `BrowserRouter` với đường dẫn thật (`/`, `/tests`, `/vocab`, …); liên kết hash cũ dạng `/#/vip/result` tự đổi sang đường dẫn. Trang tải theo nhu cầu và tự đặt tiêu đề tab.
- Chưa đăng nhập: `AuthLayout` (mục 3) cho `/login`, `/forgot-password` (`/registered` đã bỏ 17/11/2026); mọi đường dẫn khác chuyển về `/login` và nhớ trang định mở. Đăng nhập xong mở lại trang đó (chỉ nhận đường dẫn nội bộ; chặn `//host`, `\` và vòng lặp về trang xác thực), mặc định là Trang chủ `/` (`LANDING_PATH`).
- Đã đăng nhập: `LearnerLayout` gồm thanh trên cùng cao 68px (logo, điều hướng, menu người dùng) và vùng nội dung rộng tối đa 1240px. Điều hướng: Trang chủ, Nghe, Đọc, Đề thi, Từ vựng, VIP, Lịch sử; trang con sáng theo mục cha. Menu người dùng: tên, gói hiện tại (“VIP · còn N ngày” hoặc “Tài khoản miễn phí”), Tài khoản (`/account`, trang UserDto kiểm thử), Báo lỗi của tôi, Nâng cấp/Gia hạn VIP (ẩn với quản trị viên), Đăng xuất.
- Từ 900px trở xuống thanh trên cùng xuống hai hàng (điều hướng cuộn ngang ở hàng dưới), nút người dùng chỉ còn avatar và các lưới hai cột thành một cột. Màn làm bài (`/attempt/:id`) ẩn thanh điều hướng. Luyện tập và Luyện thi dùng không gian học toàn chiều rộng (mục 14.8, 18/11/2026); kiểm tra đầu vào vẫn rộng tối đa 1000px.
- Không trang nào tràn ngang đến 320px; bảng dài cuộn trong `.table-wrap`.

### 13.2 Component và lớp CSS dùng lại

Dùng lại trước khi tạo mới; mở rộng bằng biến thể (`data-tone`, `data-kind`, `size`) thay vì sao chép. Mỗi tên class chỉ định nghĩa ở một stylesheet: class trùng giữa hai file sẽ bị file nạp sau ghi đè (ví dụ `.exam-card` là thẻ đề trong lưới, còn thẻ bước của màn thi liền mạch là `.exam-step`).

| Thành phần | Dùng cho |
| --- | --- |
| `Loading`, `ErrorState`, `EmptyState`, `Notice` (`components/ui/Feedback.jsx`) | Đang tải; lỗi kèm “Thử lại” hoặc đường quay lại; danh sách rỗng; thông báo trong trang (`info`, `success`, `error`; lỗi dùng `role="alert"`) |
| `Pill` (`data-tone`: `default`, `success`, `danger`, `warning`, `muted`, `accent`), `VipPill`, `ProgressBar` (`Badges.jsx`) | Nhãn ngắn, khóa VIP, thanh tiến độ có `role="progressbar"` |
| `Chip`, `ChipLink`, `SegTabs`, `Pagination`, `PageHero` (`Controls.jsx`) | Bộ lọc, tab phân đoạn, phân trang, phần đầu trang |
| `Dialog` (`Dialog.jsx`, `size` `sm`/`md`/`lg`) | Hộp thoại `<dialog>` native; `dismissible={false}` khi đang gửi dữ liệu |
| `useToast`, `useConfirm` (`providers/`) | Toast `aria-live` (`info`/`success`/`error`, tự ẩn sau 4 giây); hộp xác nhận thay cho `confirm()` |
| `.btn` (`-primary`, `-secondary`, `-outline`, `-danger`, `-ghost-danger`, `-sm`, `-lg`, `-block`), `.card`, `.input`, `.select`, `.textarea`, `.form-field`, `.data-table`, `.state-box`, `.callout`, `.stat-card`, `.study-card`, `.exam-card`, `.page-hero` | Lớp CSS dùng chung (`styles/components.css`, `styles/learner.css`) |

### 13.3 Token bổ sung

`--color-warning: #8a5a00`, `--color-warning-bg: #fff4d6`, `--color-warning-border: #f0d58a` dành cho cảnh báo không phải lỗi (nhãn VIP, câu trả lời chậm, mức độ trung bình). Khai báo trong `tokens.css` của cả hai ứng dụng. Trạng thái luôn đi kèm chữ hoặc icon, không chỉ dựa vào màu.

### 13.4 Quy ước riêng cho trang học

- Mọi lời gọi API người học đi qua `lib/learnerHttp.js`: tự gắn Bearer và ghép query; lỗi 402 `VIP_REQUIRED` mở hộp mời nâng cấp VIP; lỗi 503 giữ thông điệp của backend. Component không gọi `fetch` trực tiếp.
- HTML do quản trị biên soạn (đoạn văn, bài đọc, giải thích) luôn đi qua `lib/sanitize.js` (DOMPurify) trước khi chèn vào trang.
- Không dùng `alert`/`confirm` của trình duyệt: thành công và lỗi nhẹ dùng toast; lỗi chặn nội dung dùng `ErrorState` có nút thử lại; xóa hoặc thoát giữa chừng dùng `useConfirm`.
- Phím tắt (`useHotkeys`) chỉ là lối tắt bổ sung: không bắt phím khi đang gõ trong ô nhập hoặc có Ctrl/Alt/Meta, và mọi thao tác vẫn có nút bấm.
- Âm thanh bài thi dùng URL ký do backend cấp (hết hạn thì lấy lại một lần). Phát âm từ dùng giọng đọc của trình duyệt (`lib/speech.js`) và im lặng khi không hỗ trợ.

### 13.5 Học từ vựng

- Mỗi từ trong một phiên được hỏi bằng **2 hoặc 3 dạng khác nhau**, chọn ngẫu nhiên trong 7 dạng: Word Quiz, Word Matching, Word Scramble, True or False, Fill in the Blank, Memory Cards, Missing Letters (mỗi dạng có tên, biểu tượng và mô tả riêng trong `features/vocab/engine/modeCatalog.js`). Hai câu của cùng một từ cách nhau cả một vòng và số lần dùng các dạng được cân bằng.
- Mỗi câu trả lời được phân loại *sai / đúng nhưng chậm / đúng / đúng nhanh* và phản hồi bằng chữ kèm màu ngay sau khi trả lời. Độ khó khởi điểm theo tiến độ ôn của từ, tự tăng hoặc giảm theo kết quả trong phiên.
- Độ quen thuộc của từ hiển thị ở màn tổng kết: **Chưa quen** (sai hết), **Mới quen** (sai một phần, hoặc đúng hết nhưng chậm), **Quen** (đúng hết, tốc độ vừa), **Rất quen** (đúng hết và nhanh). Quy tắc chấm và cách gửi `POST /api/vocab/{id}/review` nằm ở LEARNER_INTEGRATION.md mục 2; mã thuần ở `features/vocab/engine/` có kiểm thử tự động.
- Chỉ từ mới hoặc đã đến hạn ôn được gửi kết quả; luyện tự do không làm lệch lịch ôn của máy chủ.

### 13.6 Thanh toán VIP (VNPay)

- Luồng: `/vip` (chọn gói) → `POST /api/vip/orders` trả `paymentUrl` → VNPay → backend chốt đơn tại `GET /api/vip/vnpay-return` rồi chuyển 302 về `VnPay__FrontendResultUrl?status=…&txnRef=…` → `/vip/result`. `VnPay__FrontendResultUrl` của backend phải trỏ về `/vip/result` của FE (cục bộ: `http://localhost:5173/vip/result`).
- `/vip/result` chỉ nói điều backend xác nhận: `PAID` “Thanh toán thành công”; `FAILED` “chưa bị trừ tiền cho đơn này”; `PENDING` “Đang chờ xác nhận”; `NOT_FOUND`; `INVALID` và mọi giá trị lạ hiển thị “Dữ liệu không hợp lệ” kèm lời nhắc liên hệ quản trị viên nếu đã bị trừ tiền. Hạn VIP chỉ hiện khi `GET /api/vip/me` xác nhận.
- Menu người dùng hiện gói hiện tại và lối vào Nâng cấp/Gia hạn VIP. Nội dung VIP bị khóa có `VipPill`; khi máy chủ trả 402, mở hộp mời nâng cấp.

### 13.6b Đáp án chi tiết và thiết lập ban đầu (17/11/2026, chỉ ToeicMindFE)

- Đáp án chi tiết của một câu luôn là 3 khối riêng (`.detail-card` với `data-kind` `explain` / `analysis` / `vocab`): Giải thích theo bước, Phân tích từng phương án (nhãn Đúng/Sai có chữ, không chỉ màu), Từ vựng dạng thẻ `.vocab-card` có nút lưu rõ ràng và trạng thái "Đã lưu". Hai khối đầu nằm 2 cột từ 900px trở lên, khối từ vựng trải hết chiều ngang.
- Trang thiết lập ban đầu `/welcome` chạy toàn màn hình như màn làm bài, có chỉ báo bước, dấu `*` kèm chú thích "bắt buộc", lỗi ngay dưới ô (`aria-describedby`) và chuyển con trỏ tới ô lỗi đầu tiên; luôn có lối Đăng xuất.

### 13.7 Kiểm tra

`npm test`, `npm run lint`, `npm run build`; giao diện bằng Chromium thật (cần Playwright, `PLAYWRIGHT_MODULE` trỏ tới package): `npm run test:ui` (học tập, từ vựng, thanh toán) và `node scripts/check-auth-ui.cjs` (xác thực). Các kịch bản giao diện dùng **backend giả** (`scripts/mock-learner-*.mjs`, API xác thực giả trong script); báo cáo phải nói rõ điều này. `npm run check:payment` kiểm cấu hình VNPay của backend trước khi test thanh toán. Phần chưa kiểm chứng (thanh toán thẻ test thật, các luồng đăng nhập trên backend thật) nằm ở LEARNER_INTEGRATION.md mục 6.

## 14. Quy chuẩn thiết kế 2.0 — Calm Focus Learning (17/11/2026)

Chuẩn này phát triển từ giao diện xanh lá/Manrope hiện tại cho người học TOEIC trưởng thành: tập trung, đáng tin cậy, rõ tiến độ và ít gây phân tâm. Không chuyển sang phong cách đồ chơi, claymorphism, màu tím đại trà hoặc font trẻ em. Admin và FE dùng chung nền tảng token/component nhưng khác mật độ: FE thân thiện, thoáng; Admin gọn hơn và ưu tiên quét dữ liệu.

### 14.1 Nguyên tắc trải nghiệm

1. **Một mục tiêu chính mỗi màn hình:** CTA chính phải tương ứng với bước có giá trị nhất; không đặt nhiều nút primary ngang hàng.
2. **Tiến độ luôn có ngữ cảnh:** số điểm, chuỗi ngày, phần trăm và trạng thái phải kèm nhãn, mốc so sánh hoặc hành động tiếp theo; không dùng màu đơn độc để truyền đạt kết quả.
3. **Nội dung trước trang trí:** dùng khoảng trắng, viền và phân cấp chữ để tạo cấu trúc; bóng chỉ hỗ trợ lớp nổi, không biến mọi thẻ thành vật thể nổi.
4. **Phản hồi gần thao tác:** loading, thành công, lỗi và cách khắc phục xuất hiện tại vùng vừa thao tác; dữ liệu cũ không được giả thành trạng thái mới.
5. **Học tập không gián đoạn:** giữ trạng thái, vị trí và câu đang làm khi quay lại nếu nghiệp vụ cho phép; mọi phím tắt/gesture đều có nút thay thế.

### 14.2 Token ngữ nghĩa

Giữ bảng màu thương hiệu hiện tại làm nền. Component mới chỉ dùng token ngữ nghĩa; màu hex/rgba chỉ được khai báo trong `tokens.css`. Khi gặp màu cũ trong component đang sửa, chuyển màu đó sang token phù hợp trong cùng đầu việc.

| Nhóm | Token chuẩn | Vai trò |
| --- | --- | --- |
| Nền | `--color-canvas`, `--color-surface`, `--color-surface-subtle`, `--color-surface-raised` | Nền trang, thẻ, vùng phụ, lớp nổi |
| Chữ | `--color-ink`, `--color-muted`, `--color-subtle` | Chữ chính, phụ, metadata; chữ nội dung phải đạt 4.5:1 |
| Thương hiệu | `--color-primary`, `--color-primary-hover`, `--color-primary-soft`, `--color-on-primary` | CTA, link, trạng thái chọn, chữ trên primary |
| Viền/focus | `--color-border`, `--color-border-strong`, `--color-focus-ring` | Phân tách và focus; UI/focus đạt tối thiểu 3:1 |
| Trạng thái | `--color-success*`, `--color-warning*`, `--color-danger*`, `--color-info*` | Mỗi nhóm có foreground/background/border; luôn kèm chữ hoặc icon |
| Dữ liệu | `--color-data-1` … `--color-data-6` | Biểu đồ; không dùng cặp đỏ/xanh làm tín hiệu duy nhất |

Không đặt màu chữ nội dung dưới 12px. Mức chữ chuẩn: body `16/24` cho nội dung học và form, body compact `14/22` cho bảng/metadata, caption tối thiểu `12/18`, label `13/20`, H1 `clamp(28px, 3vw, 40px)`, H2 `24/32`, H3 `18/26`. Giữ Manrope cục bộ 400–800; dùng `font-variant-numeric: tabular-nums` cho điểm, thời gian và bảng số.

Khoảng cách tiếp tục theo bội số 4. Bốn cấp bố cục bắt buộc: nội bộ control `8–12px`, nội bộ card `16–24px`, giữa các khối `24–32px`, giữa các vùng trang `40–64px`. Dùng radius hiện có: control 12px, card 16px, panel 24px; pill chỉ dành cho trạng thái/nhãn ngắn, không dùng cho mọi nút.

### 14.3 Bố cục và điều hướng thích ứng

- Nội dung học tối đa 1240px; đoạn văn/giải thích dài tối đa khoảng 72 ký tự mỗi dòng. Trang làm bài ưu tiên vùng câu hỏi. Luyện tập/Luyện thi dùng không gian học hai khung toàn chiều rộng: ngữ cảnh bên trái, câu hỏi bên phải; mỗi khung cuộn riêng và đoạn văn vẫn giới hạn khoảng 72 ký tự. Đây là quyết định của người dùng ngày 18/11/2026, thay mức tối đa 1000px trước đây; chi tiết ở mục 14.8. Các trang làm bài khác giữ tối đa 1000px.
- Breakpoint kiểm tra chuẩn: `320`, `375`, `768`, `1024`, `1440px`. Không tạo breakpoint theo một thiết bị cụ thể nếu layout tự co được bằng grid/flex.
- FE desktop dùng top navigation; từ 1024px có thể giữ top navigation khi số mục vừa đủ. Ở màn nhỏ, mục cấp cao phải có một mô hình duy nhất (top scroll hoặc bottom navigation tối đa 5 mục + More), không trộn nhiều mô hình cùng cấp.
- Thanh điều hướng cuộn ngang phải có dấu hiệu còn nội dung, giữ mục hiện tại nhìn thấy và dùng được bằng bàn phím. Không ẩn nhãn của mục điều hướng cốt lõi chỉ để tiết kiệm chỗ.
- Sticky header/banner không được che focus. Sau đổi route, đưa focus tới `main` hoặc H1 và giữ hành vi Back/scroll/filter có thể dự đoán.
- Bảng nằm trong container cuộn riêng, giữ tiêu đề nếu cần; ở màn nhỏ ưu tiên card/list cho dữ liệu cần hành động, không ép toàn bộ bảng co chữ.

### 14.4 Component và trạng thái tương tác

- Chiều cao mặc định: input và CTA chính 48–50px; nút thường tối thiểu 44px trên giao diện cảm ứng; icon button tối thiểu 44×44px ở vùng dùng thường xuyên. Nút compact 32–36px chỉ dùng trong bảng desktop và vẫn phải đạt vùng trỏ 24×24px theo WCAG 2.2.
- Mỗi component có đủ `default`, `hover`, `active`, `focus-visible`, `disabled`, `loading`, `error/success` khi áp dụng. Hover không phải tín hiệu duy nhất.
- Chỉ một icon family nét 1.7; icon trang trí `aria-hidden`, icon-only control có tên truy cập. Kích thước chuẩn 16/20/24px, minh họa 32/48px.
- Motion dùng token: `--duration-fast: 120ms`, `--duration-normal: 180ms`, `--duration-slow: 280ms`; easing chuẩn `cubic-bezier(.2, 0, 0, 1)`. Chỉ animate opacity/transform/màu; trạng thái đúng không phụ thuộc `animationend`; tắt chuyển động không thiết yếu với `prefers-reduced-motion`.
- Dialog dùng `<dialog>`/component chuẩn, có tên, close/Escape, focus trap và trả focus; khi đang gửi có thể khóa đóng nhưng phải báo trạng thái. Menu người dùng cần quản lý focus/arrow/Escape hoặc dùng primitive có semantics tương đương.
- Form luôn có label hiển thị, autocomplete/inputMode đúng, cho phép paste và password manager. Lỗi inline nối bằng `aria-describedby`; nhiều lỗi phải có summary có thể focus và link tới field.

### 14.5 Thẻ học tập, dashboard và biểu đồ

- Trang chủ ưu tiên theo thứ tự: “Hôm nay nên học” → bài đang dở → lối tắt → tiến độ → lịch sử. KPI bổ trợ, không lấn CTA học tiếp.
- Thẻ học có tối đa một hành động chính nhìn thấy, nhãn trạng thái nhất quán và toàn bộ vùng click chỉ khi không chứa nút lồng nhau.
- Skeleton giữ đúng kích thước nội dung để CLS < 0.1; trạng thái rỗng có lý do và hành động tiếp theo; lỗi tải dữ liệu có nút thử lại.
- Biểu đồ có tiêu đề/đơn vị, legend hoặc nhãn trực tiếp, tooltip dùng được bằng bàn phím và tóm tắt văn bản. Cung cấp bảng/danh sách thay thế cho dữ liệu quan trọng; điểm/đường dữ liệu đạt 3:1 với nền.

### 14.6 Accessibility và tiêu chí hoàn tất

Mục tiêu bắt buộc là WCAG 2.2 AA cho luồng chính:

- chữ thường ≥4.5:1; chữ lớn và UI meaningful ≥3:1; focus rõ, không bị che;
- thao tác đầy đủ bằng bàn phím, thứ tự focus theo thị giác, không có keyboard trap ngoài dialog;
- zoom 200% và text spacing không mất nội dung/chức năng; nội dung reflow không cuộn ngang ở 320px, trừ bảng/media có container riêng;
- status dùng live region phù hợp và không tự cướp focus; trạng thái không chỉ dựa vào màu;
- âm thanh có điều khiển play/pause, trạng thái phát rõ; nội dung nghe quan trọng cần transcript khi nghiệp vụ cung cấp;
- touch target ưu tiên 44×44px, tối thiểu web 24×24px hoặc có khoảng cách/ngoại lệ hợp lệ.

Trước khi hợp nhất thay đổi UI: chạy lint/test/build của ứng dụng bị ảnh hưởng; kiểm tra bằng bàn phím và tại 375/768/1024/1440px; kiểm tra reduced motion, loading/error/empty/long text; đo contrast thay vì ước lượng. Ghi rõ UI test dùng backend thật hay mock. Thay đổi token/component dùng chung phải đồng bộ hai frontend trong cùng đầu việc.

### 14.7 Lộ trình chuẩn hóa mã hiện có

Không đổi toàn bộ giao diện trong một commit. Thực hiện theo thứ tự:

1. Bổ sung token ngữ nghĩa và thay các màu lặp lại nhiều nhất ngoài `tokens.css`.
2. Chuẩn hóa typography dưới 12px, target nút/icon và focus/menu/dialog.
3. Chuẩn hóa điều hướng responsive và focus sau route.
4. Nâng biểu đồ, bảng và trạng thái loading/error/empty.
5. Chỉ sau đó tinh chỉnh motion và trang trí.

Audit nền ngày 17/11/2026 của FE nằm tại [UI_AUDIT_2026-11-17.md](../../ToeicMindFE/docs/UI_AUDIT_2026-11-17.md).

### 14.8 Trạng thái triển khai — 18/11/2026

Đã áp quy chuẩn 2.0 cho **cả FE và Admin** (bước 1–2 và một phần bước 3 của mục 14.7). Bảng màu xanh lá và Manrope giữ nguyên. Ngày 18/11 có thử bảng màu chàm và font Be Vietnam Pro/Noto Sans do skill `ui-ux-pro-max` gợi ý; đã bỏ để theo đúng mục 14. Không dùng lại gợi ý đó.

- **Token** (`tokens.css`, giống hệt nhau ở hai ứng dụng): đủ nhóm ở mục 14.2, gồm `--color-surface-subtle/-raised`, `--color-subtle`, `--color-primary-soft`, `--color-on-primary`, `--color-border-strong` (`#748a78`, 3.2–3.7:1 cho viền ô nhập), `--color-focus-ring` (`#3f7d5f`), `--color-success*/warning*/danger*/info*`, `--color-data-1…6`, thang `--color-brand-100…500` cho minh họa và bản đồ nhiệt. Ngoài ra có thang chữ `--text-xs` (12) … `--text-4xl` (36), `--text-label` (13); kích thước `--control-height` 44, `--control-height-sm` 36, `--input-height` 48, `--cta-height` 50; motion `--duration-fast/normal/slow` 120/180/280ms với `--ease-standard`; bóng `--shadow-sm/card/raised/dialog`.
- **Màu chỉnh để đạt tương phản** (đo 18/11/2026): `--color-muted` `#65756e` → `#56665f` (5.2:1 trên `--color-panel`), `--color-success` `#23734e` → `#1e6b47`. Nhãn vai trò LEARNER dùng `--color-info*`.
- **Không còn mã hex/rgba ngoài `tokens.css`.** Màu có độ trong dùng `color-mix(in srgb, var(--token) N%, transparent)`. Không làm mờ chữ bằng `opacity`; dùng màu token.
- **Cỡ chữ:** mọi chữ giao diện từ 12px trở lên, gốc 16px. Riêng hình minh họa giao diện thu nhỏ ở trang đăng nhập (`.art-*`, `.word-*`, `.board-*`…) được giữ nhỏ vì chỉ để trang trí.
- **Vùng bấm:** nút 44px, nút nhỏ 36px, ô nhập 48px, CTA 50px, icon button FE 44px. Nút trong ô bảng desktop của Admin dùng mức 36px (`.admin-shell td .btn`).
- **Số liệu:** điểm, thời gian, ô số câu và bảng số dùng `font-variant-numeric: tabular-nums`.
- **Focus:** FE đưa focus tới `main` sau mỗi lần đổi route (bỏ qua lần tải đầu và khi có hộp thoại mở).
- **Admin:** các thay đổi đặt trong khối ghi đè ở cuối `admin.css` ("Thiết kế 17/11/2026…"), không sửa rải rác các quy tắc cũ.
- **Kiểm chứng (Chromium, backend/API giả):**
  - Quét WCAG 2.2 AA bằng script: 25 màn FE ở 1280px và 375px (gồm 4 màn của không gian học), 12 màn Admin. Kết quả 0 lỗi tương phản chữ (4.5:1), viền ô nhập (3:1) và vùng bấm (24px).
  - `check-learner-ui`, `check-vocab-ui`, `check-auth-ui` (FE) và `check-admin-navigation` (Admin) đều đạt.
  - `npm test`: FE 88/88, Admin 63/63.
  - Chưa kiểm với backend thật.
- **Không gian học cho Luyện tập/Luyện thi (FE, 18/11/2026):** dựng theo ảnh mẫu người dùng gửi. Màu và font vẫn theo token xanh lá của mục 14, không dùng màu xanh dương trong ảnh.
  - **Thanh trên** (nền `--color-primary`): Thoát, tên bài + nhãn chế độ + tiến độ, các nút hành động. Trên điện thoại thanh này gọn còn một hàng: nút phụ chỉ hiện biểu tượng, nhưng tên đọc vẫn giữ trong `.study-top-label`.
  - **Hai khung:**
    - Bên trái là ngữ cảnh: hướng dẫn tiếng Anh, thanh âm thanh dạng sóng, hình, đoạn văn.
    - Bên phải là câu hỏi: thẻ câu có nút đánh dấu sao và báo lỗi; đáp án dạng "(A) nội dung". Part 1–2 chỉ hiện (A)–(D).
    - Ngăn giữa kéo được, hoặc chỉnh bằng phím mũi tên khi đang focus (`role=separator`), trong khoảng 32–68%.
    - Từ 900px trở xuống hai khung xếp dọc; thanh trên và thanh dưới bám mép màn hình.
  - **Thanh dưới:** công cụ (Báo lỗi, Từ của tôi), nút trước/sau và bộ đếm "n/tổng". Bấm bộ đếm mở **Danh sách câu hỏi**: ngăn bên phải (`Dialog size="drawer"`) có số Đúng/Sai/Đã chọn/Chưa làm, chú giải màu và lưới theo Part.
  - **Công tắc:** `role=switch`, lớp `.study-switch`.
  - **Mã nguồn:** `src/features/exams/workspace/` và `src/styles/study.css`.
- **Còn lại theo mục 14.7:**
  - Focus sau route của Admin.
  - Menu người dùng theo pattern menu bàn phím (Arrow/Home/End).
  - Dấu hiệu cuộn cho thanh điều hướng mobile.
  - Bảng/danh sách thay thế cho biểu đồ.
  - Skeleton giữ kích thước.
  - Kiểm tra zoom 200%.
