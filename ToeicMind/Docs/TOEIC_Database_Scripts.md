# Nguồn SQL chuẩn và nâng cấp database hiện có

Theo yêu cầu người dùng ngày 30/10/2026, nguồn chuẩn là thư mục **`C:\Users\Admin\OneDrive\PROJECT_TOEIC\ToeicMindBE\DATABASE`**, cùng cấp với thư mục backend `ToeicMind`. Backend không duy trì một bộ CREATE TABLE rút gọn trong `ToeicMind/sql` nữa.

**Cập nhật 13/11/2026 — P01-01 / CHG-006:** bộ bốn file được cung cấp trong workspace hiện tại nằm ở `Docs/DATABASE`. Theo yêu cầu người dùng, toàn bộ migration VIP được gộp trực tiếp vào [DATABASE/01_schema.sql](DATABASE/01_schema.sql), phần D; đã xóa file migration VIP rời. Dùng bộ hiện có này để triển khai; đường dẫn `../DATABASE` bên dưới là bố cục triển khai cũ. Không tạo thêm bộ SQL thứ hai.

**Cập nhật 17/11/2026 — CHG-007 (cá nhân hóa, kiểm tra đầu vào):** thêm **phần E** vào `01_schema.sql` trước COMMIT: bảng `LearnerProfile`, `PlacementTest` (+ unique lọc một bài đang dùng), `PlacementTestGroup`, `PlacementAttempt`; nới `CK_Attempt_Scope`/`CK_Attempt_ExamScope` để nhận `PLACEMENT` và thêm `CK_Attempt_PlacementExam`. Chỉ thêm đối tượng còn thiếu, chỉ thay CHECK khi định nghĩa cũ chưa có `PLACEMENT`; không xóa dữ liệu. Đã chạy `01 → 02 → 03` rồi `01` lần nữa trên bản sao `ToeicDb_test_v1` (database tạm, đã xóa): thành công, 9 lượt làm bài cũ giữ nguyên. Chưa chạy trên database ứng dụng. Chi tiết: [PERSONALIZATION_2026-11-17.md](PERSONALIZATION_2026-11-17.md).

## Các file được sửa

CHG-003/CHG-005 cũng đã hợp nhất đầy đủ vào `01_schema.sql`: bảng `UserVocabProgress` ở A7.2, cột `StudyDay.VocabReviewCount` ở baseline và phần ALTER có guard, hai FK ở phần B, các index ở C2/C3. Đã bổ sung 10 index còn thiếu so với script hiệu năng: khác cột INCLUDE, bộ lọc hoặc thứ tự khóa nên không được coi là tương đương chỉ vì trùng cột đầu. Riêng index theo `QuestionGroupTag.GroupId` đã được PK clustered `(GroupId, SpecialTagId)` bao phủ đủ, không tạo thêm bản trùng. Index cũ giữ nguyên; chỉ tạo index còn thiếu theo tên, không DROP hoặc rebuild index dữ liệu hiện có.

| File gốc | Nội dung bổ sung/thay đổi |
|---|---|
| `00_create_database.sql` | Giữ nguyên. Database đã có thì không chạy file này. |
| `01_schema.sql` | Giữ toàn bộ baseline; CREATE bảng/FK/index có kiểm tra tồn tại. Thêm phần ALTER tại chỗ cho auth Google/OTP, bộ đề/mã đề, OptionExplanations, ContextMeaningVi và transcript/bản dịch theo cấu trúc mới. Giữ cột legacy và dữ liệu cũ; media metadata legacy cho NULL để API v1.3 không phải ghi dữ liệu giả. |
| `01_schema.sql`, phần D (CHG-006) | Thêm `Users.VipExpiresAt`, bốn cột quyền `ExamSet.*Access`, `Exam.AccessLevel`, `VipPlan`, `PaymentOrder` và index. Ba gói VIP mặc định giữ trong cùng file theo yêu cầu gộp vào một file, chỉ thêm khi bảng trống; không ghi đè giá/thời hạn/quyền VIP hoặc đơn thanh toán đã có. Toàn bộ nằm trong transaction của schema. |
| `02_views_procs_triggers.sql` | Giữ các view/trigger gốc; bổ sung tổng hợp bộ đề, kiểm tra lịch sử và kiểm tra/xuất bản theo nghiệp vụ mới bằng CREATE OR ALTER. Chuẩn hóa trigger chặn DELETE theo mã lỗi 50010 của script gốc. |
| `03_seed.sql` | Giữ nguyên các giá trị seed (7 Part, 4 Level, 119 loại, 15 chủ điểm, 202 dòng điểm, 9 hướng dẫn). Chỉ bổ sung SET option cho filtered index và ghi quy tắc loại từ đã duyệt; các khối vẫn chỉ seed khi bảng trống, không ghi đè nội dung Admin sửa. |

`01` có transaction và preflight: nếu đề cũ có dữ liệu nhưng thiếu ExamSetId/ExamCode, dừng với 51003 để cung cấp mapping; không tự gán bộ, không sinh lại ID hoặc xóa đề cũ. Index tên đề toàn cục được thay bằng unique trong bộ theo quyết định đã chốt. Giữ filtered index GroupOrder đang có trong script gốc; không áp thêm quy tắc unfiltered từ bộ schema rút gọn trước đây.

Không có DROP DATABASE, DROP TABLE hoặc TRUNCATE trong `01`–`03`; không xóa cột legacy. Các thao tác DROP INDEX/CHECK chỉ thay ràng buộc cũ cần sửa, không xóa hàng dữ liệu.

## Database đã có

Không dựng lại ToeicDb. Khi áp dụng phiên bản đã chỉnh, dùng tài khoản triển khai, chạy theo thứ tự **01 → 02 → 03**, dừng ngay khi có lỗi:

```powershell
sqlcmd -S localhost -E -C -d ToeicDb -f 65001 -b -i ..\DATABASE\01_schema.sql
sqlcmd -S localhost -E -C -d ToeicDb -f 65001 -b -i ..\DATABASE\02_views_procs_triggers.sql
sqlcmd -S localhost -E -C -d ToeicDb -f 65001 -b -i ..\DATABASE\03_seed.sql
```

Mỗi lệnh phải thành công trước khi chạy lệnh tiếp theo. Không chạy `00`. API không tự gọi EnsureCreated/Migrate hoặc DDL lúc khởi động.

Với bố cục workspace hiện tại, thay `..\DATABASE\` bằng `.\Docs\DATABASE\` trong các lệnh trên. Các script ghi `USE ToeicDb`; nếu triển khai database tên khác phải điều chỉnh đúng dòng `USE`, vì `-d` không ngăn script chuyển database. Phải áp dụng `01_schema.sql` trước backend CHG-006, kể cả database đã từng chạy migration VIP rời.

Kiểm chứng việc gộp CHG-006: **63 kiểm tra đạt** trên SQL Server `localhost\SQLEXPRESS`, dùng ba database tạm cho tạo mới, nâng cấp schema cũ và database đã chạy migration VIP cũ. Cột, CHECK, FK, unique/index và toàn bộ giá trị gói mặc định khớp migration cũ; chạy lại giữ mọi giá trị của user/bộ đề/đề/gói/đơn đã chỉnh. Bộ `01 → 02 → 03` chạy lại thành công. Ba database tạm đã xóa; chưa triển khai phần gộp này vào database ứng dụng. Script kiểm chứng và bản sao trước thay đổi nằm trong `artifacts/chg006-sql-merge/`.

Kiểm chứng việc gộp CHG-003/CHG-005: **67 kiểm tra đạt** trên SQL Server `localhost\SQLEXPRESS`, dùng ba database tạm cho schema đã chạy hai script cũ, schema thiếu bảng/cột CHG-005 và tạo mới. Định nghĩa cột/DEFAULT/CHECK/FK và metadata index khớp kết quả hai script cũ; chạy lặp `01 → 02 → 03` giữ dữ liệu ôn từ, bộ đếm ngày học và gói VIP, không tạo trùng index. Đã xóa hai file SQL rời và cập nhật thông báo `VOCAB_SCHEMA_MISSING`. Bản sao phục hồi và script kiểm chứng ở `artifacts/chg003-chg005-sql-merge/`; ba database tạm đã xóa, chưa cập nhật database ứng dụng.

## Backend và kiểm thử

Đã xóa 6 file SQL tách riêng trước đây trong `ToeicMind/sql` (001–006), gồm cả baseline auth. Bộ bốn file hiện được cung cấp tại `Docs/DATABASE`; CHG-003, CHG-005 và CHG-006 đều nằm trong `01_schema.sql`, không duy trì migration/index rời thứ hai.

Kiểm tra lịch sử ngày 30/10/2026: parser T-SQL Microsoft xác nhận 4 file không lỗi cú pháp; không có DDL xóa bảng/database trong 01–03 và các literal seed không thay đổi. Việc gộp CHG-006 ngày 13/11/2026 được kiểm chứng riêng ở mục trên; chưa áp dụng phần gộp này vào database ứng dụng.

Khi sao lưu/chia sẻ/commit dự án, giữ đủ bộ bốn file `DATABASE` đang dùng và ghi rõ vị trí triển khai. Bố cục cũ đặt `../DATABASE` ngoài backend; workspace hiện tại cung cấp bộ này trong `Docs/DATABASE`.
