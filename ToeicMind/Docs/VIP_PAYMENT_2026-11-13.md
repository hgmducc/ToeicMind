# VIP, thanh toán VNPay và phân quyền Miễn phí/VIP — 13/11/2026

Phạm vi: backend `G:\ToeicMind\ToeicMind`, frontend Admin `../ToeicMindAdmin - Copy` và Người học `../LEARNER`. Task: CHG-006 (mới), liên quan P03, P10. Cấu hình lấy từ `Docs/## Cấu hình (Sandbox).txt` (VNPay sandbox). Báo cáo này gồm phần rà soát/đề xuất, hợp đồng API, cách áp dụng và bằng chứng kiểm tra.

## 1. Đề xuất và quyết định thiết kế

**Mô hình quyền.** Mỗi nội dung có một trong hai mức: **FREE** (mọi tài khoản đã đăng nhập; khách chỉ xem danh sách) hoặc **VIP** (cần gói VIP còn hạn hoặc tài khoản ADMIN). Mặc định mọi thứ là FREE nên **không đổi hành vi hiện tại** cho tới khi Admin đặt VIP.

| Cấp | Cài đặt ở | Điều khiển | Ghi chú |
| --- | --- | --- | --- |
| Bộ đề | `ExamSet.ExamAccess` | Làm đề thi (Luyện thi/Luyện tập theo đề, nội dung Part, media, hướng dẫn) | Đề kế thừa quyền của bộ |
| Bộ đề | `ExamSet.VocabAccess` | Từ vựng gắn với đề của bộ (danh sách từ, bài học, học, ôn) | Từ xuất hiện ở nhiều bộ: miễn phí nếu **ít nhất một** bộ chứa nó đặt FREE; từ chưa gắn đề luôn FREE |
| Bộ đề | `ExamSet.ListeningAccess` | **Nghe**: Nghe chép và ngân hàng câu Part 1–4 | Nghe và Đọc tính riêng |
| Bộ đề | `ExamSet.ReadingAccess` | **Đọc**: ngân hàng câu Part 5–7 và Ngữ pháp | |
| Đề | `Exam.AccessLevel` (tùy chọn) | Ghi đè **chỉ quyền làm đề** của đề đó | Ví dụ bộ VIP nhưng có một đề thử miễn phí. Bỏ trống = theo bộ |

Ví dụ yêu cầu “bộ đề A cần VIP nhưng từ vựng của A miễn phí”: đặt `examAccess = VIP`, `vocabAccess = FREE`. Có thể đặt Nghe VIP / Đọc FREE (hoặc ngược lại) độc lập với đề thi.

**Quy tắc khi thực thi (máy chủ là nơi quyết định):**

- Danh sách đề/bộ/thẻ/bộ clip/bộ từ vẫn **công khai** và hiển thị cả nội dung VIP kèm cờ khóa (`isLocked`, `lockedCount`, `access`) để người dùng thấy giá trị của VIP. Chỉ **nội dung** và **ghi tiến độ** mới bị chặn bằng `402 VIP_REQUIRED`.
- Ngân hàng câu hỏi (Part 1–7) trộn câu nhiều bộ: người chưa VIP chỉ được chọn câu của bộ miễn phí; hết câu miễn phí mà còn câu VIP thì trả `VIP_REQUIRED` thay vì “hết câu”.
- Từ vựng bị khóa không xuất hiện trong danh sách/phiên học của người chưa VIP và không được ôn (`VIP_REQUIRED`); tổng quan có `lockedWords`.
- VIP hết hạn: **giữ nguyên** lịch sử, kết quả và xem lại các bài đã làm; chỉ chặn bắt đầu/tải thêm nội dung VIP.
- ADMIN luôn có toàn quyền và không cần mua.
- Mua nối tiếp: gói mới cộng từ thời hạn hiện tại nếu còn VIP.
- Đổi quyền bộ đề có hiệu lực ngay (cache từ vựng bị xóa, `UpdatedAt` của các đề được cập nhật để cache vào đề tự hết hiệu lực).

**Gói mặc định đề xuất** (chỉnh trong Admin → VIP & Thanh toán): VIP 1 tháng 99.000₫ (30 ngày), 3 tháng 249.000₫ (90 ngày, tiết kiệm ~16%), 12 tháng 799.000₫ (365 ngày, tiết kiệm ~33%). Giá là đề xuất, chưa được xác nhận.

**Chưa làm (đề xuất cho giai đoạn sau):** tự động gia hạn, mã giảm giá, dùng thử miễn phí có thời hạn, hoàn tiền (hiện xử lý thủ công bằng cách thu hồi VIP trong Admin và hoàn qua Merchant Admin), email hóa đơn, giới hạn tần suất cho API công khai.

## 2. Luồng thanh toán VNPay

1. Người học chọn gói → `POST /api/vip/orders` tạo đơn **PENDING** (giá/thời hạn được chụp lại) và trả `paymentUrl` đã ký HMAC-SHA512 (v2.1.0).
2. Trình duyệt sang VNPay thanh toán. VNPay đưa trình duyệt về `GET /api/vip/vnpay-return` (backend) và gọi máy chủ `GET /api/vip/vnpay-ipn`.
3. Cả hai gọi cùng một logic: kiểm tra chữ ký, đơn tồn tại, số tiền khớp, rồi **chốt đơn đúng một lần** (UPDATE có điều kiện `Status = PENDING` trong giao dịch Serializable). Thành công thì cộng VIP trong cùng giao dịch. Gọi lặp (return + IPN, hoặc F5) không cộng hai lần.
4. Return URL chuyển hướng 302 về trang kết quả của frontend: `FrontendResultUrl?status=PAID|FAILED|INVALID|NOT_FOUND&txnRef=…`.
5. IPN trả đúng định dạng VNPay `{ "RspCode", "Message" }`: `00` thành công, `01` không có đơn, `02` đã xác nhận, `04` sai số tiền, `97` sai chữ ký.

Chữ ký chỉ do máy chủ kiểm tra; client không thể tự đánh dấu đơn đã trả tiền. IPN cần URL công khai khai báo trong Merchant Admin; khi chạy local (không có IPN) trạng thái vẫn được chốt qua return URL.

## 3. Cấu hình

> Cập nhật 14/11/2026: giao diện Người học đã được tích hợp vào ToeicMindFE (React). Đặt `VnPay__FrontendResultUrl='http://localhost:5173/vip/result'` rồi **khởi động lại backend** (biến môi trường chỉ nạp lúc khởi động). Kiểm tra nhanh cấu hình bằng `npm run check:payment` trong ToeicMindFE.

| Khóa (`.env` / biến môi trường) | Ý nghĩa |
| --- | --- |
| `VnPay__TmnCode`, `VnPay__HashSecret` | Từ Merchant Admin (sandbox đã nạp vào `.env` local từ file cấu hình) |
| `VnPay__PaymentUrl` | Sandbox `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`; production `https://pay.vnpay.vn/vpcpay.html` |
| `VnPay__ReturnUrl` | URL **backend** nhận trình duyệt từ VNPay, ví dụ `http://localhost:5078/api/vip/vnpay-return` (production: HTTPS công khai; khai báo cùng domain trong Merchant Admin) |
| `VnPay__FrontendResultUrl` | Trang kết quả của giao diện Người học. **ToeicMindFE (React)**: `http://localhost:5173/vip/result` (đường dẫn thường, cổng Vite). Giao diện HTML cũ (`LEARNER`): `http://localhost:8000/#/vip/result`. ToeicMindFE vẫn đổi được liên kết hash cũ sang đường dẫn, nhưng nên dùng URL mới |
| `VnPay__OrderExpireMinutes` | Thời gian giữ đơn chờ (mặc định 15, giới hạn 5–60) |

`.env.example` có khung trống; `appsettings.json` có khóa rỗng. Thiếu cấu hình: `POST /api/vip/orders` trả `503 PAYMENT_NOT_CONFIGURED`.

**Bảo mật cần xử lý:** file `Docs/## Cấu hình (Sandbox).txt` chứa hash secret, tài khoản Merchant và thẻ test dạng văn bản. Đây là sandbox nên rủi ro thấp, nhưng nên **xóa file khỏi kho/ docs chia sẻ** và không dùng lại khóa này cho production (production dùng khóa riêng từ VNPay, lưu trong secret của nơi triển khai). Không log `vnp_SecureHash` hoặc secret.

## 4. API

Mới (xem thêm `ToeicMind.Learning.http`):

| Method | Route | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/vip/plans` | Công khai | Gói đang bán |
| GET | `/api/vip/me` | Đăng nhập | `{ isVip, isAdmin, expiresAt, daysLeft }` |
| POST | `/api/vip/orders` | Đăng nhập | Body `{ planCode }` → 201 `{ orderId, txnRef, amount, paymentUrl, expiresAt }` |
| GET | `/api/vip/orders`, `/api/vip/orders/{id}` | Đăng nhập | Đơn của tôi |
| GET | `/api/vip/vnpay-return`, `/api/vip/vnpay-ipn` | Công khai (ký HMAC) | Do VNPay gọi |
| GET/POST/PUT | `/api/admin/vip/plans[/{id}]` | ADMIN | Quản lý gói |
| GET | `/api/admin/vip/orders` | ADMIN | Lọc `status`, `userId` |
| PUT | `/api/admin/vip/users/{userId}` | ADMIN | **Đổi từ 18/11/2026 (CHG-008):** `{ action: GRANT|REVOKE, days, reason }`; cộng nối tiếp, bắt buộc lý do, ghi `VipHistory` — xem [VIP_HISTORY_2026-11-18.md](VIP_HISTORY_2026-11-18.md). Body `{ expiresAt }` cũ bị từ chối (400) |

Trường mới/đổi trong API hiện có:

- `ExamSetDto` + `SaveExamSetRequestDto`: `examAccess`, `vocabAccess`, `listeningAccess`, `readingAccess` (FREE/VIP, mặc định FREE).
- `ExamDto`: `accessLevel` (ghi đè hoặc null), `effectiveAccess`, `isLocked` (chỉ trong danh sách người học). `SaveExamRequestDto`/import: `accessLevel` (FREE/VIP/null).
- `GET /api/exams/{id}/modes`: `access`.
- Thẻ ngân hàng và chủ điểm ngữ pháp: `lockedCount`. Nghe chép: `isLocked` (bộ clip, đề), `access`/`isLocked` (bộ đề). Từ vựng: `lockedWords`, bộ đề `access`/`isLocked`, đề `isLocked`.
- `UserDto`, `AdminUserDto`: `isVip`, `vipExpiresAt`.
- Lỗi mới: `402 VIP_REQUIRED`, `503 PAYMENT_NOT_CONFIGURED`, `404 VIP_PLAN_NOT_FOUND`/`ORDER_NOT_FOUND`, `409 ADMIN_NO_PURCHASE`/`VIP_PLAN_CODE_EXISTS`.
- Thay đổi chữ ký service nội bộ: các API nội dung đề (`directions`, `parts`, `media`) cần `userId`; không đổi route.

## 5. Frontend

| Client | Thay đổi |
| --- | --- |
| Admin | Mục **VIP & Thanh toán** (gói: thêm/sửa/tắt; đơn: lọc theo trạng thái). Bộ đề: chọn quyền cho 4 tính năng khi tạo/sửa, hiển thị trong bảng. Đề: cột “Quyền làm đề”. **Trang nhập/biên soạn đề**: ô “Quyền truy cập đề” (Theo bộ đề / Miễn phí / VIP) và tóm tắt quyền của bộ đã chọn. Người dùng: cột VIP và nút “Cấp VIP” (số ngày, 0 = thu hồi) |
| Người học | Trang **VIP** (`#/vip` ở giao diện HTML cũ, `/vip` ở ToeicMindFE): trạng thái, gói, mua → chuyển sang VNPay, lịch sử đơn; trang kết quả (`#/vip/result` hoặc `/vip/result`). Nhãn VIP trên thẻ đề, bộ clip nghe chép, thẻ ngân hàng, bộ từ vựng. Hộp “Chọn chế độ” cảnh báo đề VIP. Mọi lời gọi API trả `402 VIP_REQUIRED` tự mở hộp thoại mời nâng cấp (đóng luôn các hộp thoại bên dưới) |

## 6. Áp dụng — thứ tự bắt buộc

1. **Chạy [DATABASE/01_schema.sql](DATABASE/01_schema.sql), phần D — CHG-006, trước khi chạy backend mới**. Toàn bộ migration VIP đã gộp vào file này: cột của `Users`/`ExamSet`/`Exam`, bảng `VipPlan`/`PaymentOrder`, ràng buộc, index và ba gói mặc định. Script kiểm tra tồn tại, giữ dữ liệu/giá gói đã sửa và tự bật `QUOTED_IDENTIFIER ON`. Database đã có chạy `01 → 02 → 03`, bỏ `00_create_database.sql`; không cần migration VIP rời. **Chọn đúng database đích**: file hiện ghi `USE ToeicDb`; khi triển khai lên database tên khác phải điều chỉnh dòng `USE` tương ứng, không chỉ truyền `sqlcmd -d`.
2. Đặt các biến `VnPay__*` (đã có trong `.env` local).
3. Khởi động lại backend; triển khai Admin và Learner mới cùng lúc.
4. Vào Admin → Bộ đề & Đề thi để đặt quyền VIP cho những bộ/đề cần thu phí; Admin → VIP & Thanh toán để chỉnh giá.
5. (Production/có domain) khai báo IPN URL `…/api/vip/vnpay-ipn` trong Merchant Admin.

## 7. Kiểm chứng đã chạy

Môi trường: **bản sao** của CSDL test (sao lưu COPY_ONLY → khôi phục thành DB tạm → chạy migration hai lần), backend build mới chạy cổng 5099. CSDL gốc **không bị thay đổi** (xác nhận chưa có bảng VIP); DB tạm và file sao lưu đã xóa.

| Kiểm tra | Kết quả |
| --- | --- |
| Migration chạy 2 lần | Đạt, idempotent; 3 gói mặc định, 4 cột quyền bộ đề, `Exam.AccessLevel`, `Users.VipExpiresAt`, `PaymentOrder` |
| Build backend | 0 warning / 0 error |
| Luồng HTTP đầu-cuối (65 kiểm tra) | Đạt: quyền theo bộ đề (đề VIP/từ vựng FREE/Nghe VIP/Đọc FREE), danh sách khóa, 402 ở bắt đầu làm bài/Part/hướng dẫn/clip/ghi tiến độ nghe chép, ngân hàng Part 1 khóa và Part 5 mở, từ vựng khóa/mở theo bộ, ghi đè quyền theo đề, đổi quyền có hiệu lực ngay (cache), tạo đơn, return sai chữ ký/hủy/thành công, IPN sai tiền (04) và lặp (02), VIP không bị cộng hai lần, mua nối tiếp (~120 ngày), VIP mở khóa mọi nội dung, người khác không xem được đơn của mình, API admin (gói, đơn, cấp/thu hồi, 403 với người học), admin luôn VIP và không cần mua |
| URL thanh toán với **sandbox VNPay thật** | Sandbox chấp nhận chữ ký (hiển thị trang chọn phương thức, không báo sai chữ ký) |
| Frontend Learner (trình duyệt headless, 15 kiểm tra) | Đạt, không lỗi console: nhãn VIP, cảnh báo ở hộp chế độ, hộp thoại 402 → trang VIP, danh sách gói, mua → chuyển tới VNPay với chữ ký và số tiền đúng, trang kết quả PAID/FAILED/INVALID, nhãn Nghe/Ngân hàng, từ vựng, trang chủ, báo lỗi của tôi. Phát hiện và sửa lỗi hộp “Chọn chế độ” che trang VIP |
| Frontend Admin | Build + 59 test + kiểm tra điều hướng đạt |

## 8. Chưa kiểm chứng / hạn chế

- **Chưa thanh toán thành công bằng thẻ test trên giao diện VNPay sandbox** (cần thao tác thủ công trong trình duyệt). Phản hồi return/IPN được kiểm bằng cách tự ký với cùng thuật toán theo tài liệu VNPay; chữ ký **gửi đi** đã được sandbox chấp nhận. Nên thanh toán thử một lần bằng thẻ NCB trong file cấu hình để xác nhận chữ ký **nhận về**.
- IPN chưa được VNPay gọi thật (local không có URL công khai).
- Chưa chạy trên CSDL thật `ToeicDb`; migration chưa áp dụng cho các database của bạn.
- Giao diện Admin mới (trang VIP, ô quyền ở trang nhập đề) chỉ được build và test tự động, chưa mở trong trình duyệt.
- IP khách lấy từ kết nối trực tiếp; sau reverse proxy cần cấu hình Forwarded Headers.
- Chưa có giới hạn tần suất cho tạo đơn và API công khai.
