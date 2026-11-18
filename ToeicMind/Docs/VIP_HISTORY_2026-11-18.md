# CHG-008 — Lịch sử VIP, cấp VIP có lý do, người dùng tự sửa hồ sơ (18/11/2026)

Phạm vi: backend `G:\ToeicMind\ToeicMind`, Admin `../ToeicMindAdmin`, Người học `../ToeicMindFE`. Liên quan CHG-006 ([VIP_PAYMENT_2026-11-13.md](VIP_PAYMENT_2026-11-13.md)).

## 1. Quyết định

- **VIP do quản trị viên cấp không ghi vào lịch sử thanh toán.** Không có giao dịch tiền nên một "đơn 0đ" sẽ làm sai doanh thu, đối soát VNPay và danh sách đơn của Admin. `PaymentOrder` chỉ chứa giao dịch thật.
- **Mọi thay đổi thời hạn VIP ghi vào bảng mới `VipHistory`**:
  - `PURCHASE`: gắn với đơn thanh toán.
  - `ADMIN_GRANT`: quản trị viên tặng hoặc gia hạn.
  - `ADMIN_REVOKE`: quản trị viên thu hồi.
  - Mỗi dòng lưu hạn trước, hạn sau và số ngày.
  - Với `ADMIN_*` thì lưu thêm quản trị viên thực hiện và lý do (bắt buộc).
- **Người học xem được "Lịch sử VIP" của mình**, nhưng không thấy lý do nội bộ hay người thực hiện. Ví dụ hiển thị:
  - "Được quản trị viên tặng 15 ngày VIP · Miễn phí · Hạn VIP mới …"
  - "Mua VIP 1 tháng · 99.000 ₫ · Mã đơn …"
- **Quản trị viên cấp VIP bằng "cộng thêm N ngày".**
  - Nếu người dùng còn VIP thì cộng nối tiếp từ hạn hiện tại, giống khi mua gói, nên người đã mua không bị mất ngày.
  - Không còn cho đặt thẳng ngày hết hạn. Trước đây Admin nhập "số ngày tính từ hôm nay" và giá trị này **thay thế** hạn cũ.
- **Người dùng tự sửa hồ sơ của chính mình** (`PUT /api/auth/me`, chỉ tên hiển thị). Quản trị viên không có API sửa tên, email hay mật khẩu của người khác.

## 2. API

| Method | Route | Quyền | Mô tả |
|---|---|---|---|
| PUT | `/api/auth/me` | Đăng nhập | `{ username }` (1–100 ký tự, cắt khoảng trắng); trường lạ → 400. Trả `UserDto`. Chi tiết: A11 trong `TOEIC_API_Documentation.md` |
| PUT | `/api/admin/vip/users/{userId}` | ADMIN | `{ action: "GRANT", days: 1–3660, reason }` hoặc `{ action: "REVOKE", reason }`. Trả `AdminVipHistoryItemDto` vừa ghi. Body `{ expiresAt }` cũ → 400 |
| GET | `/api/admin/vip/users/{userId}/history` | ADMIN | Lịch sử VIP (tối đa 100 dòng, mới nhất trước), kèm `reason`, `actorUserId`, `actorName` |
| GET | `/api/vip/history` | Đăng nhập | Lịch sử VIP của chính mình: `kind`, `days`, `previousExpiresAt`, `newExpiresAt`, `createdAt`, với `PURCHASE` thêm `planName`, `amount`, `txnRef`. Không có lý do/người thực hiện |

Mã lỗi mới:
- `400`: `VIP_ACTION_INVALID`, `VIP_DAYS_INVALID`, `VIP_REASON_REQUIRED`, `USERNAME_REQUIRED`, `USERNAME_TOO_LONG`.
- `409`:
  - `VIP_TARGET_ADMIN`: quản trị viên luôn có toàn quyền.
  - `VIP_NOT_ACTIVE`: thu hồi khi đang không có VIP.
- `503 VIP_HISTORY_SCHEMA_MISSING`: database chưa chạy phần F.

**Giao dịch:**
- Cấp/thu hồi chạy trong một giao dịch `Serializable`: đọc hạn hiện tại, cập nhật `Users.VipExpiresAt` và ghi `VipHistory`. Lỗi giữa chừng thì không đổi gì.
- Chốt đơn VNPay ghi thêm dòng `PURCHASE` trong cùng giao dịch cộng VIP.
- **Thiếu bảng `VipHistory`** (chưa chạy phần F): thanh toán vẫn chốt đơn và cộng VIP, chỉ bỏ ghi nhật ký. Hai API lịch sử/cấp VIP trả 503.

## 3. Database — phần F của `Docs/DATABASE/01_schema.sql`

- **F1:** bảng `dbo.VipHistory`.
  - Khóa ngoại tới `Users`, `PaymentOrder` và `Users` (người thực hiện).
  - CHECK theo loại:
    - `PURCHASE` cần `OrderId`;
    - `ADMIN_*` cần người thực hiện và lý do;
    - `ADMIN_REVOKE` có `NewExpiresAt` NULL.
  - Index `IX_VipHistory_User_Created`.
  - Unique có điều kiện `UX_VipHistory_Order`: mỗi đơn tối đa một dòng.
- **F2:** bổ sung dòng `PURCHASE` cho các đơn `PAID` có trước CHG-008. Không biết hạn trước/sau nên để NULL. Chạy lại không tạo trùng.
- **Thứ tự áp dụng:** chạy `01_schema.sql` trên đúng database, sửa dòng `USE ToeicDb;` cho đúng tên database, **rồi** chạy backend mới. Script có thể chạy lại và giữ nguyên dữ liệu.
- Script **chưa chạy** trên database thật `ToeicDb`/`ToeicDb_Test_v1`; cần người dùng xác nhận.

## 4. Giao diện

- **FE `/account`:**
  - Bỏ khối JSON `UserDto` và dòng hạn access/refresh token.
  - Thêm form sửa tên hiển thị, form đổi mật khẩu (sai mật khẩu hiện tại báo tại ô, không đăng xuất), lối sang Lộ trình và nút Đăng xuất.
- **FE `/vip`:** thêm "Lịch sử VIP" trước "Lịch sử thanh toán", kèm ghi chú rằng VIP được tặng không có trong lịch sử thanh toán.
- **Admin `/account`:** tương tự FE.
- **Admin Người dùng → "Cấp VIP":** hộp thoại `VipGrantDialog` gồm:
  - Cộng thêm ngày (chọn nhanh 7/30/90/365, xem trước hạn mới) hoặc Thu hồi;
  - lý do bắt buộc, có gợi ý nhanh;
  - bảng lịch sử VIP của người dùng.
- **Trình gọi API (FE và Admin):** `401` có mã `INVALID_OLD_PASSWORD` không còn bị coi là hết phiên.

## 5. Kiểm chứng (18/11/2026)

**API thật trên database tạm.**
- **Môi trường:**
  - Database tạm là bản sao `ToeicDb_Test_v1` (backup `COPY_ONLY` → restore thành `ToeicDb_tmp_chg008`).
  - Phần F chạy 2 lần đạt. Lần đầu bổ sung 1 dòng cho 1 đơn đã thanh toán; lần hai không tạo trùng.
  - Backend build mới chạy ở cổng 5099.
- **8 nhóm kiểm tra đạt:**
  - `PUT /auth/me` sửa tên; từ chối role/email/userId/status, tên rỗng, tên quá 100 ký tự, thiếu token.
  - Đổi mật khẩu:
    - sai mật khẩu hiện tại → `401 INVALID_OLD_PASSWORD`;
    - đúng → 200, refresh token cũ bị thu hồi, mật khẩu cũ không đăng nhập được.
  - Quản trị viên chỉ sửa được hồ sơ của mình; `PUT/PATCH /admin/users/{id}`, `/profile`, `/password` đều không tồn tại (404/405).
  - Cấp VIP bị từ chối khi:
    - gửi body cũ `{ expiresAt }`;
    - thiếu lý do hoặc số ngày;
    - thao tác lạ;
    - thu hồi khi không có VIP (409);
    - người học gọi API quản trị (403);
    - cấp cho quản trị viên (409).
  - GRANT 30 ngày rồi GRANT 10 ngày: lần đầu tính từ hiện tại, lần sau cộng nối tiếp; `/vip/me` khớp.
  - Mua gói qua IPN VNPay có chữ ký hợp lệ (khóa sandbox): ghi `PURCHASE` với mã đơn, số tiền và hạn nối tiếp. Gọi IPN lần 2 trả `02` và không ghi trùng.
  - REVOKE kết thúc VIP. Lịch sử của người học không có `reason`/`actorUserId`/`actorName`; Admin xem đủ. Người học gọi lịch sử Admin bị 403. Không có đơn 0đ.
- **Khi xóa bảng `VipHistory` trên database tạm và khởi động lại:**
  - thanh toán vẫn chốt đơn và cộng VIP;
  - `/vip/history` và cấp VIP trả `503 VIP_HISTORY_SCHEMA_MISSING`;
  - hạn VIP không đổi.
- **Dọn dẹp:** sau kiểm tra đã xóa database tạm và file backup. `ToeicDb_Test_v1` được xác nhận không thay đổi (chưa có `VipHistory`).

**Giao diện với backend giả:**
- `check-learner-ui` (FE) đạt, gồm Tài khoản và Lịch sử VIP.
- `check-auth-ui` (FE) đạt.
- `check-admin-navigation` (Admin) đạt, gồm Tài khoản và hộp thoại VIP.
- Quét WCAG FE ở 1280px và 375px: 0 lỗi.

**Chưa kiểm:** chạy thử giao diện FE với backend thật. Lần chạy dừng giữa chừng vì máy hết bộ nhớ ảo (backend báo `OutOfMemoryException` khi Chrome của người dùng chiếm nhiều RAM), không phải do lỗi mã.
