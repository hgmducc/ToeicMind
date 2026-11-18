# KẾ HOẠCH PHÁT TRIỂN HỆ THỐNG TOEICMIND v1.0

| Thuộc tính | Nội dung |
|---|---|
| Ngày lập | 26/10/2026 |
| Vai trò tài liệu | **Tài liệu chuẩn để tổ chức và theo dõi các công việc phát triển tiếp theo** |
| Cơ sở nghiệp vụ | [TOEIC_UseCase_Spec_v1.3.md](TOEIC_UseCase_Spec_v1.3.md): nguồn mới nhất cho công việc từ 30/10/2026; thêm UC-29 quản lý bộ đề |
| Cơ sở dữ liệu | [TOEIC_DatabaseDesign_v1.3.md](TOEIC_DatabaseDesign_v1.3.md): 32 bảng nghiệp vụ và 2 bảng hạ tầng auth, SQL Server |
| Nguồn SQL chuẩn | `../DATABASE` người dùng đã triển khai; chỉ bổ sung/ALTER phần thiếu, không giữ baseline thứ hai trong backend. Xem [TOEIC_Database_Scripts.md](TOEIC_Database_Scripts.md) |
| Tài liệu API hiện tại | [TOEIC_API_Documentation.md](TOEIC_API_Documentation.md): 44 thao tác, request/response, phân quyền, validation, mã lỗi và ví dụ tích hợp |
| Hiện trạng triển khai | ASP.NET Core Web API `net10.0`; đã có đăng ký/đăng nhập/JWT/refresh/logout/me, ánh xạ auth và kiểm thử tích hợp SQL Server |
| Trạng thái kế hoạch | P02-01–03 ở `REVIEW` cho backend auth; 24/24 kiểm thử qua. Nền tảng TOEIC ngoài auth và tích hợp frontend còn tiếp tục; issue/ASM chưa xác nhận vẫn mở |
| Phạm vi thực hiện trong lần lập kế hoạch | Đọc tài liệu, khảo sát mã nguồn, lập kế hoạch và chỉ dẫn sử dụng; chưa sửa mã ứng dụng hoặc triển khai database |

## 1. Cách dùng kế hoạch làm chuẩn

1. Trước mỗi công việc, đọc tài liệu này và phần UC/BR, bảng dữ liệu liên quan trong hai tài liệu gốc.
2. Gắn công việc với mã `Pxx-yy` ở mục 9; ghi rõ UC, BR, bảng/API bị ảnh hưởng và tiêu chí nghiệm thu.
3. Làm theo quan hệ phụ thuộc. Có thể thực hiện công việc độc lập khi một nhánh đang thiếu dữ liệu hoặc quyết định; ghi rõ phần phụ thuộc còn thiếu.
4. Cập nhật trạng thái, kết quả kiểm tra và việc tiếp theo ngay trong tài liệu này. Không coi thiết kế hoàn tất là phần mềm đã hoàn tất.
5. Khi người dùng thay đổi yêu cầu, ghi quyết định và tác động trước khi cập nhật kế hoạch, API hoặc schema liên quan. Các quyết định đã được xác nhận trong phiên làm việc tiếp tục có hiệu lực, không hỏi lại.

Thứ tự áp dụng: **chỉ dẫn mới nhất của người dùng → quyết định thay đổi đã được xác nhận → tài liệu nghiệp vụ và dữ liệu tương ứng → kế hoạch triển khai này**. Kế hoạch điều phối công việc, không tự thay thế các quy tắc đã chốt trong tài liệu nguồn. Khi hai nguồn chưa thống nhất, đưa vào sổ quyết định ở mục 5 và giải quyết trước phần triển khai phụ thuộc; không tự diễn giải thành quyết định đã chốt.

Các lựa chọn kiến trúc và chỉ tiêu kỹ thuật mới trong kế hoạch là **đề xuất triển khai**. Chúng cần được kiểm chứng ở P00; thay đổi phạm vi hoặc nghiệp vụ phải có quyết định của người dùng. Các lựa chọn kỹ thuật thông thường trong phạm vi đã được giao có thể tự thực hiện và ghi nhận, không cần một vòng xin phép riêng.

## 2. Hiện trạng và khoảng cách cần hoàn thiện

Khảo sát workspace ngày 26/10/2026:

| Hạng mục | Đã có | Cần thực hiện |
|---|---|---|
| Backend | `ToeicMind.csproj`, `Program.cs`, controllers; bật nullable và OpenAPI trong Development | Cấu trúc module, kết nối SQL Server, nghiệp vụ, xác thực, kiểm tra dữ liệu, xử lý lỗi |
| Chức năng mẫu | `WeatherForecast` và controller mẫu | Gỡ khi nền tảng TOEIC thay thế, cập nhật file HTTP kiểm tra API |
| Database | Tài liệu thiết kế 31 bảng | Đưa script vào workspace, chạy SQL Server thật, ánh xạ dữ liệu và kiểm thử ràng buộc |
| Script SQL | Tài liệu nguồn mô tả 4 file trong `sql/` | **Chưa thấy thư mục/file này trong workspace**; cần tiếp nhận hoặc tái tạo có đối chiếu |
| Dữ liệu đầu vào | Tài liệu mô tả Excel, CSV và media | **Chưa thấy file Excel/CSV/audio/hình mẫu trong workspace**; cần danh sách nguồn và bộ dữ liệu kiểm thử |
| Frontend | Chưa thấy mã nguồn hoặc hợp đồng tích hợp trong workspace backend | Xác định repository, công nghệ, người phụ trách; đặc tả màn hình và tích hợp qua API |
| Kiểm thử, vận hành | Chưa thấy dự án test, pipeline hoặc hướng dẫn triển khai | Bộ kiểm tra nghiệp vụ/SQL Server, kiểm tra tích hợp, môi trường thử nghiệm, sao lưu và phát hành |

Tài liệu database ghi 64/64 ca kiểm tra logic qua bản chuyển sang SQLite và kiểm tra cú pháp SQL; **đó là kết quả được tài liệu nguồn báo lại**, chưa phải kiểm chứng trong workspace này. View, procedure, trigger và hành vi đồng thời phải được chạy lại trên SQL Server thật. Tài liệu Use Case vẫn có trạng thái `REVIEW` và các ASM/ISSUE mở; không coi chúng đã được người dùng duyệt chỉ vì có kế hoạch này.

## 3. Phạm vi phát triển

### 3.1. MVP dự kiến

| Nhóm | Phạm vi | UC | Giai đoạn chính |
|---|---|---|---|
| Tài khoản | Đăng ký, đăng nhập theo vai trò, đăng xuất, từ chối tài khoản khóa | UC-01–03 | P02 |
| Quản trị đề | Đề Nháp/Xuất bản, nhóm câu, câu hỏi, đáp án, media, xóa mềm và khôi phục theo UC | UC-19, 20 | P03 |
| Hướng dẫn | 9 mục mặc định, bản riêng từng đề, audio/hình, hướng dẫn hiệu lực | UC-22; UC-09 | P03; P06/P08 |
| Từ vựng | Từ điển, quan hệ/ngữ cảnh, chủ đề, nhóm từ, lưu và quản lý bộ cá nhân | UC-15–17, 23, 24 | P04 |
| Ngữ pháp | 15 chủ điểm Part 5, đọc và quản trị bài viết | UC-18, 25 | P04 |
| Nhập dữ liệu | Kiểm tra trước nhập, xác nhận, nhập nguyên giao dịch, báo lỗi theo dòng | UC-21; nhánh nhập của UC-22 | P05 |
| Luyện tập | Chọn nhiều Part trong một đề, chấm ngay, tiến độ theo câu, kết quả/xem lại/lịch sử | UC-05, 10–13 | P06 |
| Ngân hàng câu hỏi | Part 5 theo 4 Level và 4 nhóm chủ điểm; chưa luyện, ôn sai, làm lại, xóa tiến độ | UC-06–08 | P07 |
| Luyện thi | Full, Listening, Reading, nhiều Part; trình tự, audio, giờ máy chủ, hướng dẫn và tự nộp | UC-04, 09; dùng lại UC-10–13 | P08 |
| Báo cáo nội dung | Người học gửi; Admin xử lý, sửa nội dung và đóng báo cáo | UC-14, 26 | P09 |

UC-08 có ưu tiên `SHOULD` trong nguồn nhưng vẫn nằm trong danh sách MVP dự kiến. UC-17 được đưa vào kế hoạch với mức **MUST đề xuất**, chưa đóng ISSUE-011. Khi cần giảm phạm vi, phải ghi quyết định và cập nhật ma trận; không tự bỏ hai UC này.

### 3.2. V2 và Future

- Đầu V2: UC-27, UC-28 — luyện nghe clip và quản trị clip TH1/TH2.
- V2: khách xem/làm bài công khai, quên/đổi mật khẩu, hồ sơ và mục tiêu, test đầu vào, checklist/streak, gắn cờ câu hỏi, học lại từ đã lưu, tự xóa tài khoản sau 30 ngày, quản lý người dùng/khóa tài khoản và thống kê Admin.
- Future: PRO, thanh toán, khóa nội dung theo gói, AI gợi ý lộ trình.

MVP mở các Level và chủ điểm, không triển khai khóa PRO. Kiểm tra `Users.Status` thuộc xác thực MVP; giao diện/API Admin quản lý tài khoản thuộc V2. Có thể dựng đủ baseline 31 bảng theo thiết kế, kể cả bảng dành cho clip, nhưng chưa xây API/màn hình V2.

## 4. Các quy tắc phải giữ khi triển khai

| Mã | Quy tắc nghiệm thu | Nguồn |
|---|---|---|
| R01 | Đề được xuất bản phải có đủ 7 Part, số câu lần lượt **6, 25, 39, 30, 30, 16, 54**; đề Nháp được phép thiếu nội dung | BR-08, 20; DB mục 7.3 |
| R02 | Part của câu lấy từ `QuestionGroup.PartNo`; dữ liệu dùng chung chỉ lưu cấp nhóm; giữ nguyên nhóm khi chọn câu | DB-DEC-01, 09; BR-19, 21 |
| R03 | Part 2 có 3 đáp án, Part khác có 4; mỗi câu đúng một đáp án đúng khi xuất bản; đáp án chọn thuộc đúng câu | BR-08, 23 |
| R04 | `EXAM`: làm theo thứ tự, không quay lại, Listening tự chuyển theo audio, giới hạn phát theo cấu hình; chỉ xem tổng kết sau nộp | DEC-002; BR-09, 10, 28 |
| R05 | Reading đầy đủ dùng một đồng hồ 75 phút cho Part 5–7; 27/45 giây chỉ để đề xuất thời gian thi theo Part | DEC-003; DB-DEC-12; `PartSetting` |
| R06 | Giờ thi do máy chủ quyết định; thời gian xem hướng dẫn không tính vào giờ thi; mất kết nối không dừng đồng hồ | DEC-004; UC-04 E1; BR-27 |
| R07 | `PRACTICE/PART` và `PRACTICE/BANK` chấm ngay, cho xem giải thích, không có đồng hồ bắt buộc | BR-11; DEC-008 |
| R08 | Chỉ PRACTICE cập nhật `UserQuestionProgress`; không có dòng nghĩa là chưa luyện; câu sai dựa vào lần trả lời gần nhất | DEC-006, 007; BR-26 |
| R09 | Xóa tiến độ không xóa lịch sử; ẩn lịch sử không xóa tiến độ | UC-08, 13; DB-DEC-16 |
| R10 | Chỉ quy đổi khi phủ đủ một kỹ năng chuẩn hoặc cả bài chuẩn; bài BANK và luyện Part chưa đủ kỹ năng không quy đổi | BR-05, 07; UC-05 A5, UC-10 |
| R11 | Nội dung Admin chỉ xóa mềm; FK nội dung NO ACTION; liên kết thuần và dữ liệu cá nhân áp dụng ngoại lệ cụ thể của DB mục 7.4 | BR-17; DB-DEC-02 |
| R12 | Từ điển duy nhất tuyệt đối theo `(Lemma, PosCode)`; từ đã xóa thì khôi phục; bộ cá nhân tham chiếu từ hệ thống | BR-14, 24; DB-DEC-11, 15 |
| R13 | Hướng dẫn riêng của đề ưu tiên hơn mặc định; phải có đủ 9 mục hiệu lực khi xuất bản | BR-25; DB-DEC-17 |
| R14 | Nhập Excel có lỗi thì không ghi dòng nào; không tự xuất bản sau nhập | UC-21; DB mục 11 |
| R15 | Mọi truy cập bài làm, tiến độ và bộ từ cá nhân đều kiểm tra chủ sở hữu; phân quyền Admin/Người học tại API | BR-04, 18; UC-11, 12 |

Điều kiện quy đổi kiểm tra **tập câu và cấu trúc Part**, không chỉ `TotalQuestions = 100`. Luyện tập chọn đủ Part 1–4 hoặc 5–7 cũng đủ điều kiện theo UC-05 A5; không cấm quy đổi chỉ vì `Mode = PRACTICE`. Chỉ có một kỹ năng thì trả điểm kỹ năng đó; cách biểu diễn `TotalScaled` được chốt tại Q04.

Các câu từ đề Nháp, đã xóa hoặc chưa xuất bản không được đưa vào một lượt luyện mới. Nội dung bị ẩn vẫn có thể đọc qua bài PRACTICE đã nộp của chính người học theo UC-12; đường đọc lịch sử phải xử lý riêng quyền và bộ lọc xóa mềm.

## 5. Sổ quyết định và phụ thuộc cần giải quyết

### 5.1. Issue và giả định từ tài liệu nguồn

Các đề xuất dưới đây phục vụ lập kế hoạch, **không phải xác nhận thay người dùng**. Chỉ cần giải quyết trước đầu việc phụ thuộc; không chặn toàn dự án vì một issue độc lập.

| ID nguồn | Đề xuất để triển khai | Cần chốt trước | Trạng thái |
|---|---|---|---|
| ISSUE-011 | UC-17 là MUST trong MVP | P04-03 | OPEN |
| ISSUE-012 | Mỗi chủ điểm **một bài duy nhất** gồm lý thuyết, cấu trúc, ví dụ mẫu, bài tập mẫu, mẹo TOEIC; ràng buộc `UX_GrammarArticle_Topic` | P04-04 | CONFIRMED — người dùng chốt 18/11/2026 |
| ISSUE-014 | Seed chủ đề được duyệt, Admin thêm; tạm cho `VocabTopicId` NULL; không tự tạo danh sách chính thức | P04-01, P05-03 | OPEN |
| ISSUE-017 | Khi thi Part 1/2 chỉ hiện nhãn đáp án; chữ đáp án dành cho luyện tập/xem lại hợp lệ | P08-02 | OPEN |
| ISSUE-019 | Chuẩn hóa `v.phr → phr.v`, `n.phr/adv.phr → phr`, ghi báo cáo từng dòng; giữ 7 mã loại từ | P01-03, P05-03 | CONFIRMED — người dùng duyệt 30/10/2026 |
| ISSUE-020 | Bổ sung tên Việt cho 10 nhóm cha; rà `Model/Modal`, mã cha/lá `statement`; không đổi mã tham chiếu tùy tiện | P01-03 | OPEN |
| ISSUE-021 | Giữ nhiều đoạn Part 7 trong một `PassageHtml`, ngăn bằng `<hr>` và lọc HTML an toàn | P03-02, P05-01 | OPEN |
| ISSUE-029 / ASM-10 | Lượt BANK tối đa 20 câu, cấu hình được; xác định giới hạn này cho cả ôn sai/làm lại | P07-02 | OPEN |
| ISSUE-030 / ASM-11 | Hướng dẫn Part khi PRACTICE là tùy chọn | P06-02 | OPEN |
| ISSUE-031 / ASM-09 | Reading nhiều câu: trả lời trong nhóm rồi nhấn Tiếp; chỉ khóa khi rời nhóm | P08-02 | OPEN |
| ASM-02 | Thoát rõ ràng ghi ABANDONED; PRACTICE giữ đáp án/tiến độ; phân biệt đóng tab và mất kết nối theo Q02 | P06-01, P08-03 | OPEN |
| ASM-06 | Trong EXAM không mở luồng báo lỗi/lưu từ | P08-02, P09-01 | OPEN |
| ASM-07 | Được bỏ qua hướng dẫn khi thi; thời gian hướng dẫn vẫn tính riêng | P08-01 | OPEN |
| ASM-08 | Reading bắt đầu sau hướng dẫn vào Part 5; Listening kết thúc theo audio; cần thống nhất với 45/120 phút tại Q01 | P08-01 | OPEN |
| ASM-12, 13 | PRACTICE nghe lại không giới hạn; BANK phiên bản đầu chỉ Part 5 | P06-02, P07-01 | OPEN |
| ASM-01, 03–05, 14 | Email/mật khẩu không xác thực email/Google; nghĩa từ ngoài từ điển do người học nhập; form đăng nhập chung; 4 trạng thái report; gỡ từ cá nhân bằng xóa thật | P02, P04, P09 tương ứng | Giả định nguồn, chưa tự nâng thành quyết định |

### 5.2. Điểm cần làm rõ khi chuyển từ thiết kế sang phần mềm

| ID | Khoảng trống hoặc mâu thuẫn | Đầu ra cần có | Phụ thuộc |
|---|---|---|---|
| Q01 | `TimeLimitSeconds` là 7200/2700/4500 nhưng ASM-08 cho Listening kết thúc theo audio; chưa rõ tổng audio, chặn giờ toàn bài, phân bổ giờ thi nhiều Part/tự đặt và cách làm tròn 1692 giây thành 30 phút | Ma trận thời gian cho từng Mode/Scope, chính sách hết giờ ở từng phần, ví dụ có hướng dẫn giữa bài; không dùng đồng hồ tổng làm Reading vượt 75 phút | P00-02 → P08-01 |
| Q02 | UC-04 cho tiếp tục khi mất mạng nhưng bỏ dở khi đóng tab; server không thể phân biệt chắc chắn chỉ qua sự kiện trình duyệt | Chính sách heartbeat, thời gian chờ kết nối lại, thoát chủ động, khởi động lại server, hết giờ khi không có client; ngưỡng thời gian được ghi rõ | P00-02 → P08-03 |
| Q03 | 31 bảng chưa mô tả đủ trạng thái vận hành: vị trí đang làm, nhóm đã khóa, hướng dẫn đang mở, mốc giờ từng phần, trạng thái audio/số lần phát | ADR mô hình lưu trạng thái bền vững; nếu cần thêm cột/bảng thì cập nhật thiết kế và script phiên bản tiếp theo trước khi triển khai | P00-03 → P06-01, P08 |
| Q04 | BR-05 diễn đạt luyện lẻ Part không quy đổi, UC-05 A5 cho quy đổi khi chọn đủ kỹ năng; chưa rõ `TotalScaled` nếu chỉ có một kỹ năng | Bảng quyết định: phủ cấu trúc chuẩn được quy đổi theo UC-05 A5; đề xuất tổng chỉ có khi đủ cả hai kỹ năng; ghi rõ trường NULL trong API/test | P00-02 → P06-03 |
| Q05 | ĐÃ CHỐT 30/10/2026: chỉ sửa metadata sau lịch sử; nội dung/đáp án/cấu trúc/media/hướng dẫn đã dùng bị khóa, kể cả BANK | Đã triển khai guard nguyên transaction; sửa lớn tạo đề mới, không tự thêm snapshot. Test 78/78 qua, hợp đồng TOEIC_Exam_Content_API.md | P03-04 đã thực hiện; P06 tiếp tục bảo vệ khi tạo lượt |
| Q06 | UC mục 8.2 nói `UserListeningProgress` ghi từ MVP, nhưng các UC MVP không chọn `ListeningItem`; BA-11 chỉ ghi khi luyện clip V2 | Đề xuất MVP chỉ ghi `StudyDay` và tiến độ câu; `UserListeningProgress` ghi từ UC-27 ở V2; xác nhận và đồng bộ câu mô tả trong nguồn | P00-02 → P06-03 |
| Q07 | DB mục 2 còn câu mô tả chưa luyện suy từ `AttemptAnswer`, nhưng thiết kế cuối dùng `UserQuestionProgress` để hỗ trợ reset | Áp dụng DEC-007/DB-DEC-16: đếm qua `UserQuestionProgress`; không tái tạo tiến độ đã xóa từ lịch sử; ghi nhận chỗ mô tả cũ cần đồng bộ | P07-01 |
| Q08 | DB mục 10.1 gọi lệch cỡ nhóm là cảnh báo; UC-21 bước 3 yêu cầu kiểm tra cỡ nhóm | Chốt mức lỗi/cảnh báo; đề xuất chặn nhập nhóm sai cỡ theo UC-20/21; đối chiếu cả `sp_PublishExam` để đường nhập form và Excel nhất quán | P00-02 → P03-04, P05-01 |
| Q09 | Backend auth đã triển khai; còn tích hợp hết access token trong bài 120 phút và cách lưu token phía frontend | ADR-001 ở `TOEIC_Auth_Implementation.md`: mặc định access 15 phút/refresh 7 ngày, cấu hình theo môi trường; hash, xoay vòng nguyên transaction/thu hồi đã kiểm thử. P08/P10 tiếp tục tích hợp, không làm mất trạng thái/không dừng giờ | P00-03/P02-02 đã có phần backend; P08-03/P10 còn tiếp tục |
| Q10 | Chưa rõ PRACTICE được sửa đáp án sau khi đã xem giải thích hay không; nhiều tab có thể ghi đè tiến độ hoặc reset | Quy tắc chốt câu, thứ tự cập nhật theo giờ máy chủ, xử lý request lặp/cũ; định nghĩa reset và lượt đang mở | P00-02 → P06-02, P07-03 |

### 5.3. Đầu vào còn thiếu

| Mã | Đầu vào | Cách xử lý | Cần trước |
|---|---|---|---|
| DEP-01 | 4 script SQL đã được mô tả | Tìm/tiếp nhận bản gốc; nếu không có thì tái tạo từ thiết kế và ghi rõ nguồn, kiểm chứng lại hoàn toàn | P01-01 |
| DEP-02 | Excel đề, clip, `toeic_directions.xlsx`, `toeic_conversion_tables.csv` | Tiếp nhận và lưu bộ mẫu có nguồn; không tự bịa bảng điểm hoặc coi dữ liệu tổng hợp là dữ liệu thật | P01-03, P05; file clip cho V2 |
| DEP-03 | Audio/hình thật và độ dài audio | Kiểm tra file tồn tại, quyền sử dụng, khả năng tải/phát; bộ mẫu thử phải có đủ Part và hướng dẫn | P03-03, P08-02 |
| DEP-04 | SQL Server để phát triển/kiểm thử | Chốt instance, thông tin kết nối qua secret, quyền triển khai và quyền ứng dụng tách biệt | P01-01 |
| DEP-05 | Frontend và nơi triển khai | Xác định repo, origin, người phụ trách và môi trường; chưa chọn công nghệ frontend trong kế hoạch này | P00-03; bắt buộc trước tích hợp P10 |

Trong khi thiếu file mẫu có thể xây parser với fixture tổng hợp được ghi nhãn và khung API. Nghiệm thu seed/import/điểm số với dữ liệu thật vẫn cần DEP-02; không dùng fixture để tuyên bố đã hoàn tất phụ thuộc này.

## 6. Kiến trúc triển khai dự kiến

### 6.1. Cấu trúc ứng dụng

Giữ backend ASP.NET Core Web API `net10.0` đang có; tổ chức thành một ứng dụng với các module rõ trách nhiệm. Đề xuất truy cập SQL Server bằng EF Core cho ánh xạ và thao tác thông thường, gọi trực tiếp procedure/view khi phù hợp. Chốt gói/phiên bản tương thích, giấy phép và cách đọc Excel ở P00-03; chưa khóa phiên bản thư viện chỉ từ kế hoạch.

**Cập nhật theo yêu cầu người dùng 27/10/2026 (CHG-001/ADR-001):** cấu trúc thực hiện dùng Controller → Service → Repository → DbContext theo dự án UserApi, giữ các thư mục tính năng đang có. Phương thức truy vấn dùng chuỗi phương thức LINQ với lambda, `=>` và trả trực tiếp `Task` khi chỉ chuyển tiếp một tác vụ. [TOEIC_Code_Style.md](TOEIC_Code_Style.md) là tài liệu quy ước; [TOEIC_Auth_Implementation.md](TOEIC_Auth_Implementation.md) ghi cấu hình, schema, hợp đồng và bằng chứng auth. Các sơ đồ Application/Domain/Infrastructure bên dưới là đề xuất ban đầu, được thay bằng quy ước này cho việc tổ chức code.

```text
Frontend Người học / Admin (repository sẽ xác định)
                      |
             ASP.NET Core Web API
                      |
          Application: các luồng UC
                      |
           Domain: quy tắc nghiệp vụ
                      |
  Infrastructure: SQL Server, media, import, tác vụ nền
```

Luồng phụ thuộc trong mã: controller gọi application; application dùng quy tắc domain và các interface; infrastructure hiện thực truy cập dữ liệu/dịch vụ ngoài. Domain không phụ thuộc controller hoặc thư viện lưu trữ. Có thể giữ trong project hiện tại khi MVP còn nhỏ; chỉ tách project khi có nhu cầu cụ thể.

```text
ToeicMind/
  Controllers/                 # HTTP, phân quyền, chuyển DTO
  Application/                 # Auth, Catalogs, Exams, Imports,
                               # Attempts, QuestionBank, Vocabulary,
                               # Grammar, Reports
  Domain/                      # Quy tắc, kiểu trạng thái, chính sách
  Infrastructure/              # Persistence, Media, Importing, Jobs
  Contracts/                   # Request/response công khai
  sql/                         # Baseline và script thay đổi DB
  Docs/                        # Nguồn yêu cầu, kế hoạch, API, vận hành
```

Đây là cấu trúc đích, chưa phải thư mục đã tồn tại. Hiện dự án không có project kiểm thử tự động.

### 6.2. Quy tắc database và media

- **SQL scripts là nguồn triển khai schema** để giữ CHECK, FK ghép, filtered unique index, 5 view, `sp_PublishExam` và 12 trigger. EF ánh xạ đúng schema; không dùng `EnsureCreated` hoặc tự tạo một schema song song.
- Chạy baseline theo thứ tự `00_create_database.sql`, `01_schema.sql`, `02_views_procs_triggers.sql`, `03_seed.sql`. Sau khi đã áp dụng, thay đổi bằng script mới `V002`, `V003`…; không sửa ngược bản đã chạy.
- Không chạy DDL bằng tài khoản ứng dụng. Tài khoản ứng dụng không có quyền DELETE bảng nội dung; kiểm chứng quyền gọi procedure xuất bản trên SQL Server.
- Lưu thời điểm UTC ở `DATETIME2`; `StudyDate` theo múi giờ học được chốt ở P00. Không tin giờ do client gửi để chấm điểm hoặc tính thời gian.
- Media lưu `StorageKey` tương đối, URL gốc ở cấu hình; đề xuất storage local cho Development sau interface để thay nơi lưu ở triển khai. Chọn dịch vụ lưu thật tại P00/P10 theo môi trường có sẵn.
- Upload kiểm tra định dạng thực, kích thước và khóa đường dẫn. Lưu tạm rồi gắn với giao dịch dữ liệu; khi ghi DB thất bại có cơ chế dọn file mồ côi. Rollback SQL không tự rollback file.
- Xóa mềm nội dung không xóa vật lý media đang được lịch sử tham chiếu. Tạo đường đọc lịch sử có kiểm tra chủ sở hữu; không tắt bộ lọc xóa mềm trên API công khai.

### 6.3. Hợp đồng API cần đặc tả

Tiền tố đề xuất `/api/v1`; tách `/admin` cho thao tác quản trị. Danh sách dưới đây là **nhóm API cần thiết**, route chi tiết và DTO phải được chốt trong tài liệu API ở P00-03 và cập nhật khi triển khai.

| Nhóm | Thao tác/hợp đồng chính | UC |
|---|---|---|
| Auth | Register, login, thông tin người dùng hiện tại; logout phía client theo UC-03 | 01–03 |
| Catalogs | Part, Level, cây phân loại, chủ điểm ngữ pháp, loại từ, chủ đề từ vựng | 06, 18, 20, 23 |
| Admin Exams | Đề, nhóm/câu/đáp án, kiểm tra xuất bản, xuất bản, xóa mềm/khôi phục theo UC | 19, 20 |
| Directions/Media | Mặc định/ghi đè, hướng dẫn hiệu lực, upload và tải file có kiểm tra quyền | 09, 22 |
| Imports | Kiểm tra file → báo cáo → xác nhận nhập đúng bản file đã kiểm tra | 21, 22 |
| Attempts | Tạo lượt, lấy trạng thái/nhóm hiện tại, lưu đáp án, chuyển nhóm, vào/ra hướng dẫn, nộp/bỏ dở | 04, 05, 09, 10 |
| Results/History | Tổng kết, xem lại PRACTICE, lịch sử và ẩn lịch sử | 11–13 |
| Question Bank | Thẻ/số lượng, lượt chưa luyện/ôn sai/làm lại, reset phạm vi thẻ | 06–08 |
| Vocabulary/Grammar | Nhóm từ, tra cứu, bộ cá nhân; chủ điểm và bài viết; API quản trị tương ứng | 15–18, 23–25 |
| Reports | Gửi report, danh sách/xử lý/đóng hàng loạt cho Admin | 14, 26 |

DTO tách riêng **nội dung đang thi**, **phản hồi PRACTICE**, **tổng kết** và **xem lại**. Không serialize entity trực tiếp. API EXAM không trả `IsCorrect`, đáp án đúng, giải thích, transcript/bản dịch tiết lộ nội dung, hoặc chi tiết từng câu trong kết quả. Các API nội dung khác cũng phải giữ quy tắc truy cập đã chốt cho lượt thi đang diễn ra.

Quy ước chung: lỗi có mã ổn định, thông tin từng trường/dòng và trace ID; danh sách có phân trang/sắp xếp; kiểm tra role và owner ở máy chủ. Chỉ trả `UserId` từ danh tính xác thực cho dữ liệu cá nhân, không nhận một user tùy ý từ request. Request lặp, xung đột trạng thái và bài hết giờ phải có hành vi rõ trong hợp đồng.

## 7. Thiết kế các luồng có rủi ro cao

### 7.1. Vòng đời bài làm và giờ máy chủ

Trạng thái `Attempt` giữ đúng thiết kế: `IN_PROGRESS → SUBMITTED / ABANDONED / ERROR`. Trạng thái vận hành như đang xem hướng dẫn, đang nghe, đang đọc là khái niệm riêng, không tự thêm vào CHECK `Attempt.Status`.

1. Tạo `Attempt` và toàn bộ `AttemptAnswer` trong một giao dịch; câu lấy từ đề đã xuất bản hoặc tập BANK hợp lệ. Mọi câu trong bài có đề phải cùng `Attempt.ExamId`.
2. Máy chủ lưu trạng thái đủ để khôi phục vị trí, ranh giới nhóm, các mốc thời gian và lượt phát sau reconnect hoặc khởi động lại ứng dụng theo ADR Q03. Bộ nhớ của một tiến trình không phải nơi lưu trạng thái duy nhất.
3. Máy chủ chỉ cho vào hướng dẫn tại đúng ranh giới. Bắt đầu/kết thúc hướng dẫn là các chuyển trạng thái có kiểm tra, tính bằng giờ máy chủ, gửi lại không cộng `DirectionSeconds` hai lần. Không nhận số giây hướng dẫn tùy ý từ client.
4. Reading không dùng đồng hồ từng câu. `DisplayedAt` phục vụ theo dõi vị trí/thời điểm hiển thị; ghi chú cũ trong DB về kiểm tra đồng hồ từng câu không thay DEC-003. Bài đủ Reading dùng ngân sách 4500 giây; các scope khác theo ma trận Q01.
5. Listening chuyển theo lịch audio hợp lệ được máy chủ kiểm tra; cần độ dài audio tin cậy. Sự kiện `audio ended` từ client không đủ để tự cho qua một nhóm tùy ý.
6. Tác vụ nền quét bài đến hạn và khôi phục công việc sau restart; mỗi lệnh lưu đáp án/chuyển nhóm/nộp cũng kiểm tra hết giờ. Tự nộp phải hoạt động khi người học không gửi thêm request.
7. Lệnh nộp dùng giao dịch và kiểm soát đồng thời: chỉ chốt một lần, không cộng `StudyDay` hai lần; nộp tay và tác vụ hết giờ chạy cùng lúc vẫn ra một kết quả.
8. EXAM bỏ dở/lỗi không có điểm quy đổi; không tạo `UserQuestionProgress`. PRACTICE bỏ dở giữ đáp án và tiến độ đã ghi; kết quả của bài bỏ dở theo UC-11.

Giới hạn audio được thực hiện bằng quyền phát theo lượt thi, trạng thái máy chủ và điều khiển player. Cần mô tả rõ mức bảo đảm: một file đã tải về thiết bị có thể được phát ngoài player; không coi nút bị vô hiệu hóa là bằng chứng máy chủ đã cưỡng chế BR-28. Quyết định cách cấp media/quyền phát nằm trong P00-03 và được kiểm tra tại P08-02.

### 7.2. Chấm điểm và tiến độ

- Client chỉ gửi lựa chọn; máy chủ tính đúng/sai. Đáp án NULL được tính sai khi nộp.
- PRACTICE: lưu lựa chọn, đúng/sai và upsert `UserQuestionProgress` trong cùng giao dịch. EXAM chỉ chốt đúng/sai khi nộp và không trả thông tin này trước/sau nộp qua API chi tiết.
- Dùng bảng `ScoreConversion` đủ 202 dòng: mỗi kỹ năng có 0–100 câu đúng. Không nội suy, không hard-code công thức hoặc suy bảng điểm từ phần trăm.
- Thống kê Part dùng view theo thiết kế; không tạo lại bảng `AttemptPartResult` đã bị bỏ.
- Upsert tiến độ theo sự kiện được máy chủ chấp nhận mới nhất; không để request gửi lại ghi đè câu trả lời mới hoặc tạo thêm lượt học.
- Câu chưa trả lời trong PRACTICE không được đánh dấu là đã luyện chỉ vì đã tạo dòng `AttemptAnswer`.
- `StudyDay` dùng ngày học theo múi giờ đã chốt và chỉ tăng bộ đếm một lần cho cùng sự kiện nộp thành công. MVP chưa tự ghi `UserListeningProgress` khi chưa giải quyết Q06.

### 7.3. Import, xuất bản và sửa nội dung

- Import gồm hai bước: kiểm tra không ghi dữ liệu nghiệp vụ → người quản trị xác nhận đúng bản file và lựa chọn xử lý xung đột → ghi trong một transaction. Kiểm tra lại các điều kiện có thể thay đổi trước lúc ghi.
- Báo cáo gồm sheet/dòng/cột, mã lỗi, lỗi chặn hay cảnh báo, số câu/nhóm và xung đột nghĩa từ. File kiểm tra và file xác nhận phải có định danh/hash đối chiếu, tránh nhập một file khác với bản đã kiểm tra.
- Mở nhóm khi `cat` khác rỗng; dữ liệu nhóm chỉ ở dòng đầu. Part 1/2/5 mỗi nhóm một câu; Part 3/4 ba câu, Part 6 bốn câu, Part 7 từ hai đến năm câu theo UC-20/21 và quyết định Q08.
- Thay nội dung đề Nháp khi nhập lại phải giữ chính sách xóa mềm và mọi FK lịch sử; không dùng DELETE hàng loạt để vượt trigger. Đề Nháp từng được làm vẫn phải tuân Q05.
- Gộp từ theo `(Lemma, PosCode)`; xung đột nghĩa là cảnh báo cần lựa chọn rõ ràng, không âm thầm ghi đè từ điển. Nơi xuất hiện và ví dụ ghi ở `VocabularyContext`.
- Tách lỗi do database ép và lỗi đầy đủ nội dung lúc xuất bản. `sp_PublishExam` là điểm kiểm tra cuối, trả đủ vấn đề; các API sửa nội dung không được làm đề `PUBLISHED` mất hợp lệ ngoài chính sách Q05.

## 8. Yêu cầu phi chức năng đề xuất cho MVP

Đây là đầu vào cho Phase 9 của quá trình phân tích trong tài liệu nguồn, được hoàn thiện tại P00-03. Các con số dưới đây là **mục tiêu dự kiến**, chưa phải cam kết đã được nghiệm thu.

| Mã | Mục tiêu/biện pháp | Cách kiểm chứng |
|---|---|---|
| NFR-01 | Access token JWT kiểm tra chữ ký/issuer/audience/hạn; refresh token kiểm tra hash, hạn dùng và trạng thái thu hồi; role/owner tại API; kiểm tra `Users.Status` trên request được bảo vệ để tài khoản khóa bị từ chối ngay | Test token sai/hết hạn, refresh token sai/hết hạn/đã thu hồi, tài khoản khóa sau khi cấp token, gọi chéo role/owner |
| NFR-02 | Mật khẩu qua cơ chế băm chuẩn; access token ngắn hạn, refresh token có hạn dùng và được xoay vòng/thu hồi; secret nằm ngoài mã nguồn; tái xác thực không làm mất trạng thái bài dài | Test đăng ký/đăng nhập/refresh/logout, rà cấu hình, kiểm tra bài dài qua thời điểm access token hết hạn |
| NFR-03 | HTML bài đọc/ngữ pháp được lọc; upload chặn sai loại/đường dẫn; CORS chỉ cho origin được cấu hình; giới hạn tần suất auth/upload | Test payload HTML nguy hiểm, file giả định dạng, đường dẫn vượt thư mục, cấu hình môi trường |
| NFR-04 | Với tải dự kiến 50 người học đồng thời, p95 lưu đáp án ≤ 500 ms, truy vấn thông thường ≤ 1 giây; không tính tải media và import | Đo trên staging với cấu hình, cỡ dữ liệu và kịch bản tải được ghi lại; điều chỉnh mục tiêu sau P00 |
| NFR-05 | Tự nộp dự kiến trong vòng 5 giây sau hạn; không nhận đáp án sau hạn dù tác vụ nền chưa chốt; reconnect/restart không kéo dài giờ thi | Test bằng đồng hồ có thể điều khiển và test worker thật trên staging |
| NFR-06 | Giới hạn file, số dòng Excel, timeout, phân trang và số câu BANK đều cấu hình được; chọn ngưỡng sau khi có mẫu thật | Test sát ngưỡng/vượt ngưỡng, API không tải toàn ngân hàng để đếm thẻ |
| NFR-07 | Log có trace ID, attempt/import ID và lỗi tự nộp; không ghi mật khẩu, JWT hoặc đáp án đúng vào log client | Theo dõi một luồng lỗi từ request tới log; kiểm tra response/log theo mode |
| NFR-08 | Có health check, triển khai lặp lại được, sao lưu cả SQL và media; đề xuất RPO 24 giờ, RTO 4 giờ cho MVP | Khôi phục thử lên môi trường sạch và ghi thời gian/mốc dữ liệu khôi phục |
| NFR-09 | Lưu UTC; thống nhất ngày học và hiển thị theo múi giờ; giao diện hỗ trợ tiếng Việt, AltText ảnh và thao tác bàn phím phù hợp | Test qua nửa đêm UTC/giờ học, chuỗi tiếng Việt, đọc ảnh lỗi và thao tác trên player/form |

Môi trường gồm Development, Staging và Production với cấu hình/secret tách riêng. CI khi có repository chạy build, test có ý nghĩa và kiểm tra script trên SQL Server thử nghiệm; không chạy kiểm tra phá dữ liệu trên database dùng thật.

## 9. Lộ trình và danh sách công việc

Mã `P00–P10` là giai đoạn triển khai trong kế hoạch này, khác các Phase 5–10 của quá trình phân tích trong tài liệu gốc. Trạng thái từng task được cập nhật theo đợt làm việc; bằng chứng và việc tiếp theo ghi tại mục 15.

Luồng chính: **P00 → P01 → P02 → P03 → P04 → P05 → P06 → P07 → P08 → P09 → P10**. P04/P09 có thể thực hiện sớm khi phần nền tảng liên quan đã đạt; không bắt buộc chờ module không phụ thuộc. Kiểm thử và cập nhật tài liệu nằm trong từng task, P10 tập trung kiểm tra toàn hệ thống.

### P00 — Hoàn thiện phạm vi, NFR và hợp đồng kỹ thuật

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P00-01 | Lập danh sách DEP-01–05, kiểm tra đầu vào thực có; xác định môi trường SQL và nơi chứa frontend | Khảo sát hiện trạng | IN_PROGRESS — đã kiểm tra SQL Server localhost/ToeicDb và hai bảng auth; còn inventory TOEIC/frontend |
| P00-02 | Giải quyết issue/ASM cần cho đợt đầu; chốt bảng Mode/Scope, điều kiện điểm, chỉnh sửa nội dung và ma trận thời gian; phần chưa chốt ghi chủ thể xử lý và mốc phụ thuộc | Mục 5 | TODO |
| P00-03 | Lập NFR, ADR kiến trúc/xác thực/media/trạng thái bài làm và hợp đồng API; ghi phiên bản thư viện, policy thời gian, sơ đồ màn hình tích hợp | P00-01, 02 theo phần liên quan | IN_PROGRESS — ADR-001, phong cách UserApi và hợp đồng auth đã ghi; còn media/trạng thái bài làm/frontend |

**Cổng nghiệm thu G00:** mỗi task sắp triển khai có đầu vào, tiêu chí và quyết định cần thiết; vấn đề mở còn lại có mã và phạm vi phụ thuộc rõ. Tài liệu kế tiếp dự kiến: `TOEIC_NFR_v1.0.md`, `TOEIC_Architecture_v1.0.md`, `TOEIC_API_Spec_v1.0.md` trong `Hướng dẫn`; đây là đầu ra tương lai, chưa được tạo trong lần lập kế hoạch.

### P01 — Nền tảng ứng dụng, schema và seed

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P01-01 | Tiếp nhận/tái tạo 4 script, tạo database sạch trên SQL Server thật; đối chiếu 31 bảng, 5 view, procedure và 12 trigger | DEP-01, 04; P00-03 | IN_PROGRESS — 13/11 đã gộp CHG-003/005/006 vào bộ bốn file hiện có ở Docs/DATABASE; đợt CHG-003/005 có 67 kiểm tra SQL Server đạt cho tạo mới/nâng cấp/chạy lại, đã xóa script rời; nghiệm thu toàn bộ G01 vẫn còn |
| P01-02 | Cấu trúc module, kết nối/ánh xạ DB, xử lý lỗi, DI, cấu hình secret, health/OpenAPI; gỡ mẫu WeatherForecast khi có API TOEIC thay thế | P01-01 | IN_PROGRESS — auth có DI/SQL/JWT/ExceptionHandler/CORS/OpenAPI/Swagger UI Bearer; `.env` Development, template an toàn và `.gitignore`, secret không vào publish; DbContext tối giản; còn nền tảng module TOEIC khác |
| P01-03 | Seed danh mục/hướng dẫn/điểm từ nguồn; bootstrap Admin không hard-code mật khẩu; API danh mục và bộ kiểm tra ràng buộc SQL | DEP-02; ISSUE-019/020; P01-01 | IN_PROGRESS — API/seed 7 Part, 4 Level, 119 phân loại, 5 cờ và kiểm tra ràng buộc đã có; còn bảng điểm/từ vựng/nhập hướng dẫn và bootstrap Admin |

**G01:** dựng được môi trường sạch bằng hướng dẫn; đúng FK ghép/CHECK/unique/quyền xóa; seed đối chiếu 7 Part, 4 Level, 119 phân loại, 5 cờ, 15 chủ điểm, loại từ theo quyết định, 202 dòng quy đổi và 9 hướng dẫn. Kiểm tra procedure/view/trigger trên SQL Server; không chỉ kiểm tra cú pháp hoặc dùng database giả. Admin khởi tạo qua cấu hình an toàn.

### P02 — Xác thực và phân quyền

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P02-01 | Đăng ký, chuẩn hóa email, băm mật khẩu; luôn tạo vai trò LEARNER, chặn tự chọn ADMIN | P01; policy P00 | REVIEW — API/service/repository, DTO validation, UNIQUE chống email trùng đồng thời đã kiểm thử |
| P02-02 | Đăng nhập/JWT access token và refresh token, kiểm tra khóa trên request, phân quyền hai vai trò, hợp đồng tái xác thực phù hợp bài dài | P02-01; Q09 | REVIEW — JWT, me, kiểm tra Status/vai trò mỗi request và cấu hình token đã kiểm thử; tích hợp bài dài ở P08 |
| P02-03 | Refresh/đăng xuất: xoay vòng và thu hồi refresh token, xóa token phía client, xử lý token hết hạn, lỗi auth thống nhất; tài liệu tích hợp cho frontend | P02-02 | REVIEW — refresh/logout/replay/transaction/concurrency đã kiểm thử; đã có hợp đồng frontend, còn tích hợp P06/P08/P10 |

**G02:** UC-01–03 chạy được; email trùng và sai thông tin trả đúng lỗi; tài khoản khóa/access token hết hạn/refresh token sai hoặc bị thu hồi/role sai bị từ chối; không lưu session đăng nhập, không bổ sung màn hình quản lý người dùng V2. Nhánh đăng xuất trong bài được nối và nghiệm thu thêm ở P06/P08.

### P03 — Kho đề, câu hỏi, hướng dẫn và media

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P03-01 | API Admin quản lý bộ đề/đề Nháp, lọc/tìm/phân trang, xóa mềm/khôi phục; danh sách đề xuất bản cho Người học; UC-19/29 | P01, P02 | REVIEW — 16 endpoint thông tin bộ đề/đề theo v1.3; schema catalog đã áp dụng ToeicDb; hợp đồng/bằng chứng ở TOEIC_Exam_API_Implementation.md; nhóm/câu và xuất bản thuộc P03-02–04 |
| P03-02 | Nhóm/câu/đáp án theo 7 Part, phân loại lá, cờ, độ khó, nội dung dùng chung; cho lưu Nháp thiếu nội dung đúng thiết kế | P03-01; ISSUE-021 | REVIEW — CRUD nhóm và câu/đáp án qua aggregate, sanitizer HTML, schema/seed catalog, 78/78 test tổng qua |
| P03-03 | Upload media; quản trị 9 hướng dẫn, ghi đè theo đề, truy vấn hướng dẫn hiệu lực | P03-02; DEP-03; ADR media | REVIEW — API hướng dẫn/media và URL ký ADMIN; SDK R2 upload/GET/private-read rejection/cleanup thật qua; import hướng dẫn/player theo lượt còn ở P05/P08 |
| P03-04 | Kiểm tra/xuất bản qua procedure, báo đủ lỗi; bảo vệ tính hợp lệ khi sửa đề đã xuất bản/đã có bài làm | P03-01–03; Q05, Q08 | REVIEW — procedure + kiểm tra nhãn app trong transaction, khóa lịch sử kể cả BANK; đề tổng hợp 200 câu/103 nhóm xuất bản qua API. Chưa nghiệm thu import/xuất bản Test_3 thật |

**G03:** tạo được đề đủ 200 câu bằng API và xuất bản; thiếu câu/đáp án đúng/giải thích/độ khó/hướng dẫn/media bắt buộc thì bị từ chối và báo rõ. Kiểm tra cỡ nhóm theo quyết định Q08 và yêu cầu audio/hình Part 1/2 của UC-20, kể cả khi procedure hiện có chưa kiểm tra hết. Bản hướng dẫn riêng xóa mềm thì dùng lại mặc định; đề Nháp/xóa không xuất hiện ở luồng luyện mới.

### P04 — Từ vựng và ngữ pháp

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P04-01 | Từ điển, chủ đề, quan hệ và ngữ cảnh; khôi phục từ đã xóa, tránh trùng `(Lemma, PosCode)` | P01, P02; ISSUE-014 | TODO |
| P04-02 | Nhóm từ N-N, sắp xếp/gỡ từ/xuất bản, API Người học xem và lọc; ví dụ lấy từ `VocabularyContext` | P04-01 | TODO |
| P04-03 | Lưu từ hệ thống hoặc từ tự nhập, kiểm tra nguồn/trùng/owner, tìm/xem/gỡ bộ cá nhân | P04-01; ISSUE-011, ASM-03/14 | TODO |
| P04-04 | Đọc/quản trị bài ngữ pháp của 15 chủ điểm Part 5, lọc HTML và xóa mềm | P01, P02; ISSUE-012 | REVIEW — CHG-009 18/11: API + Admin + trang đọc, một bài/chủ điểm (ISSUE-012), khung 5 phần; 47 kiểm tra repository/service trên SQL thật (rollback) |

**G04:** UC-15–18, 23–25 đạt theo phạm vi đã chốt; một từ dùng nhiều nhóm; gỡ khỏi nhóm không mất từ; bộ cá nhân không sao chép từ hệ thống và không lưu trùng; bài ngữ pháp có hiệu lực ngay sau lưu theo UC-25.

### P05 — Nhập Excel và chuẩn bị dữ liệu nghiệm thu

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P05-01 | Parser và báo cáo kiểm tra đề: ranh giới nhóm, cột nhóm/câu, Part, cỡ nhóm, danh mục/đáp án/translation | P03; DEP-02; Q08 | IN_PROGRESS — đã kiểm kê Test_1 bằng script read-only; 200 câu/103 nhóm/562 cặp từ, đủ media; chờ duyệt chuyển bố cục cũ và giải thích đáp án trước parser import |
| P05-02 | Xác nhận nhập đúng file, transaction toàn bộ, nhập lại đề Nháp theo xóa mềm; bù trừ file khi rollback | P05-01; Q05 | REVIEW — E35/E36 lưu nguyên transaction SQL, giữ ID/xóa mềm; media tải sau commit và thử lại từng tệp; xem TOEIC_Exam_Import_API.md |
| P05-03 | Nhập từ vựng/ngữ cảnh và 9 hướng dẫn; lựa chọn xung đột nghĩa; hoàn thiện fixture đề thật và bộ file lỗi | P04, P05-02; DEP-02 | IN_PROGRESS — vocab/ngữ cảnh và clip đã lưu/đọc lại; từ chối nghĩa gốc mâu thuẫn; UI quản lý hướng dẫn; chưa có parser Excel hướng dẫn và chưa nhập hai file nguồn còn lỗi |

**G05:** UC-21 và nhánh import UC-22 đạt; lỗi giữa file hoặc lỗi DB không lưu một phần; lỗi có vị trí dòng/cột; nhập xong vẫn Nháp. Thử được một bộ dữ liệu thật đủ Part, bảng điểm và hướng dẫn, không chỉ fixture tổng hợp. Chưa triển khai nhập clip V2.

### P06 — Luyện tập, chấm điểm, kết quả và lịch sử

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P06-01 | Tạo Attempt PRACTICE/PART nhiều Part, tạo sẵn đáp án, tải nhóm, bỏ dở và kiểm tra owner | P03, P04; Q03, ASM-02 | TODO |
| P06-02 | Lưu/chấm ngay, feedback/giải thích/từ vựng, nghe lại, hướng dẫn tùy chọn, transaction cập nhật tiến độ | P06-01; ISSUE-030, Q10 | TODO |
| P06-03 | Chốt bài, view thống kê Part, quy đổi đủ kỹ năng, `StudyDay`, chống nộp lặp | P06-02; seed điểm P01-03; Q04, Q06 | TODO |
| P06-04 | Kết quả/xem lại PRACTICE, lọc đúng/sai/chưa làm, lịch sử và ẩn lịch sử; đọc nội dung xóa mềm qua quyền chủ sở hữu | P06-03; Q05 | TODO |

**G06:** UC-05, 10–13 chạy trọn luồng; chọn một Part chỉ có số đúng, chọn đủ một/hai kỹ năng quy đổi đúng. Không tạo tiến độ cho câu chưa trả lời; bỏ dở giữ tiến độ, không có điểm quy đổi; nộp lặp không cộng ngày học hai lần. Nội dung dùng cho EXAM sẽ có DTO/quyền riêng tại P08.

### P07 — Ngân hàng Part 5 và tiến độ thẻ

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P07-01 | Thẻ 4 Level/4 nhóm cha Part 5; đếm chưa luyện và câu sai từ `UserQuestionProgress`, lọc đề hợp lệ | P06; Q07, ASM-13 | TODO |
| P07-02 | Tạo lượt BANK chưa luyện/ôn sai/làm lại; giới hạn và chọn câu theo chính sách đã chốt | P07-01; ISSUE-029 | TODO |
| P07-03 | Reset tiến độ đúng phạm vi thẻ, giữ lịch sử; xử lý thẻ giao nhau, lượt đang mở và request đồng thời | P07-02; Q10 | TODO |

**G07:** UC-06–08 đạt; làm đúng câu từng sai thì giảm số sai; reset ở thẻ tác động đúng các câu thuộc thẻ, kể cả số đếm ở thẻ khác cùng chứa câu đó; không dựng lại tiến độ đã xóa từ lịch sử. MVP không mở BANK Part 6/7 hoặc khóa PRO.

### P08 — Luyện thi với trạng thái và thời gian máy chủ

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P08-01 | EXAM FULL/LISTENING/READING/PART, đề xuất/tự đặt giờ, trạng thái hướng dẫn và các hạn giờ theo Q01 | P06; Q01–03; ASM-07/08 | TODO |
| P08-02 | Thứ tự câu/nhóm, chặn quay lại, audio theo lượt và tự chuyển; DTO giấu đáp án/giải thích; quy tắc Reading theo nhóm | P08-01; DEP-03; ISSUE-017/031 | TODO |
| P08-03 | Tự nộp bằng worker, reconnect/heartbeat/restart, bỏ dở/lỗi audio/nộp lỗi; xử lý nhiều tab và token hết hạn | P08-02; Q02, Q09 | IN_PROGRESS — CHG-009 18/11: `AttemptAutoSubmitWorker` tự nộp lượt quá hạn (truy vấn đã kiểm trên SQL thật); còn heartbeat/nhiều tab |
| P08-04 | Tổng kết EXAM, chặn mọi đường xem lại chi tiết, hoàn thiện hồi quy chấm điểm/lịch sử và thời gian | P08-03 | TODO |

**G08:** UC-04, 09 và nhánh EXAM của UC-10–13 đạt cả bốn lựa chọn. Hướng dẫn không trừ giờ, Reading đủ kỹ năng đúng 75 phút, Listening chuyển đúng lịch; mất mạng/restart không gia hạn; worker nộp được khi không có client; submit/answer cùng sát hạn không làm sai kết quả. EXAM không cập nhật tiến độ câu, không trả chi tiết qua API xem lại hoặc endpoint phụ.

### P09 — Báo cáo và hoàn thiện quản trị nội dung

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P09-01 | Gửi report cho câu/từ/bài ngữ pháp; đúng một đối tượng, chống trùng chưa xử lý, mô tả bắt buộc khi OTHER | P02, P03, P04; ASM-05/06 | REVIEW — CHG-009 18/11: 4 loại đối tượng (thêm bài ngữ pháp, bộ clip), chống trùng theo nội dung kể cả đồng thời (409 thay 500); có nút ở mọi nơi trừ Luyện thi |
| P09-02 | Admin lọc/xử lý/ghi chú/từ chối/đóng hàng loạt, liên kết sửa nội dung, xử lý đối tượng đã xóa mềm | P09-01 | IN_PROGRESS — CHG-009 18/11: lọc/xử lý/ghi chú, liên kết sửa (đề, bài ngữ pháp, bộ clip), đánh dấu nội dung đã xóa; còn đóng hàng loạt và liên kết sửa từ vựng (cần UC-23) |

**G09:** UC-14, 26 đạt; request đồng thời không tạo report đang mở trùng; sửa nội dung tuân Q05; gắn report cho clip chỉ kích hoạt khi vào V2.

### P10 — Tích hợp, nghiệm thu và bàn giao MVP

| Task | Nội dung/đầu ra | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P10-01 | Kết nối frontend Người học/Admin, xử lý auth, player, giờ hiển thị, lỗi lưu, ngăn thao tác trái trạng thái | DEP-05; API tương ứng; hoàn tất trước G10 | TODO |
| P10-02 | Hồi quy toàn MVP, kiểm tra SQL Server/concurrency/tải; đóng lỗi ngăn nghiệm thu và đối chiếu UC/BR | P01–09 và P10-01 | TODO |
| P10-03 | Hướng dẫn dựng môi trường, cấu hình, migration/rollback, sao lưu/khôi phục SQL và media, theo dõi lỗi và checklist phát hành | P10-02 | TODO |
| P10-04 | Demo theo kịch bản, ghi phản hồi/biên bản nghiệm thu, cập nhật phạm vi còn lại và backlog V2 | P10-03 | TODO |

**G10:** hệ thống chạy được từ tài khoản mới đến học/luyện và xử lý báo cáo trên giao diện; các kiểm tra bắt buộc đạt; NFR đã chốt có kết quả đo; khôi phục thử thành công; tài liệu/API khớp triển khai. Chỉ coi MVP đã bàn giao khi có kết quả nghiệm thu của người dùng; backend hoàn tất riêng chưa đồng nghĩa toàn hệ thống hoàn tất.

## 10. Công việc frontend và tích hợp hệ thống

Frontend cần có người/repository phụ trách trước khi ước lượng ngày hoàn thành toàn hệ thống. Có thể làm từng màn hình khi hợp đồng API tương ứng ổn định; dùng mock có cùng DTO cho phần chưa có backend, rồi thay bằng API thật.

| Cụm màn hình | Yêu cầu tích hợp/điểm kiểm tra | API sẵn từ |
|---|---|---|
| Đăng ký/đăng nhập | Lỗi theo trường, điều hướng role, token hết hạn/đăng xuất | P02 |
| Admin đề và nội dung | Form theo Part, Nháp/Xuất bản, danh sách lỗi, media/hướng dẫn, xóa mềm/khôi phục | P03 |
| Từ vựng/ngữ pháp | Nhóm, tra cứu, bộ cá nhân, bài viết và form Admin | P04 |
| Nhập Excel | Chọn file, preview lỗi/cảnh báo, lựa chọn xung đột, xác nhận đúng file | P05 |
| Luyện tập/kết quả/lịch sử | Nhóm dùng chung nội dung, feedback tức thời, trạng thái đang gửi/lưu thất bại, lọc xem lại | P06 |
| Ngân hàng | Thẻ Level/chủ điểm, số đếm, chưa luyện/ôn sai/làm lại, xác nhận reset | P07 |
| Luyện thi | Hộp chọn chế độ, xác nhận quy chế, hướng dẫn, player, đồng hồ theo server, reconnect và tổng kết | P08 |
| Báo cáo | Form báo lỗi, danh sách/xử lý cho Admin | P09 |

Trình duyệt hiển thị giờ từ mốc do server cấp và đồng bộ lại khi reconnect; không tự quyết định bài còn hạn. Player phải kiểm tra hành vi autoplay trên trình duyệt/thiết bị đích và có thao tác bắt đầu hợp lệ trước khi ghi nhận lượt phát. Chốt breakpoint, luồng nhóm nhiều câu và điều khiển bàn phím trong hợp đồng UI, tránh để frontend tự suy quy tắc thi.

## 11. Chiến lược kiểm tra và ma trận nghiệm thu

Ưu tiên test quy tắc có rủi ro và luồng tích hợp. Test thuần cho tính điểm, lọc phạm vi và thời gian bằng đồng hồ điều khiển được; test tích hợp trên **SQL Server thật** cho transaction, FK/unique/CHECK/view/procedure/trigger và cạnh tranh ghi. Kiểm tra qua API/giao diện cho quyền truy cập, DTO và trọn luồng. Không dùng test phản chiếu từng dòng cài đặt hoặc thêm test cho mỗi sửa tài liệu.

| Mã kiểm tra | Kịch bản tối thiểu | Truy vết | Cổng |
|---|---|---|---|
| T01 | Email trùng/đăng ký tự cấp ADMIN; token sai/hết hạn; tài khoản khóa; truy cập sai role/owner | UC-01–03; BR-01–04, 18 | G02; hồi quy G10 |
| T02 | Sai Part phân loại/cờ, câu khác đề với nhóm, chọn option câu khác, vi phạm unique | BR-19, 21, 23; DB mục 7 | G01, G03, G06 |
| T03 | Xuất bản đủ 200 câu; thiếu từng loại dữ liệu; nhóm rỗng/sai cỡ; đúng một đáp án đúng; Part 2 không có D | UC-19, 20; BR-08, 20 | G03 |
| T04 | Ưu tiên hướng dẫn riêng, fallback khi xóa bản riêng, thiếu một trong 9 mục, gửi lặp kết thúc hướng dẫn | UC-09, 22; BR-25, 27 | G03, G08 |
| T05 | Import hợp lệ, sai dòng đầu/nhóm, lỗi cuối file, xung đột từ, nhập lại Nháp, rollback SQL/file | UC-21; BR-17, 19, 21, 24 | G05 |
| T06 | Từ trùng và khôi phục; thiếu CEFR; nhiều nhóm dùng một từ; lưu/gỡ từ cá nhân và truy cập chéo user | UC-15–17, 23, 24; BR-13, 14, 24 | G04 |
| T07 | 15 chủ điểm Part 5, thêm/sửa/ẩn bài, nội dung HTML được lọc; Part 6 không gán ngữ pháp | UC-18, 25; BR-06, 17 | G04 |
| T08 | PRACTICE chấm ngay, nghe lại, giữ đáp án khi lưu lỗi/bỏ dở; không tính câu chưa trả lời là đã luyện | UC-05; BR-11, 26 | G06 |
| T09 | Điểm tại 0/100 câu đúng mỗi kỹ năng; bài 200 câu; chọn đủ 1–4 hoặc 5–7; bài lẻ và BANK không quy đổi | UC-10; BR-05, 07 | G06, G08 |
| T10 | Đúng/sai gần nhất, ôn sai/làm lại, giới hạn lượt, reset thẻ giao nhau nhưng giữ lịch sử; request cũ sau reset | UC-06–08; BR-26 | G07 |
| T11 | Bốn scope EXAM, nhiều Part/tự đặt giờ, Reading không có timeout từng câu, audio tự chuyển, không quay lại | UC-04; BR-10, 28 | G08 |
| T12 | Mất mạng, đóng tab theo chính sách, restart, nhiều tab, hết giờ không có request; nộp tay/tự nộp/đáp án sát hạn | UC-04 E1–E4; BR-12, 27 | G08 |
| T13 | EXAM không lộ đáp án/giải thích/transcript qua response hoặc xem lại; không cập nhật tiến độ câu; không báo lỗi/lưu từ theo ASM-06 | UC-04, 11, 12; BR-09, 26 | G08 |
| T14 | Lịch sử chỉ của chủ sở hữu, ẩn lịch sử giữ tiến độ; xem lại PRACTICE đã nộp khi nội dung xóa mềm | UC-11–13; BR-12, 17 | G06, G08 |
| T15 | Report đúng đối tượng, OTHER cần mô tả, chống trùng đồng thời, cập nhật/đóng hàng loạt và đối tượng đã ẩn | UC-14, 26; BR-15 | G09 |
| T16 | DELETE nội dung bị từ chối, gỡ liên kết/personal đúng ngoại lệ; MVP không có chức năng xóa tài khoản Admin | BR-16, 17; DB mục 7.4 | G01, G10 |
| T17 | Submit lặp không nhân `StudyDay`, ngày học qua nửa đêm; không ghi tiến độ clip sai đối tượng | UC-10; Q06; NFR-09 | G06, G10 |
| T18 | Tải 50 người học theo mục tiêu đã chốt, upload sai, HTML, CORS; backup/restore đồng bộ SQL/media | NFR-03–09 | G10 |

Mỗi kết quả kiểm tra ghi môi trường, dữ liệu/phiên bản script, lệnh hoặc bước chạy, kết quả và lỗi còn lại. Không ghi “đã kiểm thử” khi mới có thiết kế test hoặc chỉ build thành công.

## 12. Ước lượng và cách sắp xếp nguồn lực

Ước lượng ban đầu cho **một lập trình viên backend**, đã tính kiểm tra/tài liệu trong từng giai đoạn, với đầu vào được cung cấp kịp thời. Đây là khoảng công sức, chưa phải lịch cam kết; xác nhận lại sau P00 và sau khi hoàn thành P05/P08 vì hai phần này có nhiều rủi ro.

| Giai đoạn | Ngày công backend dự kiến | Kết quả chính |
|---|---:|---|
| P00 | 3–5 | Phạm vi/NFR/ADR/API và phụ thuộc |
| P01 | 3–5 | Nền tảng + database thật + seed |
| P02 | 2–3 | Xác thực và phân quyền |
| P03 | 4–6 | Quản trị đề/hướng dẫn/media và xuất bản |
| P04 | 4–6 | Từ vựng và ngữ pháp |
| P05 | 4–6 | Import và dữ liệu nghiệm thu |
| P06 | 4–6 | Luyện tập, chấm điểm, kết quả/lịch sử |
| P07 | 2–4 | Ngân hàng Part 5 |
| P08 | 6–9 | Luyện thi và phục hồi trạng thái |
| P09 | 2–3 | Báo cáo nội dung |
| P10 | 4–6 | Hỗ trợ tích hợp, kiểm tra cuối và bàn giao |
| **Tổng** | **38–59** | Chưa gồm công xây frontend, nhập/biên tập nội dung thực tế và thời gian chờ đầu vào |

Với tuần 5 ngày làm việc, tổng tương đương khoảng 8–12 tuần backend; dự phòng 20% cho phần chưa rõ thành khoảng 46–71 ngày công, xấp xỉ 10–15 tuần. Chưa thể hứa ngày hoàn thành toàn hệ thống khi chưa có nguồn lực frontend và môi trường triển khai. Ước lượng frontend/UI được bổ sung sau DEP-05; P10 chỉ gồm phần backend hỗ trợ tích hợp.

Vai trò cần được phân công: người dùng chốt nghiệp vụ/nghiệm thu; backend triển khai API/DB/job; frontend triển khai hai khu giao diện; người kiểm tra thực hiện ma trận UC/BR; người vận hành quản lý môi trường/backup. Một người có thể kiêm nhiệm nhiều vai trò. Đây là phân công công việc dự kiến, không yêu cầu sử dụng nhiều agent.

## 13. Rủi ro và phương án xử lý

| Rủi ro | Tác động | Hành động ưu tiên |
|---|---|---|
| Thiếu SQL/CSV/Excel/media thật | Không thể xác nhận schema, điểm và import đúng nguồn | P00-01 lập inventory; dùng fixture có nhãn cho phần độc lập; chỉ nghiệm thu dữ liệu thật khi có nguồn |
| Đồng hồ và trạng thái server chưa có mô hình đầy đủ | Sai hạn giờ, mất vị trí hoặc nộp nhiều lần | Chốt Q01–03 trước phần lõi; lưu bền vững, worker phục hồi, test bằng giờ điều khiển được |
| Sửa đáp án/nội dung làm biến đổi lịch sử | Kết quả và xem lại không nhất quán | Q05 trước API sửa đề có lượt làm; nếu cần versioning/snapshot thì có thay đổi dữ liệu được ghi nhận |
| Import lớn, lỗi giữa chừng, file ngoài transaction | Dữ liệu/file dở dang hoặc ghi đè nghĩa từ | Preview/xác nhận đúng file, transaction, vùng lưu tạm và dọn file; không overwrite xung đột ngầm |
| Tăng scope sang clip/PRO/AI | Trễ MVP | Giữ bảng phạm vi; thay đổi qua nhật ký và ước lượng lại, clip đầu V2 |
| SQL giả lập khác SQL Server | CHECK/trigger/procedure không chạy như thiết kế | G01/G05/G08 kiểm tra trên SQL Server thật và tài khoản ứng dụng thực |
| Frontend chưa có đầu mối hoặc tự suy quy tắc | Backend xong nhưng hệ thống chưa dùng được | DEP-05, hợp đồng DTO/màn hình sớm và tích hợp từng module |
| JWT hết hạn giữa bài, trình duyệt chặn autoplay | Ngắt luồng thi hoặc ghi nhận sai lượt phát | Q09, kiểm tra player/trình duyệt đích và phục hồi trạng thái không gia hạn đồng hồ |

## 14. Quy ước hoàn thành và cập nhật tài liệu

### 14.1. Trạng thái công việc

- `TODO`: chưa triển khai.
- `IN_PROGRESS`: đang thực hiện, ghi bước hiện tại.
- `BLOCKED`: task có phụ thuộc cụ thể đang thiếu; ghi mã issue/DEP và tiếp tục task độc lập được.
- `REVIEW`: đã có kết quả triển khai và kiểm tra kỹ thuật, chờ rà soát/nghiệm thu theo phạm vi task.
- `DONE`: đạt tiêu chí, có bằng chứng kiểm tra và kết quả chấp nhận tương ứng; không đổi sang DONE chỉ vì đã viết mã hoặc tài liệu nguồn ghi DONE phần thiết kế.

Trạng thái này theo từng task, không yêu cầu xin xác nhận trước mọi thao tác kỹ thuật. Việc nghiệm thu nghiệp vụ tuân quyết định của người dùng; ghi nhận xác nhận đã có, không hỏi lặp.

### 14.2. Tiêu chí hoàn thành một task

1. Đúng UC/BR và phạm vi, xử lý luồng chính cùng nhánh lỗi liên quan.
2. Build thành công nếu sửa mã; kiểm tra có ý nghĩa cho rủi ro thay đổi đã chạy và ghi kết quả. Với sửa tài liệu, kiểm tra nội dung/liên kết/truy vết thay cho chạy test ứng dụng không liên quan.
3. API có DTO/lỗi/phân quyền phù hợp; thay đổi DB có script và đối chiếu thiết kế, không mất ràng buộc.
4. Không lộ đáp án, token, secret hoặc cho truy cập dữ liệu người khác; không làm sai chính sách xóa mềm/lịch sử.
5. Cập nhật kế hoạch, API/ADR/schema liên quan và ghi hạn chế thực tế. Nêu task tiếp theo có thể thực hiện.

### 14.3. Mẫu ghi nhận công việc

```text
Task: Pxx-yy — Tên công việc
UC/BR: ...
Trạng thái: TODO / IN_PROGRESS / BLOCKED / REVIEW / DONE
Đầu vào và quyết định đã áp dụng: ...
Thay đổi: ...
Kiểm tra: lệnh/bước, môi trường, kết quả, bằng chứng
Hạn chế/phụ thuộc còn lại: ...
Kết quả rà soát/nghiệm thu đã có: ...
Việc tiếp theo: ...
```

Quy tắc bảo trì: cập nhật task ở mục 9 và nhật ký ở mục 15 sau mỗi đợt làm; ghi thay đổi phạm vi bằng mã `CHG-xxx`, thay đổi kỹ thuật đáng kể bằng `ADR-xxx`. Nếu thay đổi nghiệp vụ/schema, cập nhật hoặc lập phiên bản mới của tài liệu nguồn cùng liên kết; không để chỉ kế hoạch biết về thay đổi đó.

File này là điểm vào chuẩn hiện tại. Khi nâng phiên bản kế hoạch, ghi tài liệu thay thế và cập nhật đường dẫn trong `AGENTS.md` để các công việc sau không đọc nhầm bản cũ.

## 15. Trạng thái tổng thể, nhật ký và việc tiếp theo

### Bài ngữ pháp, báo lỗi mở rộng, tự nộp bài hết giờ, clip nghe sưu tầm — CHG-009, 18/11/2026

Theo yêu cầu người dùng ("hoàn thiện UC-25 → UC-18, UC-14, UC-04, UC-28"):

- **UC-25 → UC-18 (P04-04):** ánh xạ `GrammarArticle`. Theo quyết định của người dùng, **mỗi chủ điểm một bài** (lý thuyết, cấu trúc, ví dụ mẫu, bài tập mẫu, mẹo TOEIC), thêm index `UX_GrammarArticle_Topic`. Admin soạn theo 15 chủ điểm với khung 5 phần điền sẵn (lọc HTML, xóa mềm, khôi phục). Người học đọc bài của chủ điểm (mục lục các phần, đáp án bài tập ẩn; cần đăng nhập; "Đang cập nhật" khi chưa có bài).
- **UC-14 (P09-01):** báo lỗi thêm bài ngữ pháp và bộ clip Nghe chép, có nút cho từ vựng. Sửa lỗi 500 khi báo khác loại lỗi cho cùng nội dung: nay chống trùng theo nội dung, đúng BR-15 / `UX_Report_Open`. Màn Báo lỗi của Admin hiện tên nội dung, liên kết tới màn sửa, đánh dấu nội dung đã xóa.
- **UC-04 (P08-03):** `AttemptAutoSubmitWorker` tự nộp lượt quá hạn. Cấu hình `Learning:AutoSubmit*`, đặt `IntervalSeconds = 0` để tắt.
- **UC-28 TH2:** quản trị bộ clip sưu tầm (phân loại lá đúng Part và Level bắt buộc khi xuất bản, clip theo vai trò Part, audio, xuất bản/ẩn, xóa mềm). Bộ clip đã xuất bản hiện ở Nghe chép (mục "Clip sưu tầm" và bộ lọc chủ đề).

Schema: chỉ thêm index `UX_GrammarArticle_Topic` vào `01_schema.sql` (chạy lặp an toàn).

Kiểm chứng:
- 47/47 kiểm tra repository/service trên `ToeicDb_test_v1` (ghi trong transaction rồi rollback, database không đổi).
- Build backend 0 warning/0 error.
- FE người học: 88 unit test; Chromium/API giả `check-learner-ui` (thêm 2 bước) và `check-vocab-ui` đạt.
- Admin: 66 unit test; `check-admin-content` (mới) và `check-admin-navigation` đạt.

Trạng thái REVIEW. Tiếp theo:
- chạy lại `01_schema.sql` để tạo `UX_GrammarArticle_Topic`, rồi khởi động lại backend;
- kiểm tra HTTP có token và upload R2 thật cho audio clip sưu tầm;
- UC-26 đóng hàng loạt;
- xác nhận bộ clip sưu tầm có cần khóa VIP không.

Chi tiết ở [CONTENT_FEATURES_2026-11-18.md](CONTENT_FEATURES_2026-11-18.md).

### Lịch sử VIP, cấp VIP có lý do, người dùng tự sửa hồ sơ — CHG-008, 18/11/2026

Theo yêu cầu người dùng:

- bỏ JSON `UserDto` và hạn token khỏi trang Tài khoản;
- người dùng tự sửa thông tin của mình (`PUT /api/auth/me`, chỉ tên hiển thị), quản trị viên không sửa được hồ sơ người khác;
- VIP do Admin cấp không ghi vào lịch sử thanh toán.

Đã làm:

- **Bảng `VipHistory`** (phần F của `01_schema.sql`) ghi mọi lần mua gói, quản trị viên tặng hoặc thu hồi VIP.
- **API cấp VIP mới:** `PUT /api/admin/vip/users/{id}` nhận `{ action, days, reason }`, cộng nối tiếp hạn hiện tại và bắt buộc lý do.
- **API lịch sử:** `GET /api/vip/history` cho người học (không có lý do nội bộ) và `GET /api/admin/vip/users/{id}/history` cho quản trị viên.

Chi tiết và bằng chứng ở [VIP_HISTORY_2026-11-18.md](VIP_HISTORY_2026-11-18.md).

**Kiểm chứng:** API thật trên bản sao `ToeicDb_Test_v1` (database tạm, đã xóa sau khi thử):

- 8 nhóm kiểm tra đạt, gồm IPN VNPay có chữ ký;
- trường hợp thiếu bảng: thanh toán vẫn chạy, API lịch sử trả 503.

**Trạng thái:** REVIEW.

**Tiếp theo:** chạy `01_schema.sql` (phần F) trên database thật khi người dùng xác nhận, rồi triển khai backend mới.

### Luyện thi xem đáp án sau khi nộp — sửa BR-09, 17/11/2026

Theo yêu cầu người dùng: sau khi nộp Luyện thi, trang kết quả hiện bảng đáp án (đáp án đúng, lựa chọn sai, bỏ trống) và mở được đáp án chi tiết kèm giải thích. Khi đang làm vẫn không lộ đúng/sai (R04/T13 giữ nguyên trong lúc thi). `Learning:AllowExamReview` đổi mặc định sang `true`; `QuestionResultDto` thêm `SelectedLabel`, `CorrectLabel`; khi tắt, `questions` trả `null` (trước là mảng rỗng). Kiểm: build backend, FE lint/test/build, `check-learner-ui.mjs` (**mock**). Chưa kiểm với backend và database thật.

Cùng ngày: Luyện tập có tùy chọn **Hiện đáp án ngay** (mặc định bật, lưu trên máy). Tắt thì `PUT .../answers/{q}` gửi `reveal = false`: chỉ lưu lựa chọn (đổi/bỏ được, `IsCorrect` null), người học bấm "Xem đáp án" từng câu hoặc "Xem đáp án các câu đã chọn" để chấm mà không cần nộp; câu chưa xem được chấm và ghi tiến độ khi nộp. Khóa câu Luyện tập đổi từ "đã chọn" sang "đã chấm" (`IsCorrect` khác null); dữ liệu cũ luôn có `IsCorrect` nên không đổi hành vi. Không đổi schema.

### Cá nhân hóa người học và kiểm tra đầu vào — CHG-007 / CR-006, 17/11/2026

Theo yêu cầu người dùng: kiểm tra đầu vào do Admin thiết lập trong trang quản trị, tính thông tin người học và gợi ý bài học dựa trên nội dung đã chia trong database. Backend: `PlacementTest`/`PlacementTestGroup` (Admin ghép trọn nhóm câu của đề đã xuất bản, gợi ý tự động theo số câu mỗi Part), lượt `Attempt` Scope `PLACEMENT` (EXAM, nội dung gửi kèm, điểm ước tính qua `ScoreConversion` + Level `LevelBand`), `LearnerProfile` (mục tiêu, ngày thi, phút/ngày) và `GET /api/me/learning-plan` (điểm hiện tại, kỹ năng ưu tiên, Level nên luyện, Part/chủ điểm yếu, gợi ý trỏ tới thẻ ngân hàng, nghe chép, từ vựng, thi thử, kế hoạch hôm nay). Database: phần E của `Docs/DATABASE/01_schema.sql`. Frontend người học: trang Lộ trình, trang và màn làm bài kiểm tra đầu vào, khối "Hôm nay nên học" ở Trang chủ; Admin: mục "Kiểm tra đầu vào". Chi tiết, thuật toán và bằng chứng: [PERSONALIZATION_2026-11-17.md](PERSONALIZATION_2026-11-17.md).

Kiểm chứng trên bản sao `ToeicDb_test_v1` (database tạm, đã xóa sau khi thử): script chạy lặp an toàn; 65/65 kiểm tra HTTP đầu-cuối ở bản build cuối; 9/9 kiểm tra chức năng cũ trên database chưa nâng cấp (API mới báo `PERSONALIZATION_SCHEMA_MISSING`); giao diện Chromium với backend thật đạt. Trạng thái REVIEW. Tiếp theo: chạy `01 → 02 → 03` trên database ứng dụng (sửa `USE`), tạo và bật bài kiểm tra trong Admin, theo dõi chất lượng gợi ý với người học thật.

### Hợp nhất tiến độ từ vựng và index hiệu năng — P01-01 / CHG-003 / CHG-005, 13/11/2026

Theo yêu cầu người dùng, hoàn tất hợp nhất hai script rời vào `Docs/DATABASE/01_schema.sql`. Bảng `UserVocabProgress` (A7.2), `StudyDay.VocabReviewCount` (baseline/ALTER), CHECK/DEFAULT/FK và index ôn từ đã có đủ; phần C3 bổ sung 10 index trước đây bị bỏ do chỉ so sánh cột dẫn đầu, nay giữ các khác biệt INCLUDE/bộ lọc/thứ tự khóa. Dùng PK clustered `(GroupId, SpecialTagId)` cho truy vấn tag thay index trùng chức năng; giữ index cũ và chỉ thêm tên chưa có. Ba file `00`, `02`, `03` giữ nguyên. Đã xóa hai script rời, cập nhật tham chiếu/tài liệu và thông báo `VOCAB_SCHEMA_MISSING`; sửa ghi chú cũ sai về tự tạo schema khi khởi động.

Kiểm chứng: 67 kiểm tra đạt trên SQL Server `localhost\SQLEXPRESS`, ba database tạm bao phủ database đã chạy hai script cũ, database thiếu bảng/cột CHG-005 và tạo mới. Metadata cột/DEFAULT/CHECK/FK và index khớp hai script cũ; chạy `01 → 02 → 03` lặp lại giữ mọi giá trị trong Users/Vocabulary/StudyDay/UserVocabProgress/VipPlan, không thêm trùng index. Backend build 0 warning/0 error sau khi đổi thông báo lỗi. Bản sao phục hồi và script kiểm chứng ở `artifacts/chg003-chg005-sql-merge/`; các database tạm đã xóa. Trạng thái đợt hợp nhất: DONE, chưa cập nhật database ứng dụng hoặc nghiệm thu toàn bộ G01/hiệu năng tải đề. Tiếp theo khi triển khai: chọn đúng dòng USE cho database đích, chạy bộ `01 → 02 → 03`, bỏ `00` với database đã có, rồi đo lại Server-Timing trên dữ liệu thực.

### Gộp migration VIP vào bộ bốn file DATABASE — P01-01 / CHG-006, 13/11/2026

Theo yêu cầu người dùng, gộp toàn bộ migration VIP vào `Docs/DATABASE/01_schema.sql`, phần D trước COMMIT; giữ nguyên ba file `00`, `02`, `03`. Giữ đủ sáu cột mới, bảng `VipPlan`/`PaymentOrder`, DEFAULT/CHECK/FK/unique/index và ba gói mặc định, chỉ seed khi bảng trống. Hai index thanh toán kiểm tra tồn tại riêng để bổ sung được nếu bảng đã có. Đã xóa migration VIP rời; bản sao trước thay đổi ở `artifacts/chg006-sql-merge/` để có thể phục hồi.

Kiểm chứng: 63 kiểm tra đạt trên SQL Server `localhost\SQLEXPRESS`, ba database tạm bao phủ tạo mới, schema cũ có dữ liệu và schema đã áp dụng migration VIP cũ. Metadata và seed VIP khớp bản cũ; chạy lặp giữ mọi giá trị trong Users/ExamSet/Exam/VipPlan/PaymentOrder, kể cả quyền VIP, giá gói đã sửa và lịch sử đơn; `01 → 02 → 03` chạy lại thành công. Script: `artifacts/chg006-sql-merge/verify-merge.ps1`. Ba database tạm đã xóa, không chạy cập nhật trên database ứng dụng. Trạng thái đợt gộp: DONE; không nâng trạng thái nghiệm thu toàn bộ CHG-006/G01. Tiếp theo: khi triển khai, chọn đúng `USE` theo database đích, chạy bộ `01 → 02 → 03` trước backend VIP, bỏ `00` với database đã có.

Cập nhật 13/11/2026 — CHG-006 (VIP/VNPay/phân quyền): theo yêu cầu nạp VIP, đã thêm gói VIP, thanh toán VNPay sandbox (đơn PENDING → return/IPN chốt một lần, idempotent), quyền Miễn phí/VIP theo bộ đề cho 4 tính năng riêng (làm đề, từ vựng, Nghe, Đọc) và ghi đè theo đề; Admin chọn Miễn phí/VIP khi nhập đề, quản lý gói/đơn, cấp VIP thủ công; Learner có trang VIP, nhãn khóa và hộp thoại mời nâng cấp (`402 VIP_REQUIRED`). Phần D — CHG-006 trong `Docs/DATABASE/01_schema.sql` **phải chạy trước** khi chạy backend mới (đã gộp và thay thế migration VIP rời). Bằng chứng, đề xuất giá và hạn chế tại [VIP_PAYMENT_2026-11-13.md](VIP_PAYMENT_2026-11-13.md): migration idempotent trên bản sao CSDL; 65 kiểm tra HTTP đầu-cuối, 15 kiểm tra Learner headless, Admin build/59 test/điều hướng đạt; sandbox VNPay chấp nhận URL ký. **Chưa** thanh toán thử bằng thẻ trên giao diện VNPay, chưa chạy migration trên ToeicDb của người dùng, chưa mở giao diện Admin mới trong trình duyệt. Trạng thái REVIEW; tiếp theo: chạy migration, thanh toán thử thẻ NCB, đặt quyền VIP cho bộ đề cần thu phí, chốt giá gói, khai báo IPN khi có domain, xóa file cấu hình sandbox khỏi kho.

### Loại bỏ quyền Admin sửa thông tin người dùng — CHG-002, 13/11/2026

Theo quyết định mới nhất, thông tin cá nhân do chính chủ tài khoản quản lý; Admin không có quyền sửa tên hoặc email của người khác. Đã gỡ nút/hộp thoại “Sửa” khỏi trang quản lý người dùng và hàm gọi tương ứng khỏi Admin client; backend gỡ `PUT /api/admin/users/{id}`, `UpdateUserRequestDto` cùng phương thức service/repository chỉ phục vụ route này. Giữ các quyền quản trị độc lập gồm tạo tài khoản, đổi vai trò, khóa/mở khóa, thu hồi phiên và xem thống kê/lịch sử. Không thay schema hoặc dữ liệu hiện có.

Kiểm chứng: backend build thành công, 0 warning/0 error; OpenAPI bản mới có 87 operation và không còn path `/api/admin/users/{id}`, trong khi `PUT .../{id}/role` và `PUT .../{id}/status` vẫn tồn tại. Admin frontend build thành công, 59/59 test đạt; lint không có lỗi, còn 4 cảnh báo `set-state-in-effect` có sẵn ở `MediaPreview` và `DirectionsView`. Tiến trình backend kiểm tra ở cổng 5107 đã dừng.

### Rà soát và dọn thư mục Docs — P00-01, 13/11/2026

Đã kiểm kê toàn bộ 18 tệp trong `Docs`, đối chiếu liên kết từ kế hoạch, README, tài liệu API và mã nguồn. Xóa `Docs/DATABASE/00_create_database.sql`–`03_seed.sql` vì đây là bộ SQL thứ hai, trái quy ước nguồn duy nhất `../DATABASE`; không sửa hoặc chạy database. Thêm `Docs/README.md` để phân loại tài liệu chuẩn, tài liệu triển khai, bằng chứng thay đổi và quy tắc bảo trì.

Giữ `API_CLEANUP_2026-11-13.md` và `API_OPTIMIZATION_2026-11-13.md` vì báo cáo sau nối tiếp, không chứa toàn bộ bằng chứng của báo cáo trước. Hai script SQL tiến độ từ vựng và index hiệu năng từng được giữ tạm do còn tham chiếu và thiếu bộ `../DATABASE`. **Đã giải quyết trong đợt tiếp sau cùng ngày:** bộ bốn file được cung cấp lại tại `Docs/DATABASE`, CHG-003/CHG-005 được đối chiếu/hợp nhất vào `01_schema.sql`, kiểm chứng trên database riêng và xóa hai script rời; xem nhật ký hợp nhất phía trên.

Cập nhật 13/11/2026 — P03-01–04 / P05-02 / CHG-002 (tối ưu API): theo yêu cầu, danh sách đề và bài tập chuyển sang công khai (13 GET), làm bài/nội dung/tiến độ giữ đăng nhập; gộp 14 operation thành 4 (`me/dashboard`, `modes`+dàn ý, `result?includeReview`, `GET /api/reports`, `GET /api/admin/dashboard`, `PUT …/status` của người dùng và đề); OpenAPI 98 → 88. Làm gọn mã: lớp `ApiControllerBase`, bảng lỗi `ApiErrors` duy nhất, bộ lọc lỗi schema từ vựng, gộp 5 controller, tiện ích `StudyClock`/`CategoryTree`, cache danh mục một nơi, dashboard admin dùng truy vấn tổng hợp. Đồng bộ client Learner/Admin và file `.http`. Bằng chứng, hạn chế và cách áp dụng tại [API_OPTIMIZATION_2026-11-13.md](API_OPTIMIZATION_2026-11-13.md): build 0 warning/error; OpenAPI 88; HTTP smoke công khai 200 và 401 cho endpoint cần đăng nhập; 30 kiểm tra service chỉ-đọc trên CSDL test đạt (số liệu admin trùng cách đếm cũ); Admin build + 59 test + kiểm tra điều hướng đạt. **Chưa chạy** qua HTTP có token và hai API ghi trạng thái (khóa/mở khóa người dùng, xuất bản/gỡ đề). Trạng thái REVIEW; tiếp theo: khởi động lại backend và triển khai hai client cùng lúc, cho Learner duyệt trang danh sách khi chưa đăng nhập (`public: true`), kiểm tra tích hợp có token trên database riêng và cân nhắc rate limit cho endpoint công khai. Đã chốt: `GET /api/vocab/words` vẫn yêu cầu đăng nhập.

Cập nhật 13/11/2026 — P03-01–03 / P05-02 / CHG-002: theo yêu cầu dọn API sau tinh gọn giao diện, đã gỡ 12 operation không có nơi gọi trong hai client hiện tại; giữ hai API danh sách người học và các repository còn dùng cho Excel/media. Đã xóa mapper/9 DTO riêng của exam.v1 và wrapper frontend thừa; phản hồi tạo người dùng/bộ đề vẫn 201/DTO, không tham chiếu action Get đã gỡ. Danh sách, bản sao lưu và bằng chứng tại [API_CLEANUP_2026-11-13.md](API_CLEANUP_2026-11-13.md). Build backend 0 warning/error; OpenAPI mới 98 operation; HTTP smoke 13 operation bị loại (gồm reset mật khẩu đã gỡ trước) và 18 operation cần giữ đạt. Frontend build, 59 unit test và Chromium/API mock đạt. Không chạy SQL/R2 thật hoặc xóa dữ liệu; tiến trình smoke riêng đã dừng. Trạng thái REVIEW; tiếp theo triển khai/khởi động lại backend chính và kiểm tra tích hợp trên database riêng.

Cập nhật 13/11/2026 — CHG-002 / quản trị người dùng: theo quyết định mới nhất, quản trị không được đặt lại mật khẩu người dùng. Đã gỡ endpoint `/api/admin/users/{id}/reset-password`, phương thức service/interface, DTO và luồng UI tương ứng. Không thay đổi các luồng tự đổi/quên/thiết lập mật khẩu của chủ tài khoản. Build `ToeicMind.csproj --no-restore -p:UseAppHost=false -o artifacts/admin-directions-check` đạt 0 warning/error; chưa chạy API/SQL thật cho đợt này. Cần khởi động lại bản backend đang chạy để áp dụng việc gỡ endpoint. Frontend ưu tiên PC, Tổng quan thống nhất và sidebar thu gọn có kiểm tra Chromium/API mock.

Cập nhật 13/11/2026 — P03-03 / UC-09, UC-22: theo yêu cầu mới, mọi đề dùng bộ hướng dẫn chung (`ExamId = null`), thay cho ưu tiên bản riêng. Truy vấn hướng dẫn hiệu lực của Admin và `ExamContentReader` cho người học chỉ lấy bộ chung; bản ghi riêng cũ được giữ nguyên trong database. Admin bỏ bộ chọn đề và thao tác tạo bản riêng, hỗ trợ tải ảnh Part 1. Không thay schema hay tự chạy SQL. Build backend bằng output riêng thành công; chưa chạy tích hợp SQL/R2 thật cho thay đổi này. Bản backend đang chạy cần khởi động lại sau khi triển khai để nhận logic mới. Giữ chính sách khóa sửa hướng dẫn đã được lịch sử sử dụng. Tiếp theo: kiểm thử trên database riêng với bộ chung, bản riêng cũ, media và lượt làm bài.

| Nội dung | Trạng thái cập nhật 27/10/2026 |
|---|---|
| Đọc và đối chiếu hai tài liệu nguồn với mã hiện tại | Đã thực hiện trong lần lập kế hoạch |
| Kế hoạch phát triển và chỉ dẫn đọc kế hoạch ở gốc dự án | Đã lập; chưa đồng nghĩa đã duyệt các issue/ASM |
| P00–P10 / 26 UC MVP | Backend auth UC-01–03 ở REVIEW; phần nền tảng liên quan IN_PROGRESS; module TOEIC khác chưa triển khai |
| SQL Server, seed, Excel/CSV/media thật | Đã kiểm tra SQL Server/schema auth và test trên database tách biệt; baseline 31 bảng/seed/Excel/media còn phải xử lý |
| Frontend, NFR, kiến trúc và API chi tiết | Có quy ước code và ADR/hợp đồng auth; frontend và kiến trúc phần TOEIC còn tiếp tục |
| V2 / Future | Backlog, chưa bắt đầu |

| Ngày | Mã | Nội dung | Ảnh hưởng |
|---|---|---|---|
| 26/10/2026 | PLAN-INIT | Lập kế hoạch từ DatabaseDesign v1.0, UseCase Spec v1.0 và khung backend hiện có; đặt làm điểm vào công việc tương lai | Tạo lộ trình P00–P10; giữ nguyên trạng thái issue và thiết kế nguồn |
| 27/10/2026 | P02-02, P02-03 | Theo yêu cầu dùng LINQ: `GetByIdAsync` dùng `FirstOrDefaultAsync`; `RevokeAllUserRefreshTokensAsync` dùng `Where` và `ExecuteUpdateAsync`, cập nhật `RevokedAt` với một mốc UTC, giữ bộ lọc đúng user/chưa thu hồi/còn hạn | UC-02, UC-03, DEC-011; `Users`, `RefreshTokens`; giữ chữ ký repository, không đổi API/schema/policy token |
| 27/10/2026 | P02-02, P02-03 — cú pháp truy vấn | Chuyển cả 5 truy vấn trong `AuthRepository` sang LINQ `from ... where ... select`; thực thi bằng `FirstOrDefaultAsync`, `AnyAsync` hoặc `ExecuteUpdateAsync` tương ứng | UC-01–03/BA-01, BR-01, DEC-011; giữ bộ lọc và hành vi bất đồng bộ. `dotnet build --no-restore`: thành công, 0 warning, 0 error; chưa chạy trên SQL Server. Tiếp theo: kiểm tra tích hợp repository trên SQL Server theo các trường hợp bên dưới |
| 27/10/2026 | P02-02, P02-03 — chuẩn hóa phương thức | Áp dụng mẫu người dùng cung cấp: 4 truy vấn đọc dùng chuỗi phương thức LINQ với lambda, thân `=>`, trả trực tiếp `Task`. Thêm/cập nhật/thu hồi token cũng trả trực tiếp tác vụ lưu; `CreateUserAsync` chờ lưu trước khi trả entity. Thay thế cú pháp `from/where/select` của đợt trước | UC-01–03/BA-01; giữ chữ ký interface và điều kiện lọc. `dotnet build --no-restore`: thành công, 0 warning, 0 error; chưa kiểm thử SQL Server. Tiếp theo: kiểm tra tích hợp repository và hoàn thiện service/API theo các phụ thuộc hiện có |
| 27/10/2026 | CHG-001 | Người dùng yêu cầu đọc UserApi, hoàn thiện auth ToeicMind theo phong cách/cấu trúc đó và ghi nhớ trong Markdown | Tạo `TOEIC_Code_Style.md`, liên kết từ AGENTS.md; giữ cấu trúc Controller/Service/Repository, không triển khai quản lý người dùng V2 |
| 27/10/2026 | ADR-001 / P00-03 / P01-01–02 / P02-01–03 | Hoàn thiện register/login/refresh/logout/me, JWT và kiểm tra user mỗi request; ánh xạ schema auth thực tế, script auth riêng, secret ngoài JSON, xoay vòng nguyên transaction | Đối chiếu UC-01–03/BR-01–04/DEC-011; Hợp đồng/cấu hình ở `TOEIC_Auth_Implementation.md`; chưa hoàn tất schema TOEIC hoặc tích hợp frontend |
| 27/10/2026 | P01-02 — DbContext tối giản | Theo yêu cầu phong cách mới: AppDbContext chỉ có constructor và mỗi bảng một auto-property DbSet; bỏ OnModelCreating, chuyển mapping cần thiết sang attribute, navigation FK và UTC trong mapper; cập nhật AGENTS và hướng dẫn phong cách | Không đổi schema/API/UC-01–03. Build thành công. Project kiểm thử tự động đã gỡ ngày 06/11/2026. Tiếp theo giữ quy ước này khi thêm bảng và tiếp tục nền tảng TOEIC/FE theo phụ thuộc |
| 27/10/2026 | P01-02 — Swagger | Bật Swagger UI 10.3.1 tại `/swagger` trong Development, dùng OpenAPI `/openapi/v1.json`; cấu hình Authorize HTTP Bearer theo metadata Authorize/AllowAnonymous và launch URL cho IDE | `dotnet build ToeicMind.sln --no-restore`: 0 warning/0 error. Smoke UI/JS/JSON 200, đủ 5 route, Bearer đúng, me cần token/các auth route công khai không cần token, me không token trả 401; đã dừng tiến trình. Tiếp theo dùng Swagger thử API theo hợp đồng auth và tiếp tục phần nền tảng TOEIC còn lại |
| 28/10/2026 | P02-04, P02-05 — Mở rộng Auth | Thêm đổi mật khẩu (`change-password`), quên mật khẩu gửi mã OTP qua email (`forgot-password`, `reset-password`) và đăng nhập Google OAuth2 (`google-login`). Bổ sung bảng `PasswordResetOtps`, cột `GoogleId` trên `Users`, dịch vụ `EmailService` (MailKit + Mock logger) và `GoogleAuthService` (Google.Apis.Auth). Giữ đúng chuẩn DbContext tối giản và LINQ method-chaining | Smoke OpenAPI trả 200 cho đủ 9 route auth. Tiếp tục các công việc tiếp theo theo lộ trình |
| 28/10/2026 | P01-02 / P00-03 — Secret và Git ban đầu | Theo yêu cầu người dùng: tách kết nối SQL, khóa JWT và thông tin SMTP/Google vào `.env` local, giữ cấu hình hiện có ngoài Git; thêm `.env.example`, mở rộng `.gitignore`, dùng DotNetEnv 3.2.0 chỉ trong Development và loại file secret khỏi output/publish. Thêm README hướng dẫn cấu hình/Git; tác giả Git local là Minh Duc theo thông tin người dùng cung cấp, repo yêu cầu `ToeicMindBE`; thông điệp commit đầu tiên `Khoi tao ToeicMind, bao mat cau hinh` | Không đổi API/schema/nghiệp vụ UC-01–03/BR-01–04; phục vụ NFR-02/07. Build riêng `--artifacts-path artifacts/verification`: 0 warning/0 error. Smoke: OpenAPI 200/9 route, me 401, `/.env` 404; biến môi trường và CLI được ưu tiên, Production không nạp `.env`. Bản publish 78 file không chứa secret; rà 47 file trước commit không thấy thông tin bí mật local. Tiếp theo: kết nối GitHub để tạo repo và push; Google client ID thật còn do người dùng cấu hình |
| 28/10/2026 | P01-02 / NFR-02, NFR-07 — Xử lý Google secret trên GitHub | Đối chiếu remote thực tế `hgmducc/ToeicMind`: `a3445e0`/`d11d1cf` không chứa Google credential; `ac26781` thêm ClientId/ClientSecret vào JSON đã theo dõi. Xóa credential khỏi bản hiện tại, giữ `.env` riêng và thay đổi CORS chưa commit; khôi phục `.env.example`, thêm script kiểm tra Git index và hook pre-commit, cập nhật README hướng dẫn thu hồi secret | Không đổi code ứng dụng/API/schema. Kiểm tra riêng bằng index tạm: chặn HEAD bị lộ, mật khẩu SMTP, Google secret trong file văn bản và `.env` bị force-add; chấp nhận cấu hình đã làm sạch. Hook không in secret, không áp dụng cho chỉnh file trực tiếp trên GitHub. Việc còn lại: vô hiệu hóa secret cũ trong Google Cloud do chủ tài khoản thực hiện; xóa lịch sử remote cần xác nhận trước khi viết lại nhánh |
| 03/11/2026 | CHG-002 — Quản lý người dùng | Người dùng yêu cầu thêm API quản lý học viên và người dùng cho trang Admin (đổi quyết định CHG-001 là không làm quản lý người dùng) | Thêm `AdminUsersController` (`/api/admin/users`, 10 endpoint: danh sách, tổng quan, chi tiết, tạo, sửa, đổi vai trò, khóa, mở khóa, đặt lại mật khẩu, thu hồi phiên), `AdminUserService`, `AdminUserRepository`, DTO trong `DTOs/Users/Request|Response`; thêm `UserStatus.Locked`. Bảo vệ: không tự đổi vai trò/tự khóa, không hạ hoặc khóa ADMIN đang hoạt động cuối cùng (điều kiện nằm trong câu UPDATE). Không xóa cứng. Không đổi schema SQL |
| 03/11/2026 | CHG-003 — API Người học, thống kê Admin, tối ưu tải đề | Người dùng yêu cầu: API dashboard thống kê, API cho học viên làm bài/lịch sử/tiến độ/... và tối ưu tải đề (mất hơn 1 phút) theo hướng tách nhỏ theo Part, chữ và media riêng, để vào đề ngay | Thêm 34 API (xem `TOEIC_Learner_API.md`): vào đề `outline/directions/parts/media` có cache RAM và ETag; `AttemptsController` (làm bài, nộp, kết quả, xem lại, lịch sử); `BankController`; `MeController` (dashboard, tiến độ, ngày học, điểm, từ vựng); `ReportsController`; `AdminDashboardController`, `AdminReportsController`, thống kê từng học viên trong `AdminUsersController`. Thêm `ExamContentReader` (truy vấn phẳng) thay chuỗi `Include` cho E18/E19, `RequestTimings` + header `Server-Timing`, model học tập trong `Models/Learning`. Không đổi bảng; thêm script index hiệu năng (đã hợp nhất vào `Docs/DATABASE/01_schema.sql`, C2/C3, ngày 13/11). **Chưa kiểm trên SQL Server thật trong đợt 03/11**; nguyên nhân gốc của độ chậm chưa được chứng minh bằng số đo |
| 05/11/2026 | CHG-004 — Chế độ làm bài, Nghe chép, Đọc | Người dùng yêu cầu: Luyện thi (full/từng Part/nhiều Part, giờ tự đặt, chỉ hiện kết quả khi nộp) và Luyện tập (full/Part bất kỳ, chấm ngay); làm bài với đề không dùng clip cắt; Nghe chép dùng clip cắt, lọc theo bộ/đề/Part/loại bài/Level/dạng đặc biệt; Part 1–7 dùng câu chuẩn; tab Đọc/Ngữ pháp tương tự | Thêm `GET /api/exams/{id}/modes`, `DictationController` (6 API), `GET /api/grammar/topics`; mở rộng ngân hàng (`level-N`, `cat-N`, `all`, `grammar`, lọc chủ điểm/Level). Cho phép đặt giờ với mọi phạm vi Luyện thi (`ExamTimeRules`); quy đổi điểm cho cả Luyện tập khi đủ 100 câu/kỹ năng. Bỏ audio clip khỏi vào đề/xem lại/ngân hàng. Thêm bảng `UserListeningProgress`, `GrammarTopic`, cột `StudyDay.ClipPracticeCount`. Chưa kiểm trên SQL Server thật; trang HTML chưa đổi |
| 06/11/2026 | CHG-005 — Luyện thi liền mạch, Nghe chép 3 tab, học từ vựng SM-2, tối ưu | Người dùng yêu cầu: Luyện thi/Full Test lấy hướng dẫn từ `ExamDirection` (dùng chung mọi đề, tự phát, có nút bỏ qua, không tính giờ), tự chuyển câu khi hết audio, không lùi/không xem lại, Reading có nút Câu tiếp; Part 1–2 chỉ hiện A/B/C/D; Nghe chép dùng clip cắt với 3 tab (Nghe chép, Nghe check, Nghe full, ẩn 30–100%); từ vựng chia theo bộ đề/đề/Part, thuật toán học và lưu tiến độ; tối ưu BE và FE | Thêm `VocabLearningController` (6 API, L35–L40), `VocabScheduler` (SM-2 cải biên), bảng `UserVocabProgress`, cột `StudyDay.VocabReviewCount`, migration tiến độ (đã hợp nhất vào `Docs/DATABASE/01_schema.sql` ngày 13/11), chỉ mục `VocabularyContext(ClipId, VocabId)`, nén phản hồi Brotli/Gzip. FE người học: trình thi liền mạch (`exam_run.js`), trình Nghe chép 3 tab, trang từ vựng (`vocab.js`). Chưa kiểm trên SQL Server thật trong đợt 06/11; cần áp dụng schema và dữ liệu `ExamDirection` chung |
| 06/11/2026 | CHG-005b — Gỡ project kiểm thử | Người dùng đã xóa thư mục `tests/` | Sửa `ToeicMind.sln` chỉ còn project `ToeicMind`; bỏ `tests/**` khỏi `DefaultItemExcludes` trong csproj, bỏ `TestResults/`, `*.trx` khỏi `.gitignore`; dọn lệnh `dotnet test`, đường dẫn TRX và các số liệu kiểm thử cũ trong README và `Docs/`. Các nhật ký lịch sử còn nhắc "kiểm thử" chỉ là ghi chú quá khứ, không còn bằng chứng đi kèm |

**Kiểm tra đợt hoàn thiện auth 27/10/2026:** .NET SDK 10.0.403, Windows, SQL Server localhost; Build thành công, không ghi tài khoản thử vào ToeicDb. Project kiểm thử tự động đã gỡ ngày 06/11/2026. Các ghi chú chưa chạy SQL Server trong nhật ký trước đó là trạng thái của những đợt sửa cú pháp trước.

**Kiểm tra bàn giao backend auth:** `dotnet build ToeicMind.sln --no-restore`: thành công, 0 warning, 0 error. Chạy Development với User Secrets: OpenAPI 200/đủ 5 route, me không token trả 401; tiến trình smoke đã dừng. Liên kết AGENTS/hướng dẫn mới hợp lệ; không còn database test tự tạo trên SQL Server.

**Việc tiếp theo của P02-01–03:** tích hợp frontend theo hợp đồng auth (lưu/xóa token, tuần tự hóa refresh), nối logout/tái xác thực trong bài ở P06/P08/P10; các bước này không thuộc đợt hoàn thiện backend auth. Tiếp tục phần nền tảng/seed TOEIC chưa làm; không coi 24 test auth là nghiệm thu G01/G10 hoặc xác nhận các issue/ASM còn mở.

**Kiểm tra secret/Git ngày 28/10/2026 (P01-02/P00-03):** build thường bị API hiện chạy (PID 7468) khóa `ToeicMind.exe`; giữ nguyên tiến trình đó và kiểm tra vào thư mục riêng bằng `dotnet build ToeicMind.sln --artifacts-path artifacts/verification`, thành công 0 warning/0 error. `dotnet publish ToeicMind.csproj --configuration Debug --artifacts-path artifacts/verification --no-build --no-restore --output artifacts/publish-check`: thành công; không có `.env`, `secrets.json` hoặc private key trong 78 file publish. Smoke local kiểm tra nạp `.env`, ưu tiên môi trường/CLI và không nạp trong Production; mọi tiến trình smoke đã dừng. README có hướng dẫn Git, SMTP/Google và môi trường mới; không lưu giá trị secret trong bằng chứng.

**Công việc tiếp theo: P00-01.** Kiểm tra/tiếp nhận bộ SQL, Excel/CSV và media, xác định SQL Server/frontend; đồng thời chuẩn bị các bảng quyết định P00-02 và NFR/ADR/API ở P00-03. Ưu tiên xử lý mô hình thời gian, trạng thái bài làm, điều kiện quy đổi và chính sách sửa nội dung trước khi triển khai các phần phụ thuộc.


### Rà soát Google login (P02-02) — 29/10/2026

Đã bắt buộc audience Google theo Client ID cấu hình, từ chối cấu hình thiếu/placeholder và tránh log exception token. Luồng liên kết không ghi đè subject đã liên kết, không cập nhật tài khoản khóa, dùng điều kiện cập nhật để tránh hai subject đồng thời ghi đè nhau; tên Google giới hạn 100 ký tự theo schema. Không đổi API DTO hoặc tự cấp quyền Admin.

Kiểm tra: build backend thành công; luồng Google dùng validator mock, không dùng tài khoản thật. Chưa kiểm thử Google ID token thật. Frontend Admin/FE đã build, 29/29 test mỗi ứng dụng, kiểm tra trình duyệt bằng mock và nút SDK Google thật ở 320px. Chi tiết ở `../../ToeicMindAdmin/docs/AUTH_INTEGRATION.md`.

Tiếp theo của đợt auth: khởi động lại backend đang chạy để nạp bản sửa; kiểm tra chọn tài khoản Google thực tế với Web Client ID và authorized JavaScript origins tương ứng. Đợt auth này không thay đổi `.env` hoặc lưu tài khoản thật vào tài liệu.

### Kho đề — P03/P05, 30/10/2026

Đã chuyển nguồn tham chiếu công việc mới sang database/UC v1.3 và lập [kế hoạch/API triển khai đề](TOEIC_Exam_API_Implementation.md). P03-01 đạt REVIEW: 16 endpoint Admin/người học cho bộ đề và thông tin đề; DbContext thêm hai DbSet, model dùng attribute; script 003 hỗ trợ schema sạch/nâng cấp Exam cũ còn rỗng. Schema catalog đã áp dụng ToeicDb, kiểm tra ExamSet/Exam vẫn 0 dòng. Chưa thay schema nội dung nhóm/câu từ v1.0 sang v1.3.

Kiểm chứng: build/publish thành công; secret scan/publish không chứa khóa hoặc dữ liệu mẫu; không đổi cấu hình database ứng dụng. R2 local đã cấu hình từ note người dùng, HEAD bucket thực tế HTTP 200; chưa upload object hoặc cấp URL qua API.

Test_1 có 200 câu/103 nhóm, 562 cặp từ gốc/loại từ và đủ media tham chiếu. Excel còn bố cục cũ, 185 câu chưa đúng định dạng giải thích đáp án mới. File gốc giữ nguyên; báo cáo ở `TOEIC_Test1_Inspection.json`. Đã gửi 4 câu hỏi duyệt: chuyển nghĩa từ/cột và mã nhóm; chính sách sửa nội dung có lượt làm (Q05); R2 riêng tư/URL ký; chuẩn hóa nhãn giải thích. Chưa coi đề xuất là quyết định. Tiếp theo tiếp tục P03-02/03, P05 và P03-04 theo các quyết định được duyệt; chưa có API nội dung câu hỏi/import/publish hoặc bài làm ở đợt này.

### P03-02/03/04 — theo quyết định người dùng, 30/10/2026

Người dùng chọn **Test_3 làm chuẩn**, meaning_base riêng; duyệt mã đề nhập hoặc tự sinh, khóa nội dung sau lịch sử, R2 riêng tư/URL ký. Duyệt `v.phr → phr.v`, `n.phr/adv.phr → phr`, có báo cáo từng dòng. Người dùng tự sửa nhãn giải thích: 17 câu lặp **80–88, 147–154**, cùng mâu thuẫn câu 157/184. Không tự sửa file để vượt kiểm tra.

Đã có API nhóm/câu/đáp án, phân loại/Level/cờ, hướng dẫn mặc định/riêng/hiệu lực, upload/soft delete media, URL ký ADMIN, dry-run kiểm tra/xuất bản/unpublish. Nháp cho thiếu nội dung; xuất bản đủ 7 Part/200 câu/nhóm chuẩn/nội dung/media/9 hướng dẫn. Guard nguyên transaction bao gồm lịch sử BANK qua AttemptAnswer và hướng dẫn mặc định thực sự được dùng. Schema 004–006 đã áp dụng ToeicDb, giữ 9 hướng dẫn/119 phân loại; Exam/QuestionGroup/Question/Media vẫn 0 dòng.

Bằng chứng: đề tổng hợp 200 câu/103 nhóm xuất bản qua API, media mock. SDK R2 thật upload/GET URL ký đúng bytes/unsigned GET HTTP 400/dọn object diagnostic thành công. OpenAPI/Swagger HTTP 200, **34 operation/23 path** đề thi, multipart và Bearer đúng; đã dừng backend smoke port 5098. Publish thành công, scan 83 file publish và 97 file source không có khóa R2 hay dữ liệu mẫu đóng gói. Không stage/commit/push.

Hợp đồng và giới hạn: [TOEIC_Exam_Content_API.md](TOEIC_Exam_Content_API.md). **Chưa có API import Excel**, chưa nhập/xuất bản Test_3 thật và chưa có bài làm/player/chấm điểm. Tiếp theo P05 với bản Test_3 người dùng sửa: chuẩn hóa bản sao, preview/xác nhận file, import nguyên transaction và từ vựng dùng nghĩa gốc riêng; không cần hỏi lại các quyết định đã duyệt.

### Hợp nhất về script DATABASE đã có — P01-01/02, 30/10/2026

Theo yêu cầu mới nhất của người dùng, sửa trực tiếp `ToeicMindBE/DATABASE/01_schema.sql`, `02_views_procs_triggers.sql`, `03_seed.sql`; giữ nguyên `00_create_database.sql`. CREATE bảng/FK/index có guard tồn tại, phần cấu trúc mới dùng ALTER tại chỗ, không DROP/CREATE database hoặc dựng lại bảng hiện có. Giữ dữ liệu/ID/cột legacy, giữ các giá trị seed và các bảng nghiệp vụ gốc; preflight dừng nếu đề cũ thiếu mapping bộ/mã.

Đã xóa cả 6 file SQL tách riêng trong backend (001–006). Nguồn SQL duy nhất là DATABASE/01, 02, 03 (schema/seed đầy đủ), bỏ baseline auth/nội dung rút gọn.

Kiểm chứng hiện tại: parser Microsoft T-SQL cho cả 4 file báo 0 lỗi; AST không có DROP DATABASE/DROP TABLE/TRUNCATE trong 01–03 và không có CREATE DATABASE trong các file này; CREATE TABLE đều được guard. Literal seed giữ nguyên. Build thành công. Chưa áp dụng các file đã chỉnh vào ToeicDb, không restart hay đổi cấu hình database ứng dụng. Hướng dẫn hiện hành: [TOEIC_Database_Scripts.md](TOEIC_Database_Scripts.md).

Tiếp theo khi triển khai database: dùng bộ đã kiểm tra theo thứ tự 01 → 02 → 03, dừng khi có lỗi; không chạy 00. Nếu có đề cũ chưa có bộ/mã, cần mapping do người dùng duyệt trước khi áp dụng. Tiếp tục P05 với Test_3 đã sửa; không tạo thêm nguồn SQL trùng trong backend.

### Tài liệu API chi tiết — P02-01–05 / P03-01–04 / hỗ trợ P10-01, 30/10/2026

Đã viết [TOEIC_API_Documentation.md](TOEIC_API_Documentation.md) theo yêu cầu người dùng, làm điểm tham chiếu tích hợp API hiện tại và liên kết từ README. Tài liệu gồm đủ 10 thao tác xác thực và 34 thao tác danh mục/bộ đề/đề/nhóm/câu/đáp án/hướng dẫn/media/publish; bảng trường request và response, giới hạn dữ liệu, mã lỗi/issue, xóa mềm/khôi phục, PUT aggregate, khóa nội dung theo lịch sử và URL R2 có hạn. Có luồng tích hợp, ví dụ PowerShell/curl/JavaScript và danh sách chức năng chưa có API. Không mở rộng nghiệp vụ hoặc đổi trạng thái nghiệm thu các task triển khai chỉ vì đã bổ sung tài liệu.

Bằng chứng kiểm tra tài liệu: đối chiếu controller/DTO/service/repository và bộ SQL chuẩn; so sánh với OpenAPI runtime xác nhận **44/44 thao tác trên 33 path**, không thiếu/thừa endpoint. Parse thành công **30 ví dụ JSON**, kiểm tra **27 liên kết** và cú pháp **2 block PowerShell, 1 block JavaScript**; đối chiếu mã code có trong nguồn. Smoke không token trả 401 cho me/catalog, đăng ký dữ liệu sai trả 400 VALIDATION_ERROR trước ghi dữ liệu. Đã dừng backend tạm port 5099. Artifact local trong `artifacts/api-documentation/`, không đưa vào source ứng dụng. Không sửa API, schema, secret hoặc dữ liệu ứng dụng trong đợt này.

Tiếp theo: dùng tài liệu này khi tích hợp P10-01; cập nhật cùng controller/DTO khi API thay đổi. Tiếp tục P05 theo đầu vào Test_3 đã sửa; import, bài làm/player và các chức năng chưa triển khai không được mô tả như endpoint đã có.

Cập nhật tài liệu cùng ngày theo yêu cầu người dùng: bổ sung cột **Mục đích** cho cả hai bảng danh sách endpoint, đủ 44 thao tác A01–A10/E01–E34. Đã kiểm tra số dòng/cột và giữ nguyên method, route, quyền, response; tiếp tục dùng tài liệu này cho tích hợp P10-01.


### Hoàn thiện Admin và nhập nội dung — P03/P05/P10-01, 30/10/2026

Theo yêu cầu kiểm tra toàn bộ Admin và xác nhận bổ sung backend: triển khai E35–E38, mở rộng aggregate nhóm với vocab/ngữ cảnh và clip, giữ riêng nghĩa gốc/ngữ cảnh, lưu raw sheet, transaction toàn bộ nội dung, media riêng có thử lại; Admin mở đúng đề đã lưu, phân trang/tìm kiếm/thùng rác, chỉnh phân loại/level/cờ, hướng dẫn hiệu lực, URL ký và publish thật. P05-01 đã có parser/xem trước cho cả Test_1/Test_3; vẫn chờ biên tập 185/19 lỗi OptionExplanations. Không đổi đáp án hoặc tự sửa nguồn để vượt validation. P10-01 mới hoàn tất nhánh quản trị nội dung, chưa bao gồm học/player theo Attempt.

Kiểm chứng: browser backend+SQL+R2 thật đã lưu/mở lại một đề nháp tổng hợp, phát main/clip và xem ảnh. Auth Google/OTP dùng mock riêng. Chi tiết hợp đồng/bằng chứng/cách chạy lại trong `TOEIC_Exam_Import_API.md` và `../../ToeicMindAdmin - Copy/docs/ADMIN_AUDIT.md`.

Lưu ý triển khai: helper kiểm thử ban đầu không loại USE ToeicDb trong 01/02/03 nên bộ cập nhật tại chỗ đã chạy trên ToeicDb; không còn ở trạng thái chưa áp dụng như ghi chú lịch sử phía trên. Đã thông báo người dùng, kiểm tra số dòng (Question/Vocabulary/ListeningClip đều 0) và sửa helper để chặn chuyển database, kiểm tra đủ bảng trước chạy API. Các lượt kiểm thử sau dùng database riêng. Không có snapshot trước lượt chạy để khẳng định mọi giá trị trước/sau; không nhập hai đề mẫu vào database ứng dụng.


### Chốt hồi quy Admin — 31/10/2026

Backend thêm nhập nguyên lô 200 câu/1.812 vocab/201 segments và đủ 5 sheet. Admin 56/56, FE 35/35; build/lint đều qua. Browser qua 13 nhóm thao tác với API/R2 thật và các nhánh lỗi được mock riêng. Sửa lỗi mất liên kết nguồn khi thử lại clip sau lần lưu đầu, menu mobile và focus lỗi OTP; đồng bộ phần auth dùng chung. Đã dọn dữ liệu audit. Test_1/Test_3 giữ nguyên 185/19 lỗi giải thích nguồn, chưa nhập hoặc xuất bản hai đề thật. Kết quả chi tiết trong `../../ToeicMindAdmin - Copy/docs/ADMIN_AUDIT.md`.


Đối chiếu cuối 31/10: 49 thao tác/38 path, gồm API seed hướng dẫn mặc định đã có. Admin có thao tác khởi tạo khi thiếu; chỉ thêm mục thiếu và giữ nội dung đã sửa; browser nhánh khởi tạo dùng mock. Không thay đổi implementation seed có sẵn.

### Xử lý xung đột cổng local — P01-02, 31/10/2026

Đã xử lý lỗi khởi động `address already in use` trên cổng 5078: xác định PID 10484 là backend của workspace đang chạy từ `artifacts/admin-final/bin/ToeicMind/debug/ToeicMind.dll`, Swagger trả HTTP 200. Dừng đúng tiến trình này rồi chạy `dotnet run --project ToeicMind.csproj --launch-profile http`: build và khởi động thành công tại `http://localhost:5078`; Swagger và OpenAPI đều HTTP 200, OpenAPI có 38 path. Đã dừng tiến trình kiểm tra và xác nhận cổng 5078 trống để người dùng chạy lại. Bổ sung hướng dẫn xử lý trong README; không sửa code ứng dụng, API hoặc database, không chạy lại test nghiệp vụ cho thay đổi tài liệu/vận hành local. Đợt xử lý này hoàn tất; trạng thái tổng thể P01-02 giữ nguyên. Tiếp theo: chạy backend tại terminal của người dùng và chỉ giữ một instance trên cổng 5078.

### Sửa VOCAB_MEANING_CONFLICT — P05 / UC-21, 31/10/2026

Logic nhập từ vựng trước đây từ chối khác nghĩa gốc, trái DB-DEC-21 và DEC-017/021. Đã sửa để dùng lại VocabId, giữ nghĩa gốc đã lưu (kể cả từ đã xóa mềm), từ mới lặp trong lô giữ nghĩa lần đầu; nghĩa ngữ cảnh/ví dụ vẫn riêng theo câu. POST import/PUT content trả `importWarnings` với mã VOCAB_MEANING_PRESERVED, số câu, từ/loại từ và hai nghĩa để đối soát. Admin hiển thị báo cáo thông tin riêng với kết quả lưu/media. Không đổi schema hoặc sửa dữ liệu/file đề thật.

Lượt xác nhận cuối: build backend không có cảnh báo; luồng từ vựng gồm 3 trạng thái, roundtrip/cập nhật, rollback và từ chối dữ liệu sai/quyền LEARNER.

Kiểm chứng: ba ca (từ mới/đang có/đã xóa) từng tái hiện 409 trước sửa. Ca nhập lớn 200 câu/1.812 vocab/201 segments từng gặp SQL Execution Timeout khi INSERT Exam (SQL chờ SLEEP_BPOOL_STEAL, process_physical_memory_low=1), chưa xác nhận lại. Không đổi cấu hình SQL Server để vượt kiểm tra. Admin build/lint qua; browser dùng **API mock**, qua báo cáo giữ nghĩa, tách nghĩa nguồn/ngữ cảnh, chỉ gửi một import, desktop và 375px/320px không tràn ngang. Tiếp theo: thử lại ca nhập lớn khi SQL Server đủ bộ nhớ; khởi động lại backend đang chạy để áp dụng bản sửa trước khi thử import từ giao diện.
