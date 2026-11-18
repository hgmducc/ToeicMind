# ĐẶC TẢ USE CASE VÀ PHÂN TÍCH NGHIỆP VỤ — HỆ THỐNG HỖ TRỢ HỌC VÀ LUYỆN THI TOEIC

| Mục | Nội dung |
|---|---|
| Phiên bản | **v1.3** (thay thế v1.2; đồng bộ với `TOEIC_DatabaseDesign_v1.3.md`; bổ sung auth theo triển khai 27/10/2026: refresh token, đăng nhập Google, đặt lại mật khẩu) |
| Ngày | 29/10/2026 |
| Phạm vi | Use Case **MVP** (26 UC), Use Case **Version 2** (2 UC có đặc tả, danh sách còn lại), Phân tích nghiệp vụ (Phase 7) |
| Không bao gồm | Use Case Diagram (Phase 6, bỏ qua theo yêu cầu), API, giao diện |
| Cơ sở | Khảo sát 5 nhóm, 3 màn hình chọn chế độ và học, 2 màn hình hướng dẫn, dữ liệu demo, các quyết định đã chốt (mục 3) |

---

## 0. THUẬT NGỮ

| Thuật ngữ | Giải thích ngắn |
|---|---|
| Actor | Vai trò bên ngoài tương tác với hệ thống (Khách, Người học, Admin) |
| Use Case (UC) | Một mục tiêu cụ thể Actor muốn đạt, mô tả từng bước |
| Main / Alternative / Exception Flow | Luồng thành công / nhánh rẽ hợp lệ / nhánh lỗi |
| Include / Extend | UC này luôn gọi UC khác / UC này là phần tùy chọn mở rộng từ UC khác |
| Luyện thi | Tab làm bài theo quy chế thi: Full Test, Thi Listening, Thi Reading, Thi theo Part (`Mode = EXAM`) |
| Luyện tập | Tab làm bài theo Part, xem đáp án và giải thích ngay (`Mode = PRACTICE`, `Scope = PART`) |
| Học theo ngân hàng | Học xuyên mọi đề theo Level hoặc chủ điểm (`Mode = PRACTICE`, `Scope = BANK`) |
| Nhóm câu hỏi | Các câu dùng chung audio hoặc đoạn văn (Part 3, 4, 6, 7); Part 1, 2, 5 mỗi nhóm một câu |
| Hướng dẫn | Văn bản, audio, hình hiển thị trước phần Listening, phần Reading và từng Part |
| ASM | Assumption: giả định tạm của BA, chờ bạn xác nhận |

---

## 1. PHẠM VI VÀ ACTOR

| Actor | Vai trò |
|---|---|
| **Khách** | MVP: đăng ký và đăng nhập. Xem và làm bài công khai: Version 2 |
| **Người học** | Luyện thi, luyện tập, học theo ngân hàng, học từ vựng và ngữ pháp, xem kết quả và lịch sử, báo lỗi |
| **Admin** | Một loại Admin duy nhất: quản lý đề, câu hỏi, hướng dẫn, từ vựng, ngữ pháp, nhập Excel, xử lý báo cáo |
| Hệ thống | Không phải Actor; thực hiện các bước tự động (chấm điểm, đếm giờ, chuyển câu) |

---

## 2. DANH SÁCH USE CASE

### 2.1. MVP

| UC | Tên | Actor | FR | Quan hệ |
|---|---|---|---|---|
| UC-01 | Đăng ký tài khoản | Khách | FR-G04 | |
| UC-02 | Đăng nhập | Người học, Admin | FR-G05, FR-A10 | |
| UC-03 | Đăng xuất | Người học, Admin | FR-L04, FR-A10 | |
| UC-04 | Làm bài Luyện thi (Full Test, Thi Listening, Thi Reading, Thi theo Part) | Người học | FR-L05, L06, L07, L08 | include UC-09, UC-10 |
| UC-05 | Làm bài Luyện tập theo Part | Người học | FR-L05 | include UC-10; extend UC-14, UC-16 |
| UC-06 | Học theo ngân hàng câu hỏi (Level, chủ điểm) | Người học | FR-L27 | include UC-10; extend UC-14, UC-16 |
| UC-07 | Ôn luyện câu sai và làm lại | Người học | FR-L28 | mở rộng UC-06 |
| UC-08 | Xóa tiến độ của một thẻ | Người học | FR-L29 | |
| UC-09 | Xem hướng dẫn trước phần thi và Part | Người học | FR-L30 | được include bởi UC-04 |
| UC-10 | Chấm điểm và quy đổi điểm | Hệ thống | FR-L09 | được include bởi UC-04, 05, 06 |
| UC-11 | Xem kết quả | Người học | FR-L10 | |
| UC-12 | Xem lại bài đã làm | Người học | FR-L10, L11 | extend UC-14, UC-16 |
| UC-13 | Xem lịch sử làm bài | Người học | FR-L14 | |
| UC-14 | Báo cáo lỗi nội dung | Người học | FR-L15 | |
| UC-15 | Học nhóm từ vựng có sẵn | Người học | FR-L16 | extend UC-16 |
| UC-16 | Lưu từ vựng vào bộ cá nhân | Người học | FR-L17 | |
| UC-17 | Xem và quản lý bộ từ vựng cá nhân | Người học | FR-L18 (phần xem) | **đề xuất MUST, chờ ISSUE-011** |
| UC-18 | Đọc bài ngữ pháp | Người học | FR-L20 | |
| UC-19 | Quản lý đề thi (kể cả mã đề) | Admin | FR-A01 | include UC-20 khi nhập nội dung |
| UC-20 | Quản lý nhóm câu hỏi, câu hỏi và đáp án | Admin | FR-A02 | |
| UC-21 | Nhập đề và dữ liệu từ Excel | Admin | FR-A11 | |
| UC-22 | Quản lý hướng dẫn (mặc định và riêng từng đề) | Admin | FR-A12 | |
| UC-23 | Quản lý từ vựng và chủ đề từ vựng | Admin | FR-A03 | |
| UC-24 | Quản lý nhóm từ vựng | Admin | FR-A04 | |
| UC-25 | Quản lý bài ngữ pháp | Admin | FR-A05 | |
| UC-26 | Xử lý báo cáo | Admin | FR-A09 | include UC-20, UC-23, UC-25 |
| UC-29 | Quản lý bộ đề | Admin | FR-A01 (mở rộng) | include UC-19 khi tạo đề trong bộ |

### 2.2. Version 2

| UC | Tên | Actor | FR |
|---|---|---|---|
| UC-27 | Luyện nghe theo clip | Người học | FR-L31 |
| UC-28 | Quản lý clip nghe (TH1 và TH2) | Admin | FR-A13 |

Chưa viết chi tiết (viết khi vào Version 2): Khách xem và làm bài công khai (FR-G01 đến G03), quên mật khẩu (FR-G06), thông tin cá nhân và đổi mật khẩu (FR-L01, L02), tự xóa tài khoản sau 30 ngày (FR-L03, S01), hồ sơ tiến độ, target, ngày thi, test đầu vào (FR-L21 đến L23), checklist và streak (FR-L24, L25, S03), gắn cờ và luyện lại câu (FR-L12, L13), học lại từ vựng đã lưu (FR-L19), danh sách người dùng, khóa tài khoản, thống kê Admin (FR-A06 đến A08), gợi ý lộ trình AI (FR-L26, Future), gói PRO và thanh toán (Future).

### 2.3. Chức năng phát sinh từ Change Request (FR mới)

| FR | Chức năng | Nguồn |
|---|---|---|
| FR-L27 | Học theo ngân hàng câu hỏi theo Level và chủ điểm | CR-002 |
| FR-L28 | Ôn luyện câu sai và làm lại | CR-002 |
| FR-L29 | Xóa toàn bộ tiến độ của một thẻ | CR-002 |
| FR-L30 | Xem hướng dẫn trước từng phần thi và Part | CR-005 |
| FR-L31 | Luyện nghe theo clip | CR-001 |
| FR-A11 | Nhập đề và dữ liệu từ Excel | CR-003 |
| FR-A12 | Quản lý hướng dẫn | CR-005 |
| FR-A13 | Quản lý clip nghe | CR-001 |

CR-004 (cấu trúc lại chế độ làm bài thành hai tab Luyện thi và Luyện tập) đưa FR-L08 (Thi Listening, Thi Reading) từ Version 2 lên **MVP**.

---

## 3. QUYẾT ĐỊNH ĐÃ CHỐT, GIẢ ĐỊNH VÀ ISSUE

### 3.1. Nhật ký quyết định

| ID | Quyết định | Ảnh hưởng |
|---|---|---|
| DEC-001 | Hai tab: **Luyện thi** (Full Test 120 phút/200 câu, Thi Listening 45 phút/100 câu, Thi Reading 75 phút/100 câu, Thi theo Part) và **Luyện tập** (chọn Part hoặc cả 7 Part, xem đáp án ngay). Mọi lựa chọn nằm trong phạm vi một đề | UC-04, UC-05 |
| DEC-002 | Luyện thi theo quy chế thi: làm theo thứ tự, không quay lại, không xem lại chi tiết sau khi nộp, Listening tự chuyển khi hết audio, audio phát một lần, tính giờ theo máy chủ | UC-04, UC-11, UC-12 |
| DEC-003 | Reading khi thi dùng **một đồng hồ 75 phút cho cả Part 5, 6, 7**, không đếm giờ từng câu; chọn đáp án thì tự chuyển câu hoặc người học chuyển thủ công | UC-04 |
| DEC-004 | Thời gian xem hướng dẫn **không tính** vào đồng hồ thi | UC-04, UC-09 |
| DEC-005 | Học theo ngân hàng xuyên mọi đề: Level 1 đến 4 và 4 nhóm chủ điểm; có "làm lại", "ôn câu sai", "xóa tiến độ" | UC-06, 07, 08 |
| DEC-006 | "Câu sai" là câu có lần trả lời gần nhất sai; làm đúng ở lần sau thì thành đúng | UC-07 |
| DEC-007 | Tiến độ "đã luyện" chỉ tính từ Luyện tập và học theo ngân hàng, không tính Luyện thi | UC-05, 06, 07 |
| DEC-008 | Luyện tập không cần đồng hồ; có thể hiển thị thời gian làm bài mang tính theo dõi | UC-05, 06 |
| DEC-009 | Ngữ pháp có 15 chủ điểm, chỉ ở Part 5; Part 6 chỉ phân loại theo loại văn bản | UC-18, UC-20 |
| DEC-010 | Nội dung do Admin quản lý chỉ xóa mềm; dữ liệu cá nhân của người học xóa thật sau 30 ngày khi tự xóa tài khoản (V2) | Mọi UC quản lý |
| DEC-011 | Xác thực dùng JWT access token ngắn hạn và refresh token; không lưu session đăng nhập. Refresh token chỉ lưu dưới dạng hash trong `RefreshTokens`, có hạn dùng và có thể thu hồi; một vai trò mỗi người dùng, không có bảng `Roles` | UC-02, UC-03 |
| DEC-012 | Gói PRO, nạp tiền, khóa nội dung theo gói thuộc Future | UC-06 (thẻ PRO) |
| DEC-013 | Chấp nhận CR-001 đến CR-005 (CR-001 ở đầu Version 2; CR-002 giới hạn phiên bản đầu ở Part 5) | Mục 2 |
| DEC-014 | Mã nhóm trong file nhập (`{Mã đề}_Part {n}_{phạm vi câu}`, điền ở mọi dòng) chỉ dùng để nhập liệu và kiểm tra; database không lưu mã này | DB-DEC-18 |
| DEC-015 | Giải thích đáp án là một ô `option_explanations` cho mỗi câu, không tách theo đáp án | DB-DEC-19 |
| DEC-016 | Transcript có ở Part 1 đến 4 (Part 1, 2 là nội dung đọc thật); bản dịch cho mọi nhóm, kể cả Part 5 | DB-DEC-20 |
| DEC-017 | Từ vựng dùng chung, khóa (từ gốc, loại từ); khi trùng giữ nghĩa cũ; nghĩa theo ngữ cảnh lưu riêng | DB-DEC-21 |
| DEC-018 | Mã đề do Admin nhập hoặc server tự sinh khi bỏ trống; khi sửa bỏ trống giữ mã hiện hành; import chuẩn kiểm tra tiền tố mã nhóm | DB-DEC-22; cập nhật theo người dùng 30/10/2026 |
| DEC-019 | Media không lưu kích thước, định dạng MIME, thời lượng | Chốt 29/10/2026 |
| DEC-020 | Số câu trong mã nhóm dùng ba chữ số (`001`, `032`) | ASM-DB-02 đã chốt |
| DEC-021 | Báo cáo nhập ghi nhận từ có nghĩa gốc khác nhau, không cần Admin xử lý | ASM-DB-03 đã chốt |
| DEC-022 | Cấp bộ đề: bộ đề (`ExamSet`) gồm nhiều đề; mỗi đề thuộc đúng một bộ; mã đề và tên đề duy nhất trong bộ | Yêu cầu người dùng 29/10/2026; DB-DEC-24 |
| DEC-023 | Bộ đề chỉ xóa mềm khi không còn đề chưa xóa; bộ chỉ hiện cho người học khi có đề đã xuất bản | DB-DEC-25 |

### 3.2. Giả định tạm (ASM)

| ID | Giả định | UC |
|---|---|---|
| ASM-01 | Đăng ký bằng email và mật khẩu; không xác thực email, không đăng nhập Google | UC-01, 02 |
| ASM-02 | Thoát giữa chừng (đóng tab, đăng xuất): Luyện thi ghi trạng thái "Bỏ dở", không có điểm; Luyện tập và học theo ngân hàng giữ các đáp án đã trả lời và tiến độ đã ghi | UC-03, 04, 05, 06 |
| ASM-03 | Lưu từ vựng: tự điền nghĩa nếu từ có trong từ điển; không có thì người học tự nhập nghĩa | UC-16 |
| ASM-04 | Đăng nhập chung một form cho Người học và Admin, hệ thống chuyển trang theo vai trò | UC-02 |
| ASM-05 | Báo cáo có 4 trạng thái: Mới, Đang xử lý, Đã xử lý, Từ chối | UC-14, 26 |
| ASM-06 | Trong Luyện thi không cho báo lỗi và lưu từ (tránh gián đoạn quy chế thi) | UC-04, 14, 16 |
| ASM-07 | Nút "Bỏ qua phần này" ở màn hình hướng dẫn dùng được cả khi thi (không ảnh hưởng thời gian) | UC-09 |
| ASM-08 | Đồng hồ Reading 75 phút bắt đầu khi người học vào Part 5 (sau hướng dẫn); Listening không có đồng hồ riêng, kết thúc theo audio | UC-04 |
| ASM-09 | Với nhóm nhiều câu (Part 6, 7), người học trả lời các câu của nhóm rồi nhấn "Tiếp" để sang nhóm sau (ISSUE-031) | UC-04 |
| ASM-10 | Học theo ngân hàng: mỗi lượt gồm tối đa 20 câu chưa luyện, cấu hình được (ISSUE-029) | UC-06 |
| ASM-11 | Luyện tập: hướng dẫn của Part không bắt buộc hiển thị, người học có thể xem tùy chọn (ISSUE-030) | UC-05 |
| ASM-12 | Luyện tập: audio nghe lại không giới hạn số lần (khi thi giới hạn theo `PartSetting.AudioPlayLimit`) | UC-05 |
| ASM-13 | Phiên bản đầu của học theo ngân hàng chỉ có Part 5 (Level và 4 chủ điểm); Part 6, 7 mở sau | UC-06 |
| ASM-14 | Người học gỡ từ khỏi bộ cá nhân bằng xóa thật (dữ liệu cá nhân, không phải nội dung Admin) | UC-17 |

### 3.3. Issue còn mở

| Issue | Vấn đề | Mức độ | Gợi ý |
|---|---|---|---|
| ISSUE-011 | Có nâng "xem danh sách từ đã lưu" lên MUST không (UC-17)? | MEDIUM | Đề xuất: MUST (lưu mà không xem được thì không có giá trị khi demo) |
| ISSUE-012 | Mỗi chủ điểm ngữ pháp một hay nhiều bài? | MEDIUM | Thiết kế hỗ trợ nhiều bài |
| ISSUE-014 | Danh sách chủ đề từ vựng | MEDIUM | Dùng cách mặc định: seed sẵn, Admin thêm; gợi ý lấy 18 chủ đề tình huống của Part 3, 4 |
| ISSUE-017 | Part 1, 2: hiện chữ đáp án khi thi hay chỉ A/B/C/D như đề thật? | LOW | Chữ đáp án chỉ hiện khi xem lại |
| ISSUE-029 | Số câu mỗi lượt khi học theo ngân hàng | LOW | Đề xuất 20 |
| ISSUE-033 | Quên mật khẩu: triển khai đã có bảng `PasswordResetOtps`; đưa vào MVP (UC-02 A1) hay giữ V2? | MEDIUM | Đề xuất MVP vì hạ tầng đã có; cần viết thêm UC chi tiết |
| ISSUE-034 | Đăng nhập Google khi email đã có tài khoản mật khẩu: tự liên kết hay từ chối? | MEDIUM | Đề xuất: chỉ liên kết khi Google xác nhận email đã được xác minh; nếu không thì yêu cầu đăng nhập bằng mật khẩu |
| ISSUE-030 | Luyện tập có hiển thị hướng dẫn Part không | LOW | Đề xuất: tùy chọn |
| ISSUE-031 | Reading khi thi: nhóm nhiều câu chuyển khi nào | LOW | Đề xuất: nhấn "Tiếp" |

**Hợp đồng triển khai auth 27/10/2026:** API nhận `username` là tên hiển thị/họ tên theo DTO và schema hiện có, cùng `email`, `password`, `confirmPassword`; email được trim/chuyển chữ thường. Mật khẩu tối thiểu 6 ký tự, tối đa 72 byte UTF-8 với BCrypt. Client không được gửi vai trò; tài khoản mới luôn `LEARNER`, `ACTIVE`. Xem [TOEIC_Auth_Implementation.md](TOEIC_Auth_Implementation.md) cho route, validation, mã lỗi và kiểm thử.

---

## 4. ĐẶC TẢ CHI TIẾT USE CASE MVP

### UC-01: Đăng ký tài khoản

| Mục | Nội dung |
|---|---|
| Actor | Khách |
| Goal | Có tài khoản để lưu kết quả và tiến độ |
| Preconditions | Chưa đăng nhập |
| Trigger | Nhấn "Đăng ký" |
| Priority | MUST |

**Main Flow**
1. Khách mở trang đăng ký; hệ thống hiển thị form (họ tên, email, mật khẩu, xác nhận mật khẩu).
2. Khách nhập và nhấn "Đăng ký".
3. Hệ thống kiểm tra hợp lệ, kiểm tra email chưa tồn tại.
4. Hệ thống băm mật khẩu, tạo tài khoản vai trò Người học.
5. Hệ thống thông báo thành công và chuyển sang trang đăng nhập.

**Alternative Flow:** A1: Khách nhấn "Đã có tài khoản" → UC-02.
**Exception Flow:** E1 thiếu trường hoặc sai định dạng email; E2 email đã tồn tại (giữ dữ liệu đã nhập trừ mật khẩu); E3 mật khẩu xác nhận không khớp hoặc quá ngắn; E4 lỗi hệ thống, không tạo tài khoản.
**Postconditions:** Có tài khoản Người học, mật khẩu lưu dạng băm. **Business Rules:** BR-01, BR-02.

---

### UC-02: Đăng nhập

| Mục | Nội dung |
|---|---|
| Actor | Người học, Admin |
| Preconditions | Tài khoản đã tồn tại, chưa đăng nhập |
| Trigger | Nhấn "Đăng nhập" |
| Priority | MUST |

**Main Flow**
1. Người dùng nhập email và mật khẩu, nhấn "Đăng nhập".
2. Hệ thống kiểm tra đầu vào, tìm tài khoản, so khớp mật khẩu (bản băm).
3. Hệ thống kiểm tra tài khoản không bị khóa.
4. Hệ thống cấp **access token JWT** ngắn hạn mang vai trò và **refresh token** để cấp lại access token khi access token hết hạn. Refresh token chỉ lưu dưới dạng hash ở phía máy chủ.
5. Hệ thống chuyển đến trang theo vai trò: Người học vào trang học, Admin vào trang quản trị.

**Alternative Flow:** A1 "Quên mật khẩu" → chờ quyết định ISSUE-033 (đã có hạ tầng `PasswordResetOtps`; mặc định V2 cho đến khi chốt). A2 đã đăng nhập mà mở lại trang đăng nhập → chuyển thẳng đến trang chính.
**Exception Flow:** E1 sai email hoặc mật khẩu: thông báo chung "Email hoặc mật khẩu không đúng"; E2 tài khoản bị khóa; E3 thiếu trường; E4 tài khoản chờ xóa 30 ngày: xử lý ở V2.
**Postconditions:** Có access token hợp lệ gắn vai trò và refresh token còn hạn để tái xác thực. **Business Rules:** BR-03, BR-04.
**Triển khai backend 27/10/2026 (ADR-001):** access token mặc định 15 phút, refresh token 7 ngày; kiểm tra chữ ký/issuer/audience/hạn/thuật toán và `Users.Status`/vai trò hiện tại trên mỗi request được bảo vệ. Refresh xoay vòng nguyên transaction, từ chối dùng lại và thu hồi các refresh token còn hạn của user. Cấu hình có thể điều chỉnh theo môi trường; tích hợp lưu token phía frontend và bài thi dài còn thuộc P08/P10.

**Lưu ý:** vì dùng JWT, khóa tài khoản có hiệu lực ngay khi API kiểm tra `Users.Status` ở mỗi yêu cầu hoặc dùng token ngắn hạn (quyết định ở Phase kiến trúc).

---

### UC-03: Đăng xuất

| Mục | Nội dung |
|---|---|
| Actor | Người học, Admin |
| Preconditions | Đã đăng nhập |
| Priority | MUST |

**Main Flow:** (1) Người dùng nhấn "Đăng xuất"; (2) client gọi API logout; (3) hệ thống thu hồi refresh token hiện tại; (4) client xóa access token và refresh token; (5) hệ thống chuyển về trang chủ hoặc đăng nhập.
**Alternative Flow:** A1 access token hết hạn: client dùng refresh token còn hạn để lấy access token mới; nếu refresh token hết hạn hoặc bị thu hồi thì coi như đã đăng xuất và chuyển về trang đăng nhập.
**Exception Flow:** E1 đang làm Luyện thi: cảnh báo "đăng xuất sẽ bỏ dở bài thi"; xác nhận thì bài ghi "Bỏ dở" (ASM-02), từ chối thì quay lại bài. E2 đang Luyện tập hoặc học theo ngân hàng: cảnh báo; xác nhận thì giữ đáp án đã trả lời, bài ghi "Bỏ dở".
**Postconditions:** Access token không còn được client sử dụng và refresh token hiện tại không còn hiệu lực. **Related:** UC-02.

---

### UC-04: Làm bài Luyện thi

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Goal | Làm bài theo quy chế thi để đánh giá năng lực |
| Description | Trong phạm vi một đề: Full Test (120 phút, 200 câu), Thi Listening (45 phút, 100 câu), Thi Reading (75 phút, 100 câu), hoặc Thi theo Part (chọn nhiều Part) |
| Preconditions | Đã đăng nhập; đề đã xuất bản |
| Trigger | Chọn bộ đề, chọn một đề, tab "Luyện thi", nhấn "Bắt đầu" |
| Priority | MUST |

**Main Flow**
1. Người học chọn bộ đề, rồi chọn một đề trong bộ; hệ thống hiển thị hộp "Chọn chế độ" với tab Luyện thi. Bộ đề chỉ hiện khi có ít nhất một đề đã xuất bản (BR-34).
2. Hệ thống hiển thị bốn lựa chọn kèm số câu và thời gian: Full Test, Thi Listening, Thi Reading, Thi theo Part.
3. Người học chọn một lựa chọn. Với Thi theo Part: chọn các Part (nhiều Part), hệ thống hiển thị tổng số câu và **thời gian đề xuất** (số câu nghe × 27 giây + số câu đọc × 45 giây, làm tròn); người học có thể bật "Tự đặt" để nhập thời gian khác.
4. Người học nhấn "Bắt đầu"; hệ thống hiển thị **quy chế thi** (theo thứ tự, không quay lại, không xem lại chi tiết sau khi nộp, audio phát một lần) và yêu cầu xác nhận.
5. Hệ thống tạo lần làm bài (`EXAM`) và tạo sẵn dòng đáp án cho mọi câu thuộc phạm vi.
6. Trước mỗi phần thi và mỗi Part, hệ thống thực hiện **UC-09** (hướng dẫn); thời gian xem hướng dẫn không tính vào đồng hồ.
7. **Phần Listening:** hệ thống phát audio của từng nhóm đúng một lần và hiển thị câu hỏi tương ứng; người học chọn đáp án (đổi được khi audio còn chạy); khi audio kết thúc hệ thống **tự chuyển** sang nhóm kế tiếp.
8. **Phần Reading:** đồng hồ **75 phút chạy chung cho Part 5, 6, 7** (ASM-08). Người học làm theo thứ tự; chọn đáp án thì hệ thống tự chuyển câu, hoặc người học nhấn "Tiếp"; với nhóm nhiều câu, nhấn "Tiếp" sau khi trả lời (ASM-09). Không quay lại câu đã qua.
9. Hết câu cuối cùng hoặc hết thời gian, hệ thống **tự nộp**; thực hiện **UC-10**; lưu lần làm bài vào lịch sử.
10. Hệ thống chuyển đến UC-11 (chỉ tổng kết).

**Alternative Flow**
- A1: Nhấn "Tiếp" khi chưa chọn đáp án: cảnh báo một lần, câu đó tính chưa trả lời.
- A2: Hết thời gian: tự nộp với các đáp án hiện có.
- A3: Thi theo Part chỉ gồm các Part Listening hoặc Reading: hướng dẫn và đồng hồ áp dụng theo các Part đã chọn; phần nghe vẫn chuyển theo audio.
- A4: Thi Listening hoặc Thi Reading đủ 100 câu: có điểm quy đổi cho kỹ năng đó.

**Exception Flow**
- E1: Mất kết nối: đồng hồ máy chủ **không dừng**; đáp án đã chọn được giữ; kết nối lại thì tiếp tục tại vị trí hiện tại theo đồng hồ.
- E2: Thoát, đóng tab hoặc đăng xuất: lần làm bài ghi "Bỏ dở", không có điểm (ASM-02).
- E3: Audio không tải được: báo lỗi, cho thử tải lại; nếu thất bại, ghi nhận lỗi và hủy lần thi, không tính điểm.
- E4: Lỗi khi tự nộp: thử gửi lại; thất bại thì ghi trạng thái "Lỗi" để Admin kiểm tra.

**Postconditions:** Lần làm bài "Đã nộp" có kết quả; hoặc "Bỏ dở". Không ghi tiến độ theo câu (DEC-007).
**Business Rules:** BR-05, BR-07, BR-09, BR-10, BR-12, BR-19, BR-26 (không ghi tiến độ), BR-27, BR-28.
**Related UC:** UC-09, UC-10, UC-11.

---

### UC-05: Làm bài Luyện tập theo Part

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Goal | Luyện từng Part và học ngay từ đáp án, giải thích |
| Preconditions | Đã đăng nhập; đề đã xuất bản |
| Trigger | Chọn bộ đề, chọn một đề, tab "Luyện tập", chọn Part, nhấn "Bắt đầu" |
| Priority | MUST |

**Main Flow**
1. Người học chọn bộ đề, rồi chọn một đề trong bộ; hệ thống hiển thị tab Luyện tập với ghi chú "Xem đáp án và giải thích ngay sau mỗi câu/nhóm câu hỏi".
2. Người học chọn một hoặc nhiều Part, hoặc "Chọn tất cả 7 Part" (200 câu); nhấn "Bắt đầu".
3. Hệ thống tạo lần làm bài (`PRACTICE`, `PART`) và các dòng đáp án cho mọi câu thuộc phạm vi.
4. Hệ thống hiển thị từng câu hoặc nhóm câu (audio, hình, đoạn văn tùy Part); Listening cho phát, tạm dừng, nghe lại không giới hạn (ASM-12).
5. Người học chọn đáp án.
6. Hệ thống **chấm ngay**, hiển thị đáp án đúng, giải thích, và với Listening là transcript và bản dịch; hiển thị danh sách từ vựng của câu.
7. Hệ thống ghi **tiến độ theo câu** (đúng hoặc sai lần gần nhất).
8. Người học sang câu hoặc nhóm tiếp theo; lặp lại bước 4 đến 7.
9. Hết các câu, hệ thống kết thúc lần làm bài và thực hiện **UC-10**; chuyển đến UC-11.

**Alternative Flow**
- A1: Lưu từ mới trong lúc làm: **extend** UC-16.
- A2: Gặp lỗi nội dung: **extend** UC-14.
- A3: Xem hướng dẫn của Part (tùy chọn, ASM-11): thực hiện UC-09 ở chế độ xem.
- A4: Thoát giữa chừng: lần làm bài "Bỏ dở"; các đáp án đã trả lời và tiến độ vẫn giữ (ASM-02).
- A5: Nếu bài phủ đủ 100 câu của một kỹ năng hoặc đủ 200 câu (ví dụ chọn cả 7 Part), UC-10 cũng quy đổi điểm (BR-07).

**Exception Flow:** E1 audio không tải được: thông báo, cho tải lại; E2 lỗi lưu đáp án: báo lỗi, giữ đáp án trên màn hình để gửi lại.
**Postconditions:** Lần làm bài "Đã nộp" hoặc "Bỏ dở"; tiến độ theo câu được cập nhật.
**Business Rules:** BR-05, BR-07, BR-11, BR-12, BR-19, BR-26. **Related:** UC-10, UC-11, UC-14, UC-16.

---

### UC-06: Học theo ngân hàng câu hỏi (Level, chủ điểm)

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Goal | Học xuyên mọi đề theo mức độ khó hoặc chủ điểm |
| Preconditions | Đã đăng nhập; có câu hỏi thuộc phạm vi chọn |
| Trigger | Mở mục "Đọc", chọn Part, chọn một thẻ, nhấn "Học ngay" |
| Priority | MUST (phiên bản đầu: Part 5, ASM-13) |

**Main Flow**
1. Người học mở mục "Đọc" và chọn Part (phiên bản đầu: Part 5).
2. Hệ thống hiển thị **4 thẻ Level** (Level 1 – Dưới 200, 2 – 200–300, 3 – 300–400, 4 – 400–495) và **4 thẻ chủ điểm** (Từ vựng, Từ loại, Động từ, Ngữ pháp khác, mỗi thẻ liệt kê các loại con). Mỗi thẻ hiện tổng số câu của toàn ngân hàng và trạng thái, ví dụ "Chưa luyện tập · 724 câu", tính từ tiến độ của người học.
3. Người học chọn một thẻ và nhấn "Học ngay".
4. Hệ thống tạo lần làm bài (`PRACTICE`, `BANK`, không thuộc đề nào) gồm các câu **chưa luyện** của thẻ, tối đa 20 câu mỗi lượt (ASM-10); với Part 6, 7 chọn theo **nhóm câu** (BR-19).
5. Từ đây diễn ra như UC-05 (bước 4 đến 9): trả lời, xem đáp án và giải thích ngay, ghi tiến độ.
6. Hết lượt, hệ thống thực hiện UC-10 và chuyển đến UC-11.

**Alternative Flow**
- A1: Thẻ hết câu chưa luyện: hệ thống gợi ý ôn câu sai hoặc làm lại (UC-07).
- A2: Thẻ PRO (Level 3, 4 và một số chủ điểm): khóa, hiện nút "Nâng cấp"; chức năng thuộc Future (DEC-012), MVP mở hết.
- A3: Lưu từ (UC-16), báo lỗi (UC-14) như UC-05.

**Exception Flow:** E1 thẻ không có câu nào: thông báo "Đang cập nhật"; E2 lỗi lưu đáp án: như UC-05.
**Postconditions:** Lần làm bài `BANK`; tiến độ theo câu cập nhật.
**Business Rules:** BR-05, BR-11, BR-19, BR-26. **Related:** UC-07, UC-08, UC-10.

---

### UC-07: Ôn luyện câu sai và làm lại

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Goal | Giảm số câu sai; luyện lại thẻ đã học |
| Preconditions | Đã đăng nhập; thẻ có tiến độ |
| Trigger | Nhấn biểu tượng "làm lại" trên một thẻ |
| Priority | MUST |

**Main Flow**
1. Người học nhấn biểu tượng "làm lại" trên thẻ.
2. Hệ thống hiển thị hai lựa chọn: **Ôn các câu sai** (câu có lần trả lời gần nhất sai) và **Làm lại toàn bộ thẻ**.
3. Người học chọn một lựa chọn.
4. Hệ thống tạo lần làm bài `BANK` với các câu tương ứng; diễn ra như UC-06 từ bước 5.
5. Khi người học trả lời **đúng** một câu từng sai, trạng thái của câu chuyển thành đúng; số câu sai của thẻ giảm (DEC-006).

**Alternative Flow:** A1: Thẻ chưa có câu sai: hệ thống thông báo và gợi ý "Làm lại toàn bộ thẻ".
**Exception Flow:** E1 lỗi hệ thống khi tạo lượt: báo lỗi, giữ nguyên tiến độ.
**Postconditions:** Lần làm bài `BANK` mới; tiến độ cập nhật. **Business Rules:** BR-26. **Related:** UC-06.

---

### UC-08: Xóa tiến độ của một thẻ

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Goal | Bắt đầu lại thẻ như chưa học |
| Preconditions | Đã đăng nhập |
| Trigger | Nhấn biểu tượng "xóa" trên một thẻ |
| Priority | SHOULD |

**Main Flow**
1. Người học nhấn biểu tượng "xóa" trên thẻ.
2. Hệ thống yêu cầu xác nhận ("xóa toàn bộ tiến độ của thẻ này").
3. Người học xác nhận.
4. Hệ thống xóa tiến độ theo câu của người học cho các câu thuộc thẻ; **lịch sử các lần làm bài vẫn giữ**.
5. Hệ thống cập nhật thẻ về "Chưa luyện tập".

**Alternative Flow:** A1: Người học hủy: không thay đổi.
**Exception Flow:** E1 lỗi hệ thống: báo lỗi, giữ nguyên tiến độ.
**Postconditions:** Tiến độ của thẻ bị đặt lại. **Business Rules:** BR-26.

---

### UC-09: Xem hướng dẫn trước phần thi và Part

| Mục | Nội dung |
|---|---|
| Actor | Người học (hệ thống thực hiện) |
| Goal | Nắm cách làm bài trước khi vào từng phần |
| Preconditions | Đang trong UC-04 (hoặc xem tùy chọn ở UC-05) |
| Trigger | Sắp vào phần Listening, phần Reading hoặc một Part |
| Priority | MUST |

**Main Flow**
1. Hệ thống lấy **hướng dẫn hiệu lực** của đề cho mục sắp vào: bản riêng của đề nếu có, không thì bản mặc định.
2. Hệ thống hiển thị tiêu đề (ví dụ "LISTENING TEST", "PART 1"), nội dung hướng dẫn, hình ví dụ và ô giải thích câu ví dụ nếu có.
3. Nếu có audio hướng dẫn, hệ thống tự phát ("Playing directions...").
4. Người học đọc, nghe hết hoặc nhấn "Bỏ qua phần này" (ASM-07).
5. Hệ thống cộng thời gian đã xem vào `DirectionSeconds` của lần làm bài; **không tính vào đồng hồ thi** (DEC-004).
6. Hệ thống chuyển sang nội dung kế tiếp.

**Alternative Flow:** A1: Mục không có audio (Reading, Part 5 đến 7): hiển thị văn bản, người học nhấn "Bắt đầu" để tiếp tục. A2: Người học bật xem bản dịch tiếng Việt của hướng dẫn.
**Exception Flow:** E1 audio hướng dẫn không tải được: hiển thị văn bản, cho tiếp tục; E2 thiếu hướng dẫn: bỏ qua bước này (đề đã xuất bản phải đủ 9 mục, nên hiếm xảy ra).
**Postconditions:** `DirectionSeconds` được cập nhật. **Business Rules:** BR-25, BR-27.

---

### UC-10: Chấm điểm và quy đổi điểm

| Mục | Nội dung |
|---|---|
| Actor | Hệ thống (được include bởi UC-04, 05, 06) |
| Goal | Xác định đúng sai và điểm tổng hợp |
| Preconditions | Lần làm bài đã kết thúc |
| Priority | MUST |

**Main Flow**
1. Hệ thống lấy các đáp án của lần làm bài; câu chưa trả lời tính sai.
2. Hệ thống chốt đúng sai từng câu (Luyện tập và học theo ngân hàng đã chấm từng câu ngay khi trả lời; Luyện thi chấm ở bước này).
3. Hệ thống đếm số câu đúng theo Part và theo kỹ năng.
4. Hệ thống kiểm tra bài làm có **phủ đủ 100 câu của Listening hoặc Reading** (hoặc đủ 200 câu) hay không (BR-07).
5. Nếu đủ điều kiện, hệ thống tra bảng quy đổi để ra điểm Listening, Reading và tổng.
6. Hệ thống tính thời gian làm bài thực = (giờ nộp − giờ bắt đầu) − thời gian xem hướng dẫn.
7. Hệ thống lưu kết quả và cập nhật ngày học (`StudyDay`).

**Alternative Flow:** A1: Luyện lẻ Part hoặc học theo ngân hàng: chỉ lưu số câu đúng, không quy đổi (BR-05).
**Exception Flow:** E1 thiếu đáp án đúng của một câu (lỗi dữ liệu): dừng chấm, báo lỗi, ghi log (chặn từ phía Admin bằng BR-08); E2 không tra được bảng quy đổi: báo lỗi cấu hình.
**Postconditions:** Lần làm bài có số câu đúng và điểm (nếu đủ điều kiện). **Business Rules:** BR-05, BR-07, BR-08.

---

### UC-11: Xem kết quả

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Preconditions | Lần làm bài thuộc người học và đã kết thúc |
| Trigger | Sau khi nộp, hoặc mở một lần làm bài từ lịch sử |
| Priority | MUST |

**Main Flow**
1. Hệ thống hiển thị tổng quan: loại bài (Full Test, Thi Listening, Thi Reading, Thi theo Part, Luyện tập, Học theo ngân hàng), đề, ngày giờ, thời gian làm, số câu đúng trên tổng số.
2. Nếu đủ điều kiện quy đổi: hiển thị điểm Listening, Reading, tổng.
3. Hệ thống hiển thị thống kê số câu đúng theo từng Part.
4. Hiển thị bảng đáp án (số câu, đáp án đúng, lựa chọn của người học khi sai, bỏ trống) và nút "Xem đáp án & giải thích chi tiết" → UC-12. Từ 17/11/2026 áp dụng cả Luyện thi (BR-09 sửa).

**Alternative Flow:** A1 (cũ, chỉ khi đặt `Learning:AllowExamReview = false`): Luyện thi chỉ bước 1 đến 3, **không** có danh sách chi tiết (DEC-002, BR-09).
**Exception Flow:** E1 lần làm bài "Bỏ dở": hiển thị trạng thái, không có điểm; E2 truy cập bài của người khác: từ chối.
**Postconditions:** Không thay đổi dữ liệu. **Business Rules:** BR-05, BR-07, BR-09. **Related:** UC-10, UC-12, UC-13.

---

### UC-12: Xem lại bài đã làm

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Preconditions | Lần làm bài đã nộp, thuộc người học, **không** phải Luyện thi |
| Trigger | Nhấn "Xem lại chi tiết" ở UC-11 |
| Priority | MUST |

**Main Flow**
1. Hệ thống hiển thị câu đầu tiên ở chế độ xem lại.
2. Hệ thống hiển thị: nội dung câu (kèm audio, hình, đoạn văn), các đáp án, đáp án đã chọn, đáp án đúng, giải thích; với Listening có transcript và bản dịch; danh sách từ vựng của câu.
3. Người học điều hướng giữa các câu; lọc câu sai, đúng, chưa làm.

**Alternative Flow:** A1 lưu từ: **extend** UC-16; A2 báo lỗi: **extend** UC-14.
**Exception Flow:** E1 lần làm bài thuộc Luyện thi: chặn và thông báo "Bài thi không cho xem lại chi tiết"; E2 câu hỏi đã bị ẩn (xóa mềm): vẫn hiển thị dữ liệu.
**Postconditions:** Không thay đổi dữ liệu. **Business Rules:** BR-08, BR-09, BR-11, BR-17.

---

### UC-13: Xem lịch sử làm bài

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Preconditions | Đã đăng nhập |
| Priority | MUST |

**Main Flow:** (1) Hệ thống liệt kê các lần làm bài của người học, mới nhất trước: loại bài, đề, ngày giờ, kết quả (số câu đúng hoặc điểm), trạng thái; (2) người học chọn một lần; (3) hệ thống chuyển đến UC-11.
**Alternative Flow:** A1 lọc theo loại bài; A2 người học "xóa" một lần khỏi lịch sử: lần đó bị ẩn (xóa mềm), không ảnh hưởng tiến độ theo câu.
**Exception Flow:** E1 chưa có lịch sử: thông báo "Bạn chưa làm bài nào".
**Postconditions:** Không đổi dữ liệu (trừ A2). **Business Rules:** BR-12, BR-17.

---

### UC-14: Báo cáo lỗi nội dung

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Preconditions | Đã đăng nhập; không đang trong Luyện thi (ASM-06) |
| Trigger | Nhấn "Báo cáo" tại câu hỏi, từ vựng hoặc bài ngữ pháp |
| Priority | MUST |

**Main Flow**
1. Người học nhấn "Báo cáo"; hệ thống hiển thị form: loại lỗi (sai đáp án, sai giải thích, lỗi audio hoặc hình, lỗi chính tả, khác) và mô tả.
2. Người học nhập và gửi.
3. Hệ thống tạo báo cáo gắn với đối tượng và người báo, trạng thái "Mới".
4. Hệ thống thông báo đã gửi.

**Alternative Flow:** A1 hủy.
**Exception Flow:** E1 chọn "khác" mà không có mô tả: yêu cầu nhập; E2 đã có báo cáo chưa xử lý của cùng người cho cùng nội dung: thông báo, không tạo trùng; E3 lỗi hệ thống.
**Postconditions:** Có báo cáo "Mới". **Business Rules:** BR-15. **Related:** UC-26.

---

### UC-15: Học nhóm từ vựng có sẵn

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Preconditions | Đã đăng nhập; có nhóm từ đã xuất bản |
| Priority | MUST |

**Main Flow**
1. Hệ thống liệt kê các nhóm từ vựng đã xuất bản; người học lọc theo chủ đề (khi đã có) và mức CEFR.
2. Người học mở một nhóm.
3. Hệ thống hiển thị từng từ: từ, loại từ, phiên âm Mỹ và Anh, mức CEFR, nghĩa, ví dụ, cụm từ, đồng nghĩa, trái nghĩa, họ từ.
4. Người học duyệt từng từ.

**Alternative Flow:** A1 lưu từ: **extend** UC-16; A2 báo lỗi từ vựng: UC-14.
**Exception Flow:** E1 không có nhóm khớp bộ lọc: thông báo; E2 nhóm chưa có từ.
**Postconditions:** Không đổi dữ liệu. **Business Rules:** BR-13, BR-24.

---

### UC-16: Lưu từ vựng vào bộ cá nhân

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Preconditions | Đã đăng nhập; không đang trong Luyện thi (ASM-06) |
| Trigger | Nhấn "Lưu từ" khi luyện tập, học theo ngân hàng, xem lại bài, hoặc học nhóm từ |
| Priority | MUST |

**Main Flow**
1. Người học nhấn "Lưu từ" ở một từ trong danh sách từ vựng của câu hoặc nhóm từ; hoặc chọn một từ trong nội dung.
2. Nếu từ có trong từ điển hệ thống, hệ thống **liên kết** từ đó (nghĩa, phiên âm tự có sẵn). Nếu không, hệ thống yêu cầu người học nhập nghĩa (ASM-03).
3. Hệ thống thêm vào bộ cá nhân, ghi nguồn (câu hỏi hoặc nhóm từ).
4. Hệ thống thông báo đã lưu.

**Alternative Flow:** A1 từ đã có trong bộ: thông báo, không lưu trùng.
**Exception Flow:** E1 từ ngoài từ điển mà không nhập nghĩa: yêu cầu nhập; E2 lỗi hệ thống.
**Postconditions:** Từ nằm trong bộ cá nhân. **Business Rules:** BR-14. **Related:** UC-17.

---

### UC-17: Xem và quản lý bộ từ vựng cá nhân *(đề xuất MUST, chờ ISSUE-011)*

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Preconditions | Đã đăng nhập |
| Priority | MUST (đề xuất) |

**Main Flow:** (1) Hệ thống liệt kê các từ đã lưu, mới nhất trước: từ, loại từ, phiên âm, nghĩa, nguồn; (2) người học tìm kiếm, lọc theo CEFR; (3) người học xem chi tiết một từ (ví dụ, cụm từ, đồng nghĩa nếu là từ của hệ thống).
**Alternative Flow:** A1 gỡ một từ khỏi bộ (xóa thật, ASM-14); A2 học lại từ đã lưu (flashcard): V2 (FR-L19).
**Exception Flow:** E1 bộ từ trống: thông báo và gợi ý học nhóm từ vựng.
**Postconditions:** Bộ từ cá nhân cập nhật (A1). **Business Rules:** BR-14, BR-24.

---

### UC-18: Đọc bài ngữ pháp

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Preconditions | Đã đăng nhập |
| Priority | MUST |

**Main Flow:** (1) Hệ thống hiển thị 15 chủ điểm ngữ pháp, chia theo nhóm Từ loại, Động từ, Ngữ pháp khác; (2) người học chọn một chủ điểm; (3) hệ thống hiển thị các bài viết của chủ điểm (ISSUE-012) và nội dung bài (gồm ví dụ minh họa).
**Alternative Flow:** A1 báo lỗi nội dung: UC-14.
**Exception Flow:** E1 chủ điểm chưa có bài: thông báo "Đang cập nhật".
**Postconditions:** Không đổi dữ liệu. **Business Rules:** BR-06.

---

### UC-19: Quản lý đề thi

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Preconditions | Admin đã đăng nhập |
| Priority | MUST |

**Main Flow (tạo đề)**
1. Admin chọn bộ đề, rồi chọn "Thêm đề"; nhập mã đề tùy chọn (`ExamCode`, ví dụ `ETSTest1`, không trùng trong bộ), tên đề (không trùng trong bộ), mô tả. Bỏ trống mã thì server tự sinh; khi sửa mà bỏ trống mã thì giữ mã hiện hành (người dùng chốt 30/10/2026).
2. Hệ thống tạo đề ở trạng thái **Nháp**; tên đề không trùng đề chưa xóa.
3. Admin nhập nội dung đề: bằng UC-20 (từng nhóm, câu) hoặc UC-21 (từ Excel); thiết lập hướng dẫn riêng nếu cần (UC-22).
4. Admin nhấn "Xuất bản"; hệ thống chạy kiểm tra xuất bản (thủ tục `sp_PublishExam`).
5. Đạt: đề chuyển sang **Đã xuất bản** và hiển thị cho người học.

**Alternative Flow**
- A1: Xem danh sách, tìm kiếm, lọc theo trạng thái.
- A2: Sửa tên/mô tả đề. Đề đã có lượt làm (kể cả câu được dùng trong BANK) khóa nội dung/cấu trúc/đáp án/media/hướng dẫn đã dùng; chỉnh sửa lớn tạo đề mới. Mã/bộ không đổi sau lịch sử (người dùng chốt 30/10/2026).
- A3: Chuyển đề về Nháp để chỉnh sửa lớn.
- A4: **Xóa mềm** đề (không bao giờ xóa thật); khôi phục đề đã xóa mềm.

**Exception Flow**
- E1: Trùng tên đề hoặc mã đề trong cùng bộ: báo lỗi.
- E2: Kiểm tra xuất bản không đạt: hệ thống từ chối và **liệt kê từng vấn đề** (thiếu số câu của Part, thiếu giải thích hoặc độ khó, không có đúng một đáp án đúng, sai số đáp án, nhóm thiếu audio, đoạn văn, độ khó nhóm, nhóm gắn vào nhóm cha thay vì loại cụ thể, nhóm rỗng, thiếu hướng dẫn, thiếu `OptionExplanations` hoặc `TranscriptEn` của Part 1 đến 4).
**Postconditions:** Kho đề được cập nhật. **Business Rules:** BR-08, BR-17, BR-20, BR-25, BR-29, BR-33. **Related:** UC-20, UC-21, UC-22, UC-29.

---

### UC-20: Quản lý nhóm câu hỏi, câu hỏi và đáp án

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Preconditions | Admin đã đăng nhập; đã có đề |
| Priority | MUST |

**Main Flow (thêm nhóm và câu hỏi)**
1. Admin chọn đề và Part, chọn "Thêm nhóm".
2. Hệ thống hiển thị form theo Part:

| Part | Dữ liệu nhóm | Câu hỏi và đáp án |
|---|---|---|
| 1 | Audio, hình, transcript (4 đáp án được đọc), bản dịch | 1 câu, 4 đáp án |
| 2 | Audio, transcript (câu hỏi và 3 đáp án được đọc), bản dịch | 1 câu (nội dung câu nghe), **3 đáp án** |
| 3, 4 | Audio, transcript, bản dịch, độ khó nhóm, cờ đặc biệt (hình hoặc bảng, ba người nói, câu hỏi hàm ý) | 3 câu, 4 đáp án |
| 5 | Bản dịch câu (cấp nhóm) | 1 câu, 4 đáp án |
| 6 | Đoạn văn, bản dịch, độ khó nhóm | 4 câu, 4 đáp án |
| 7 | Đoạn văn (nhiều đoạn gộp), bản dịch, độ khó nhóm | 2 đến 5 câu, 4 đáp án |

3. Admin chọn **loại** của nhóm (nút lá của cây phân loại theo Part), nhập các dữ liệu trên.
4. Với mỗi câu: số câu, độ khó (Level 1 đến 4), nội dung, đáp án, đánh dấu đáp án đúng, **giải thích** (`explanation`) và **giải thích từng phương án** (`option_explanations`): một ô nhiều dòng, mỗi phương án một dòng kèm nhãn Đúng/Sai.
5. Admin có thể nhập danh sách từ vựng của câu (từ, dạng xuất hiện, ví dụ).
6. Hệ thống kiểm tra hợp lệ và lưu.

**Alternative Flow:** A1 sửa, sắp xếp lại thứ tự nhóm; A2 **xóa mềm** nhóm hoặc câu; A3 sửa từ báo cáo (UC-26) rồi quay lại.
**Exception Flow:** E1 trùng số câu trong đề; E2 hơn một đáp án đúng; E3 Part 2 nhập đáp án D; E4 file audio hoặc hình sai định dạng hoặc quá dung lượng; E5 audio gắn vào nhóm không thuộc Listening; E6 độ khó nhóm hoặc đoạn văn không đúng Part. Các lỗi E1 đến E6 đều do database từ chối. E7 `option_explanations` sai định dạng hoặc nhãn Đúng không khớp đáp án đúng: báo lỗi theo dòng (kiểm tra ở tầng ứng dụng).
**Lưu ý:** Giải thích, độ khó, đủ số đáp án và đúng một đáp án đúng được phép thiếu khi đề ở trạng thái Nháp, nhưng bắt buộc khi xuất bản (UC-19).
**Postconditions:** Nhóm và câu hỏi được lưu. **Business Rules:** BR-06, BR-08, BR-17, BR-19, BR-21, BR-23, BR-31.

---

### UC-21: Nhập đề và dữ liệu từ Excel

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Preconditions | Admin đã đăng nhập; file đúng bố cục v1.1 (tài liệu database v1.3, mục 10.1) |
| Trigger | Chọn "Nhập từ Excel" |
| Priority | MUST |

**Main Flow**
1. Admin chọn bộ đề, rồi chọn đề (đã có, hoặc tạo đề mới trong bộ với mã đề `ExamCode`) và tải file Excel lên.
2. Hệ thống đọc từng dòng theo **mã nhóm (`group_code`)**, điền ở mọi dòng: các dòng cùng mã thuộc một nhóm; `GroupOrder` là số câu nhỏ nhất của nhóm.
3. Hệ thống kiểm tra: tiền tố mã nhóm khớp mã đề đang chọn (BR-29); phạm vi câu trong mã khớp đúng các câu liên tiếp của nhóm (BR-30); dữ liệu cấp nhóm chỉ ở dòng đầu; số câu mỗi nhóm hợp lý (Part 3, 4 có 3 câu; Part 6 có 4 câu; Part 7 có 2 đến 5 câu; Part 1, 2, 5 có 1 câu); loại, độ khó, cờ đặc biệt có trong danh mục; `option_explanations` đúng định dạng và nhãn Đúng khớp đáp án đúng; đáp án đúng trỏ vào đáp án có nội dung.
4. Hệ thống hiển thị **báo cáo kiểm tra** (số nhóm, số câu, cảnh báo, lỗi).
5. Admin xác nhận nhập; hệ thống nhập trong **một giao dịch**, đề ở trạng thái Nháp.
6. Nếu file có sheet từ vựng: hệ thống upsert theo (từ gốc, loại từ). Từ đã có thì dùng lại, **giữ nghĩa cũ** nếu nghĩa gốc khác (DEC-017); mỗi câu tạo một dòng `VocabularyContext` với nghĩa theo ngữ cảnh và ví dụ.

**Alternative Flow:** A1 chỉ nhập từ vựng; A2 nhập lại một đề Nháp: thay thế nội dung cũ.
**Exception Flow:** E1 có lỗi: **không lưu dòng nào**, trả danh sách lỗi theo số dòng; E2 dòng sau của nhóm vẫn có dữ liệu cấp nhóm: báo lỗi; E3 từ vựng đã có với nghĩa gốc khác: giữ nghĩa cũ, ghi nhận trong báo cáo nhập (không cần Admin xử lý, DEC-021). E4 tiền tố mã nhóm không khớp mã đề: từ chối cả file (BR-29).
**Postconditions:** Đề Nháp có nhóm, câu, đáp án (và từ vựng). **Business Rules:** BR-08, BR-19, BR-21, BR-24, BR-29, BR-30, BR-31. **Related:** UC-19, UC-20.

---

### UC-22: Quản lý hướng dẫn (mặc định và riêng từng đề)

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Preconditions | Admin đã đăng nhập |
| Priority | MUST |

**Main Flow**
1. Admin mở "Hướng dẫn"; hệ thống hiển thị 9 mục mặc định (Listening, Reading, Part 1 đến 7).
2. Admin sửa văn bản, bản dịch tiếng Việt, ví dụ của một mục; tải lên audio hướng dẫn và hình ví dụ (tối đa một audio và một hình mỗi mục).
3. Hệ thống lưu.

**Alternative Flow:** A1 tạo **bản riêng** cho một đề (ghi đè bản mặc định); A2 xóa bản riêng (xóa mềm) thì đề dùng lại bản mặc định; A3 nhập 9 mục từ file `toeic_directions.xlsx`.
**Exception Flow:** E1 trùng mục (đã có bản mặc định hoặc bản riêng của đề cho cùng mục); E2 file sai định dạng hoặc quá dung lượng; E3 file Excel lệch số câu hoặc số đáp án so với cấu hình Part: cảnh báo.
**Postconditions:** Hướng dẫn được cập nhật. **Business Rules:** BR-25. **Related:** UC-09.

---

### UC-23: Quản lý từ vựng và chủ đề từ vựng

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Priority | MUST |

**Main Flow (thêm từ)**
1. Admin chọn "Thêm từ"; nhập từ gốc, loại từ, phiên âm Mỹ và Anh, mức CEFR, nghĩa, định nghĩa tiếng Anh (nếu có); chọn chủ đề (khi đã có).
2. Admin nhập cụm từ, đồng nghĩa, trái nghĩa, họ từ; nhập ví dụ (nếu từ chưa gắn vào câu hỏi nào).
3. Hệ thống kiểm tra và lưu.

**Alternative Flow:** A1 tìm, lọc theo CEFR, chủ đề; A2 sửa; A3 **xóa mềm**; từ đã xóa thì **khôi phục** thay vì tạo lại; A4 thêm hoặc sửa **chủ đề từ vựng** ngay tại màn hình này (ISSUE-014).
**Exception Flow:** E1 trùng (từ gốc, loại từ): báo lỗi hoặc đề nghị khôi phục; E2 thiếu mức CEFR; E3 loại từ không có trong danh mục.
**Postconditions:** Từ điển được cập nhật. **Business Rules:** BR-13, BR-24.

---

### UC-24: Quản lý nhóm từ vựng

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Priority | MUST |

**Main Flow:** (1) Admin chọn "Thêm nhóm"; nhập tên, chủ đề, mô tả; (2) thêm từ vào nhóm từ từ điển (một từ có thể thuộc nhiều nhóm); (3) lưu; (4) nhấn "Xuất bản" để nhóm hiển thị cho người học.
**Alternative Flow:** A1 sửa, sắp xếp thứ tự từ; A2 gỡ từ khỏi nhóm (không xóa từ khỏi từ điển); A3 xóa mềm nhóm.
**Exception Flow:** E1 trùng tên nhóm; E2 xuất bản nhóm không có từ: cảnh báo.
**Postconditions:** Nhóm từ được cập nhật. **Business Rules:** BR-17.

---

### UC-25: Quản lý bài ngữ pháp

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Priority | MUST |

**Main Flow:** (1) Admin chọn một trong 15 chủ điểm (danh sách cố định); (2) nhập tiêu đề, nội dung có định dạng và ví dụ minh họa, thứ tự bài; (3) lưu; bài có hiệu lực ngay.
**Alternative Flow:** A1 sửa; A2 xóa mềm; A3 sửa từ báo cáo (UC-26).
**Exception Flow:** E1 thiếu tiêu đề hoặc nội dung; E2 chủ điểm không thuộc danh sách.
**Postconditions:** Bài ngữ pháp được cập nhật. **Related:** UC-18.

---

### UC-26: Xử lý báo cáo

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Priority | MUST |

**Main Flow**
1. Hệ thống liệt kê báo cáo, mặc định lọc trạng thái "Mới".
2. Admin mở một báo cáo; hệ thống hiển thị loại lỗi, mô tả, người báo, liên kết tới nội dung.
3. Admin xác định lỗi có thật; nếu có, mở màn hình sửa tương ứng (**include** UC-20, UC-23 hoặc UC-25) và lưu.
4. Admin cập nhật trạng thái "Đã xử lý" kèm ghi chú.

**Alternative Flow:** A1 "Từ chối" kèm ghi chú; A2 chuyển "Đang xử lý"; A3 đóng hàng loạt các báo cáo cùng nội dung sau khi sửa.
**Exception Flow:** E1 nội dung bị xóa mềm: đóng báo cáo kèm ghi chú; E2 lỗi hệ thống.
**Postconditions:** Báo cáo có trạng thái mới; nội dung được sửa nếu cần. **Business Rules:** BR-15. **Related:** UC-14.

---

### UC-29: Quản lý bộ đề

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Goal | Gom các đề theo nguồn hoặc theo kỳ, ví dụ bộ "ETS 2024" hoặc "Đề tự soạn" |
| Preconditions | Admin đã đăng nhập |
| Trigger | Chọn "Bộ đề" trong trang quản trị |
| Priority | MUST |

**Main Flow**
1. Admin xem danh sách bộ đề: tên, số đề, số đề đã xuất bản.
2. Admin chọn "Thêm bộ đề", nhập tên (không trùng bộ chưa xóa) và mô tả; hệ thống lưu.
3. Admin mở bộ để thêm đề bằng UC-19 hoặc nhập đề từ Excel bằng UC-21; mọi đề trong bộ đều thuộc bộ đó (BR-33).

**Alternative Flow:** A1 sửa tên, mô tả bộ; A2 xóa mềm bộ khi không còn đề chưa xóa (BR-34); A3 khôi phục bộ đã xóa mềm.
**Exception Flow:** E1 trùng tên bộ: báo lỗi; E2 xóa bộ còn đề chưa xóa: hệ thống từ chối và liệt kê các đề, yêu cầu xóa hoặc chuyển đề trước; E3 bộ chưa có đề đã xuất bản: bộ được lưu nhưng không hiển thị cho người học.
**Postconditions:** Bộ đề được cập nhật. **Business Rules:** BR-17, BR-33, BR-34. **Related:** UC-04, UC-05, UC-19, UC-21.

---

## 5. ĐẶC TẢ USE CASE VERSION 2

### UC-27: Luyện nghe theo clip

| Mục | Nội dung |
|---|---|
| Actor | Người học |
| Goal | Luyện nghe từng câu ngắn: chép chính tả, bổ sung từ thiếu, lặp lại theo (shadowing) |
| Preconditions | Đã đăng nhập; có bộ clip đã xuất bản |
| Priority | SHOULD (đầu Version 2) |

**Main Flow**
1. Người học chọn Part (1 đến 4); hệ thống liệt kê các bộ clip đã xuất bản, lọc theo Level và loại. Bộ clip của đề gốc lấy phân loại và độ khó từ nhóm câu hỏi; bộ clip sưu tầm riêng có phân loại và độ khó riêng.
2. Người học chọn một bộ clip và một **chế độ luyện**: (a) ẩn ngẫu nhiên một số từ của script, (b) ẩn toàn bộ script, (c) lật từ, (d) shadowing.
3. Hệ thống phát từng clip theo thứ tự. Với (a): người học điền các từ bị ẩn; với (b): người học gõ lại điều nghe được; hệ thống so với transcript và hiện kết quả; với (c): người học chạm vào từ bị ẩn để lật; với (d): người học nghe và đọc lặp lại, có thể nghe lại.
4. Người học xem transcript, bản dịch, từ vựng của clip.
5. Hết bộ clip, hệ thống ghi **tiến độ**: số lần luyện, chế độ gần nhất, độ chính xác lần gần nhất và tốt nhất; cập nhật ngày học.

**Alternative Flow:** A1 lưu từ (UC-16); A2 báo lỗi clip (UC-14, đối tượng là bộ clip); A3 nghe lại clip không giới hạn.
**Exception Flow:** E1 audio không tải được: thông báo, cho thử lại; E2 bộ clip bị ẩn trong lúc luyện: cho luyện xong lượt hiện tại.
**Postconditions:** Tiến độ nghe và ngày học được cập nhật. **Business Rules:** BR-22 (với bộ clip đề gốc), BR-17.

---

### UC-28: Quản lý clip nghe (TH1 và TH2)

| Mục | Nội dung |
|---|---|
| Actor | Admin |
| Priority | SHOULD (đầu Version 2) |

**Main Flow (TH1: clip cắt từ đề gốc)**
1. Admin chọn đề và tải file clip lên (cùng lúc tạo đề hoặc tải riêng).
2. Hệ thống đọc khóa nhập liệu của từng clip: mã nhóm (`group_code`) của nhóm đề gốc, `question_no` của câu đầu nhóm và số thứ tự clip. Không đọc khóa từ tên file; quy ước file clip chốt khi làm V2.
3. Hệ thống tìm nhóm của đề có đúng `group_code` và câu đầu nhóm trùng `question_no`.
4. Không tìm thấy hoặc tìm thấy nhiều hơn một: báo lỗi chi tiết, **không lưu dòng nào** (một giao dịch).
5. Tìm thấy: hệ thống tạo bộ clip gắn với nhóm, các clip và file audio; ghi từ vựng của clip.
6. Hệ thống cảnh báo (không chặn) nếu nối transcript các clip không khớp transcript của nhóm.

**Alternative Flow (TH2: clip sưu tầm riêng):** A1 Admin tải file, không chọn đề; hệ thống tạo bộ clip không thuộc đề nào; A2 Admin gán loại và độ khó cho bộ clip (bắt buộc trước khi xuất bản); A3 xóa mềm, xuất bản, ẩn bộ clip.
**Exception Flow:** E1 vai trò clip không hợp lệ theo Part (ví dụ Part 3 có clip đáp án); E2 hai bộ clip cho cùng một nhóm; E3 trùng mã nhập liệu.
**Postconditions:** Bộ clip được lưu. **Business Rules:** BR-17, BR-22.

---

## 6. PHÂN TÍCH NGHIỆP VỤ (PHASE 7)

Dữ liệu chỉ ghi tên bảng; thuộc tính đầy đủ ở tài liệu database v1.0.

### BA-01. Xác thực và tài khoản (UC-01, 02, 03)

| Hạng mục | Nội dung |
|---|---|
| Input | Họ tên, email, mật khẩu, xác nhận mật khẩu; email, mật khẩu |
| Processing | Kiểm tra định dạng; email duy nhất; băm mật khẩu; so khớp; kiểm tra khóa; cấp access token JWT ngắn hạn và refresh token; thu hồi refresh token khi đăng xuất; phân quyền theo vai trò |
| Output | Tài khoản; access token, refresh token và thời hạn tương ứng khi đăng nhập; chuyển trang theo vai trò; thông báo lỗi chung khi sai thông tin |
| Business Rules | BR-01 đến BR-04 |
| Validation | Email hợp lệ; mật khẩu đủ dài; xác nhận khớp |
| Exception | Email trùng; sai thông tin; tài khoản khóa; lỗi hệ thống |
| Data | `Users`, `RefreshTokens` |

### BA-02. Luyện thi (UC-04)

| Hạng mục | Nội dung |
|---|---|
| Input | Đề, lựa chọn (Full, Listening, Reading, Part), các Part chọn, thời gian tự đặt, đáp án theo thứ tự |
| Processing | Tính thời gian đề xuất (27 giây mỗi câu nghe, 45 giây mỗi câu đọc); tạo lần làm bài và dòng đáp án; hiển thị hướng dẫn; Listening phát audio đúng một lần và tự chuyển; Reading một đồng hồ 75 phút; đồng hồ tính theo máy chủ, không tính thời gian xem hướng dẫn; chặn quay lại; tự nộp; chấm điểm |
| Output | Kết quả tổng kết (không có chi tiết từng câu) |
| Business Rules | BR-05, 07, 09, 10, 12, 19, 25, 27, 28 |
| Validation | Đề đã xuất bản; đáp án thuộc câu đang hiển thị; từ chối đáp án cho câu đã qua; chỉ nhận đáp án khi đồng hồ còn chạy |
| Exception | Mất kết nối; bỏ dở; audio lỗi; lỗi khi tự nộp |
| Data | `Exam`, `QuestionGroup`, `Question`, `QuestionOption`, `Media`, `ExamDirection`, `PartSetting`, `Attempt`, `AttemptAnswer`, `ScoreConversion`, `StudyDay` |

### BA-03. Luyện tập và học theo ngân hàng (UC-05, 06, 07, 08)

| Hạng mục | Nội dung |
|---|---|
| Input | Đề và Part (Luyện tập); Part, thẻ Level hoặc chủ điểm (ngân hàng); đáp án từng câu |
| Processing | Tạo lần làm bài và dòng đáp án (`BANK` chọn câu chưa luyện của thẻ, nhóm câu giữ nguyên); chấm ngay từng câu; hiển thị đáp án, giải thích; ghi tiến độ (đúng sai lần gần nhất); đếm số câu chưa luyện cho từng thẻ; ôn câu sai; làm lại; xóa tiến độ (giữ lịch sử) |
| Output | Đáp án, giải thích ngay; số câu chưa luyện; kết quả cuối lượt |
| Business Rules | BR-05, 11, 12, 19, 26 |
| Validation | Câu thuộc phạm vi thẻ; lượt tối đa 20 câu; xác nhận trước khi xóa tiến độ |
| Exception | Thẻ hết câu; lỗi lưu đáp án; thoát giữa chừng |
| Data | `Attempt` (`PRACTICE`; `PART` hoặc `BANK`), `AttemptAnswer`, `UserQuestionProgress`, `QuestionGroup`, `Question`, `QuestionCategory`, `LevelBand` |

### BA-04. Hướng dẫn (UC-09, 22)

| Hạng mục | Nội dung |
|---|---|
| Input | Mục sắp vào (phần Listening, Reading hoặc Part 1 đến 7); nội dung hướng dẫn do Admin nhập |
| Processing | Lấy bản riêng của đề nếu có, không thì bản mặc định; phát audio; cộng thời gian xem vào `DirectionSeconds`; không tính vào đồng hồ |
| Output | Màn hình hướng dẫn (văn bản, audio, hình, ví dụ, bản dịch) |
| Business Rules | BR-25, BR-27 |
| Validation | Mỗi mục có tối đa một audio và một hình; mỗi đề đủ 9 mục hiệu lực khi xuất bản |
| Exception | Audio lỗi; thiếu hướng dẫn |
| Data | `ExamDirection`, `Media`, `Attempt` |

### BA-05. Chấm điểm và quy đổi (UC-10)

Cấu trúc đề chuẩn dùng để kiểm tra đủ điều kiện:

| Kỹ năng | Part | Số câu |
|---|---|---:|
| Listening | 1, 2, 3, 4 | 6, 25, 39, 30 (tổng 100) |
| Reading | 5, 6, 7 | 30, 16, 54 (tổng 100) |

| Hạng mục | Nội dung |
|---|---|
| Input | Đáp án đã chọn, đáp án đúng, phạm vi bài làm, bảng quy đổi (0 đến 100 câu đúng thành điểm 5 đến 495 cho mỗi kỹ năng) |
| Processing | So khớp; đếm theo Part và kỹ năng; kiểm tra phủ đủ 100 câu một kỹ năng hoặc đủ 200 câu; tra bảng; tổng điểm là tổng hai kỹ năng; thời gian làm thực |
| Output | Số câu đúng theo Part; điểm Listening, Reading, tổng (nếu đủ điều kiện) |
| Business Rules | BR-05, 07, 08 |
| Validation | Mỗi câu có đáp án đúng; tổng điểm bằng tổng hai kỹ năng |
| Exception | Thiếu đáp án đúng; không tra được bảng |
| Data | `AttemptAnswer`, `Attempt`, `ScoreConversion` (view `vw_AttemptPartResult`, `vw_AttemptSummary`) |

### BA-06. Kết quả, xem lại, lịch sử (UC-11, 12, 13)

| Hạng mục | Nội dung |
|---|---|
| Input | Người học, lần làm bài |
| Processing | Kiểm tra quyền sở hữu; kiểm tra chế độ; Luyện thi chỉ trả tổng kết; chế độ khác trả chi tiết từng câu; lọc; người học ẩn lần làm bài khỏi lịch sử |
| Output | Tổng quan, thống kê theo Part, chi tiết từng câu, danh sách lịch sử |
| Business Rules | BR-05, 07, 08, 09, 11, 12, 17 |
| Validation | Đúng chủ sở hữu; chặn xem lại bài Luyện thi |
| Exception | Bỏ dở; truy cập trái phép; nội dung đã ẩn |
| Data | `Attempt`, `AttemptAnswer`, `Question`, `QuestionOption`, `QuestionGroup`, `Media` |

### BA-07. Từ vựng (UC-15, 16, 17, 23, 24)

| Hạng mục | Nội dung |
|---|---|
| Input | Bộ lọc; từ muốn lưu; nghĩa người học nhập; dữ liệu từ vựng do Admin nhập hoặc nhập Excel |
| Processing | Một từ (từ gốc, loại từ) một dòng; nơi xuất hiện và ví dụ ghi riêng theo câu hoặc clip; liên kết từ với đề qua câu hỏi; lưu từ: liên kết từ điển hoặc từ tự thêm, kiểm tra trùng |
| Output | Nhóm từ, thông tin từ; bộ từ cá nhân |
| Business Rules | BR-13, 14, 17, 24 |
| Validation | CEFR hợp lệ; loại từ có trong danh mục; không lưu trùng |
| Exception | Trống bộ lọc; từ ngoài từ điển thiếu nghĩa; trùng từ điển |
| Data | `Vocabulary`, `VocabularyRelation`, `VocabularyContext`, `VocabularyGroup`, `VocabularyGroupItem`, `VocabTopic`, `PartOfSpeech`, `UserVocabulary` |

### BA-08. Ngữ pháp (UC-18, 25)

| Hạng mục | Nội dung |
|---|---|
| Input | Chủ điểm; nội dung bài do Admin soạn |
| Processing | Hiển thị 15 chủ điểm; hiển thị bài; lưu có hiệu lực ngay |
| Output | Bài viết ngữ pháp |
| Business Rules | BR-06, 17 |
| Data | `GrammarTopic`, `GrammarArticle`, `QuestionCategory` |

### BA-09. Báo cáo lỗi (UC-14, 26)

| Hạng mục | Nội dung |
|---|---|
| Input | Đối tượng (câu hỏi, từ vựng, bài ngữ pháp, bộ clip), loại lỗi, mô tả |
| Processing | Chống trùng báo cáo chưa xử lý; tạo báo cáo "Mới"; Admin lọc, sửa nội dung, đổi trạng thái |
| Output | Báo cáo có trạng thái; nội dung đã sửa |
| Business Rules | BR-15 |
| Validation | Mô tả bắt buộc khi chọn "khác"; đúng một đối tượng |
| Data | `Report` |

### BA-10. Quản trị đề và nội dung (UC-19, 20, 21, 22)

| Hạng mục | Nội dung |
|---|---|
| Input | Đề; nhóm; câu hỏi; đáp án; media; loại; độ khó; file Excel; hướng dẫn |
| Processing | Nhập theo form từng Part hoặc từ Excel (một giao dịch); kiểm tra toàn vẹn bằng database; kiểm tra xuất bản bằng `sp_PublishExam`; xóa mềm và khôi phục |
| Output | Đề ở trạng thái Nháp hoặc Đã xuất bản; báo cáo kiểm tra nhập và xuất bản |
| Business Rules | BR-06, 08, 17, 19, 20, 21, 23, 25 |
| Validation | Mỗi câu đúng một đáp án đúng; Part 2 có 3 đáp án, Part khác 4; loại là nút lá đúng Part; đủ số câu từng Part khi xuất bản |
| Exception | Dữ liệu thiếu; file sai; xuất bản thiếu; trùng |
| Data | `Exam`, `QuestionGroup`, `QuestionGroupTag`, `Media`, `Question`, `QuestionOption`, `ExamDirection`, `QuestionCategory`, `SpecialTag`, `LevelBand` |

### BA-11. Luyện nghe theo clip (UC-27, 28, Version 2)

| Hạng mục | Nội dung |
|---|---|
| Input | Bộ clip, chế độ luyện, nội dung người học gõ; file clip, đề (TH1) |
| Processing | Khớp bộ clip với nhóm đề gốc theo (Part, số câu đầu nhóm); ẩn từ ngẫu nhiên; so sánh với transcript; ghi tiến độ tóm tắt |
| Output | Kết quả từng lượt; tiến độ nghe; ngày học |
| Business Rules | BR-17, 22 |
| Validation | Vai trò clip hợp lệ theo Part; mỗi nhóm một bộ clip |
| Data | `ListeningItem`, `ListeningClip`, `Media`, `UserListeningProgress`, `StudyDay` |

---

## 7. BUSINESS RULES TỔNG HỢP

| ID | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Email là duy nhất | Đăng ký |
| BR-02 | Mật khẩu lưu dạng băm | Bảo mật |
| BR-03 | Tài khoản bị khóa không đăng nhập được | Khảo sát Nhóm 5 |
| BR-04 | Admin chỉ vào khu quản trị; Người học không vào được | Khảo sát Nhóm 1 |
| BR-05 | Luyện lẻ Part và học theo ngân hàng chỉ hiển thị số câu đúng, không quy đổi điểm | Khảo sát Nhóm 4 |
| BR-06 | Ngữ pháp chỉ ở Part 5; chủ điểm suy ra từ phân loại; Part 6 chỉ có loại văn bản | DEC-009 |
| BR-07 | Điểm quy đổi chỉ khi bài làm phủ đủ 100 câu Listening hoặc 100 câu Reading, hoặc đủ 200 câu | Khảo sát Nhóm 4, DEC-001 |
| BR-08 | Mỗi câu có đáp án đúng, giải thích (`Explanation`) và giải thích từng phương án (`OptionExplanations`) (bắt buộc khi xuất bản) | Khảo sát Nhóm 3; DEC-015 |
| BR-09 | Luyện thi: không lộ đúng/sai khi đang làm; **sau khi nộp** được xem kết quả từng câu và đáp án chi tiết (sửa 17/11/2026 theo yêu cầu người dùng; trước đây cấm xem lại, bật lại bằng `Learning:AllowExamReview = false`) | DEC-002 |
| BR-10 | Luyện thi: làm theo thứ tự, không quay lại; Listening tự chuyển khi hết audio; Reading một đồng hồ 75 phút cho Part 5, 6, 7, chọn đáp án thì tự chuyển câu hoặc người học chuyển thủ công; tính giờ theo máy chủ | DEC-002, DEC-003 |
| BR-11 | Luyện tập và học theo ngân hàng: xem đáp án và giải thích ngay; không có đồng hồ bắt buộc | DEC-001, DEC-008 |
| BR-12 | Mọi lần làm bài đã nộp được lưu vào lịch sử | Khảo sát Nhóm 4 |
| BR-13 | Từ vựng bắt buộc có mức CEFR; chủ đề bắt buộc sau khi chốt danh sách chủ đề | Khảo sát Nhóm 3 |
| BR-14 | Một từ chỉ xuất hiện một lần trong bộ từ cá nhân của mỗi người học | BA đề xuất |
| BR-15 | Báo cáo gắn với một nội dung cụ thể và có trạng thái; không tạo trùng báo cáo chưa xử lý của cùng người | Khảo sát Nhóm 5 |
| BR-16 | Admin không xóa được tài khoản người dùng, chỉ khóa | Khảo sát Nhóm 5 |
| BR-17 | Nội dung do Admin quản lý chỉ xóa mềm | DEC-010 |
| BR-18 | Chỉ người dùng đã đăng nhập mới lưu được kết quả (Khách làm bài: Version 2) | Quyết định Khách |
| BR-19 | Câu hỏi thuộc nhóm (Part 3, 4, 6, 7) dùng chung audio hoặc đoạn văn, không tách rời | Đặc thù đề TOEIC |
| BR-20 | Chỉ đề đã xuất bản mới hiển thị cho người học; đề phải đủ 7 Part (200 câu) | BA đề xuất |
| BR-21 | Phân loại, audio, đoạn văn, transcript, bản dịch thuộc về nhóm | Dữ liệu thật |
| BR-22 | Clip của đề gốc phải khớp một nhóm theo `group_code` và số câu đầu nhóm; không khớp thì từ chối cả lần nhập | Câu trả lời grill-me; DEC-014 |
| BR-23 | Đáp án chọn thuộc đúng câu; câu cùng đề với nhóm | Toàn vẹn dữ liệu |
| BR-24 | Một từ vựng (từ gốc, loại từ) chỉ tồn tại một lần, dùng chung cho mọi đề; khi đề mới có nghĩa gốc khác thì giữ nghĩa cũ | DEC-011, DEC-017 |
| BR-25 | Mỗi phần thi và mỗi Part có hướng dẫn: dùng bản riêng của đề nếu có, không thì bản mặc định | CR-005 |
| BR-26 | Tiến độ theo câu chỉ ghi ở Luyện tập và học theo ngân hàng (không tính Luyện thi); "câu sai" là lần trả lời gần nhất sai; "xóa tiến độ" giữ lịch sử làm bài | DEC-005, 006, 007 |
| BR-27 | Thời gian xem hướng dẫn không tính vào đồng hồ thi | DEC-004 |
| BR-28 | Khi thi, audio Part 1 đến 4 chỉ phát số lần cho phép (hiện là một lần) | DEC-002 |
| BR-29 | Mã đề (`ExamCode`) duy nhất trong bộ đề chưa xóa; tiền tố mã nhóm trong file nhập phải khớp mã đề của đề đang chọn trong bộ, không khớp thì từ chối cả file | DEC-018, DEC-022 |
| BR-30 | Phạm vi câu trong mã nhóm (ba chữ số, ví dụ `032-034`) phải khớp đúng các câu liên tiếp của nhóm trong file | DEC-014, DEC-020 |
| BR-31 | Giải thích từng phương án là một ô nhiều dòng, hiển thị nguyên khối; hệ thống chỉ kiểm tra định dạng và nhãn Đúng/Sai, không tách lưu theo đáp án | DEC-015 |
| BR-32 | Tệp media chỉ lưu khóa lưu trữ và loại file; không lưu kích thước, định dạng MIME, thời lượng | DEC-019 |
| BR-33 | Mỗi đề thuộc đúng một bộ đề; mã đề và tên đề duy nhất trong bộ | DEC-022 |
| BR-34 | Bộ đề chỉ xóa mềm khi không còn đề chưa xóa; bộ chỉ hiển thị cho người học khi có ít nhất một đề đã xuất bản | DEC-023 |

---

## 8. TRUY VẾT VÀ KIỂM TRA CHÉO

### 8.1. Use Case → Bảng dữ liệu

| UC | Bảng sử dụng |
|---|---|
| UC-01, 02, 03 | `Users`, `RefreshTokens` |
| UC-04 | `Exam`, `QuestionGroup`, `Question`, `QuestionOption`, `Media`, `ExamDirection`, `PartSetting`, `Attempt`, `AttemptAnswer`, `ScoreConversion`, `StudyDay` |
| UC-05 | như UC-04 (không có `ExamDirection` bắt buộc) + `UserQuestionProgress`, `VocabularyContext` |
| UC-06, 07, 08 | `QuestionCategory`, `LevelBand`, `QuestionGroup`, `Question`, `QuestionOption`, `Attempt` (`BANK`), `AttemptAnswer`, `UserQuestionProgress` |
| UC-09 | `ExamDirection`, `Media`, `Attempt` (view `vw_ExamDirectionEffective`) |
| UC-10 | `AttemptAnswer`, `Attempt`, `ScoreConversion`, `StudyDay` (view `vw_AttemptPartResult`, `vw_AttemptSummary`) |
| UC-11, 12, 13 | `Attempt`, `AttemptAnswer`, `Question`, `QuestionOption`, `QuestionGroup`, `Media`, `VocabularyContext` |
| UC-14, 26 | `Report` và các bảng nội dung |
| UC-15, 16, 17, 23, 24 | `Vocabulary`, `VocabularyRelation`, `VocabularyContext`, `VocabularyGroup`, `VocabularyGroupItem`, `VocabTopic`, `PartOfSpeech`, `UserVocabulary` |
| UC-18, 25 | `GrammarTopic`, `GrammarArticle`, `QuestionCategory` |
| UC-19, 20, 21, 29 | `ExamSet`, `Exam`, `QuestionGroup`, `QuestionGroupTag`, `Media`, `Question`, `QuestionOption`, `QuestionCategory`, `SpecialTag`, `LevelBand`, `PartSetting`, `Vocabulary`, `VocabularyContext` |
| UC-22 | `ExamDirection`, `Media`, `PartSetting` |
| UC-29 | `ExamSet`, `Exam` |
| UC-27, 28 (V2) | `ListeningItem`, `ListeningClip`, `Media`, `UserListeningProgress`, `VocabularyContext`, `StudyDay` |

### 8.2. Kiểm tra chéo

| Kiểm tra | Kết quả |
|---|---|
| Requirement → Use Case | Mọi FR MVP (kể cả FR mới L27 đến L30, A11, A12) có Use Case; FR V2 đã liệt kê ở mục 2.2 |
| Use Case → Dữ liệu | Mọi UC có bảng hỗ trợ; 31/32 bảng của database v1.3 được ít nhất một UC hoặc Use Case V2 sử dụng |
| Dữ liệu → Use Case | `StudyDay` và `UserListeningProgress` ghi từ MVP (UC-04, 05, 06, 10) nhưng chỉ hiển thị ở Version 2 (streak, tiến độ nghe) |
| Mâu thuẫn đã xử lý | Luyện thi không xem lại chi tiết (DEC-002) so với FR-L10: xử lý ở UC-11, UC-12; Reading một đồng hồ 75 phút (DEC-003) thay cho đếm giờ từng câu |
| Rủi ro phạm vi | UC-04 (Luyện thi) và UC-20, UC-21 (nhập 7 Part, Excel) là các UC nặng nhất; UC-06 giới hạn Part 5 ở phiên bản đầu |
| Requirement → Test | Mỗi UC có Main, Alternative, Exception Flow rõ ràng; BR kiểm thử được |

---

## 9. TRẠNG THÁI DỰ ÁN

| ID | Công việc | Phase | Status | Progress |
|---|---|---|---|---|
| UC-LIST | Danh sách Use Case (MVP 26, V2 2) | 5 | REVIEW | 75% |
| UC-SPEC | Đặc tả chi tiết Use Case v1.1 (cập nhật theo database v1.3) | 5 | REVIEW | 85% |
| BA | Phân tích nghiệp vụ (BA-01 đến BA-11) | 7 | REVIEW | 75% |
| DATA | Thiết kế database v1.3 và script SQL v1.1 | 8 | REVIEW (thiết kế) / NOT STARTED (script) | 75% / 0% |
| NFR-01 | Non-functional Requirement | 9 | NOT STARTED | 0% |

### Cần bạn quyết định
1. **ISSUE-011:** xác nhận UC-17 (xem bộ từ cá nhân) là MUST.
2. Xác nhận hoặc đổi các giả định ASM-02, 06, 07, 08, 09, 10, 11, 13.
3. Trả lời ISSUE-012 (một hay nhiều bài mỗi chủ điểm), ISSUE-014 (chủ đề từ vựng), ISSUE-017, 029, 030, 031 (đều có đề xuất mặc định).

### Công việc tiếp theo
1. Bạn duyệt Use Case v1.1 và database v1.3.
1a. Viết lại bộ script SQL v1.1 (00 đến 03), chạy trên SQL Server, nhập đề mẫu `Test_1_split.xlsx` theo bố cục v1.1.
2. Phase 9: Non-functional Requirement.
3. Phase 10: chốt MVP chính thức.
4. Kiến trúc hệ thống (JWT, lưu trữ media, đồng hồ máy chủ), rồi đặc tả API.
