# CHG-007 — Cá nhân hóa người học và kiểm tra đầu vào

| Thuộc tính | Giá trị |
|---|---|
| Ngày | 17/11/2026 |
| Yêu cầu | Thêm chức năng cá nhân hóa: kiểm tra đầu vào (Admin thiết lập đề trong trang quản trị), tính thông tin người học rồi gợi ý bài học dựa trên các bài đã chia trong database |
| Liên quan | CR-006 (cá nhân hóa, trước đây "chờ quyết định"), mục V2 "Hồ sơ, target điểm, ngày thi" và "Test đầu vào" trong `TOEIC_DatabaseDesign_v1.3.md` mục 13 |
| Database | `Docs/DATABASE/01_schema.sql`, **phần E** — phải chạy trước backend mới (xem mục 5) |
| Trạng thái | REVIEW — đã kiểm chứng trên bản sao database thật, **chưa** chạy trên database ứng dụng |

## 1. Quyết định thiết kế

- **Bài kiểm tra đầu vào do Admin ghép từ nhóm câu của đề đã xuất bản**, không phải một đề riêng: `sp_PublishExam` bắt buộc đề đủ 200 câu theo cấu trúc chuẩn, nên đề ngắn không xuất bản được. Ghép trọn nhóm (giữ audio, đoạn văn, giải thích) và tái dùng toàn bộ nội dung đã biên tập.
- **Lượt làm bài là `Attempt` với `Scope = PLACEMENT`**, `Mode = EXAM` (có giờ, không báo đúng/sai), `ExamId = NULL`, nội dung gửi kèm như lượt ngân hàng. Liên kết lượt ↔ bài kiểm tra nằm ở bảng riêng `PlacementAttempt` (không thêm cột vào `Attempt`) để **chức năng cũ vẫn chạy khi database chưa áp dụng phần E**; các API mới khi đó trả `503 PERSONALIZATION_SCHEMA_MISSING`.
- **Điểm ước tính** = tỷ lệ đúng của từng kỹ năng quy về 100 câu, tra bảng `ScoreConversion`; lưu ở `ListeningScaled/ReadingScaled/TotalScaled` của lượt. Level = `LevelBand` theo điểm kỹ năng (Level 1 dưới 200, 2: 200–300, 3: 300–400, 4: 400–495).
- Điểm ước tính hiện trên đường điểm (có `scope = PLACEMENT`) nhưng **không** tính vào "điểm cao nhất/gần nhất" của người học và điểm trung bình trên dashboard Admin.
- Sau khi nộp, người học **được xem lại đáp án/giải thích** (khác Luyện thi thường): câu hỏi lấy từ ngân hàng vốn đã xem được giải thích khi luyện.
- **Gợi ý tính lại mỗi lần gọi** (chỉ đọc, không lưu), nên phản ánh ngay kết quả bài vừa làm.

## 2. API

### Người học (đăng nhập)

| Method | Route | Mục đích |
|---|---|---|
| GET | `/api/placement` | `available`, `test` (tên, mô tả, thời gian, số câu theo Part), `inProgressAttemptId`, `lastResult` (điểm ước tính, Level từng kỹ năng) |
| POST | `/api/placement/attempts` | Bắt đầu bài đang dùng → `201 AttemptDto` (kèm `content`). Đang có lượt dở thì trả lại lượt đó. Không có bài → `409 PLACEMENT_NOT_AVAILABLE` |
| GET/PUT | `/api/me/profile` | Mục tiêu: `targetScore` (10–990, bội số 5), `examDate` (từ hôm nay, ≤ 3 năm), `dailyMinutes` (5–600). Gửi đủ 3 trường, `null` = bỏ trống |
| GET | `/api/me/learning-plan` | Lộ trình: `profile`, `placement`, `current` (điểm ước tính + nguồn), `skills[]`, `parts[]`, `weakTopics[]`, `strongTopics[]`, `recommendations[]`, `todayMinutes` |

Lưu đáp án, nộp, kết quả (`?includeReview=true`), bỏ dở, lịch sử dùng chung `/api/attempts…`. `AttemptResultDto` của lượt PLACEMENT có thêm `listeningLevel`, `readingLevel`; `ScorePointDto` có thêm `scope`; bộ lọc lịch sử nhận `scope=PLACEMENT`.

### Admin (`ADMIN`)

| Method | Route | Mục đích |
|---|---|---|
| GET | `/api/admin/placement-tests` | Danh sách (bài đang dùng đứng đầu), số câu theo Part, số lượt đã làm |
| GET | `/api/admin/placement-tests/{id}` | Chi tiết kèm nhóm theo thứ tự; nhóm đã bị xóa sau khi chọn có `isAvailable = false` |
| POST / PUT | `/api/admin/placement-tests[/{id}]` | `{ title, description, timeLimitSeconds (60–14400), isActive, groupIds[] (1–200, không trùng) }`. `isActive = true` tự tắt bài đang dùng khác (tối đa một bài, có unique index lọc) |
| DELETE | `/api/admin/placement-tests/{id}` | Xóa mềm, tự tắt; kết quả người học đã làm vẫn giữ |
| GET | `/api/admin/placement-tests/candidates` | Nhóm ứng viên của đề đã xuất bản; lọc `partNo`, `examId`, `levelNo`, `categoryId` (gồm loại con), `search`, phân trang; có đoạn trích nội dung |
| POST | `/api/admin/placement-tests/generate` | `{ parts: [{ partNo, questionCount }], examId?, excludeGroupIds[] }` → gợi ý nhóm (không lưu): trọn nhóm, không vượt số câu mỗi Part, luân phiên Level, ưu tiên phân loại chưa dùng, xếp dễ → khó; kèm thời gian đề xuất (Nghe 27 giây/câu, Đọc 45 giây/câu) |

Mã lỗi mới: `PLACEMENT_TEST_NOT_FOUND` (404), `PLACEMENT_GROUP_INVALID` (400), `PLACEMENT_EMPTY` (400), `PLACEMENT_NOT_AVAILABLE` (409), `PERSONALIZATION_SCHEMA_MISSING` (503).

## 3. Cách tính thông tin người học

Nguồn dữ liệu: `Attempt` (điểm), `UserQuestionProgress` (lần trả lời gần nhất của từng câu — cả luyện tập, ngân hàng, Luyện thi và kiểm tra đầu vào), `UserVocabProgress` (lịch ôn SM-2), `UserListeningProgress` (nghe chép), `LearnerProfile`.

| Thông tin | Cách tính |
|---|---|
| Điểm hiện tại từng kỹ năng | Lần đo gần nhất có điểm kỹ năng đó (kiểm tra đầu vào hoặc bài làm đủ 100 câu). Chưa có thì ước tính từ tỷ lệ đúng khi luyện (cần ≥ 20 câu của kỹ năng). `source`: PLACEMENT / EXAM / PRACTICE |
| Mục tiêu kỹ năng | Nửa điểm mục tiêu tổng, làm tròn lên bội số 5, tối đa 495; `gap` = mục tiêu − hiện tại |
| Kỹ năng ưu tiên | Thiếu nhiều điểm hơn; chưa có mục tiêu thì điểm thấp hơn; chưa có điểm thì độ chính xác thấp hơn |
| Level nên luyện | Level của điểm hiện tại; lên một Level khi đã đúng ≥ 75% trên ≥ 10 câu ở Level đó. Chưa có điểm: Level thấp nhất chưa vững. Part không có câu ở Level đó thì dùng Level gần nhất có câu |
| Trạng thái Part | UNTESTED (< 3 câu), WEAK (< 60%), FAIR (60–79%), STRONG (≥ 80%) |
| Chủ điểm yếu/vững | Theo **chủ điểm lá** của `QuestionCategory` (ví dụ "Động từ · Thì", "Câu hỏi Wh- · How"): yếu khi ≥ 3 câu và < 60%; khi các lá còn ít dữ liệu thì xét nhóm cha (≥ 5 câu). Vững: ≥ 5 câu và ≥ 80% |

## 4. Gợi ý bài học (nội dung đã chia sẵn trong database)

| Ưu tiên | Loại | Điều kiện | Mở bài |
|---|---|---|---|
| 100 | PLACEMENT | Có bài đang dùng mà chưa làm (hoặc đang làm dở) | `/placement` hoặc lượt dở |
| 95 | PROFILE | Chưa đặt điểm mục tiêu | Hộp mục tiêu |
| 90 / 45 | MOCK_TEST | Chưa thi thử trong 14 ngày và (đã làm ≥ 60 câu hoặc còn ≤ 30 ngày đến kỳ thi); 90 khi còn ≤ 14 ngày | Danh sách đề |
| 85 | VOCAB_REVIEW | Có từ đến hạn ôn | Phiên `REVIEW` (≤ 20 từ) |
| 76–83 | WEAK_TOPIC | 3 chủ điểm yếu nhất còn câu mở được (+3 nếu thuộc kỹ năng ưu tiên) | Thẻ ngân hàng `cat-{id}`: `WRONG` khi đã sai ≥ 3 câu, ngược lại `NEW` |
| 70 / 58 | LEVEL_PRACTICE | Mỗi kỹ năng: Part yếu nhất (hoặc nhiều câu nhất nếu chưa luyện) ở Level nên luyện | Thẻ `level-{n}` (`NEW`, hết câu mới thì `ALL`) |
| 66 / 62 / 40 | DICTATION | Bộ clip "cần luyện"; hoặc bộ mới ở Level nên luyện khi Nghe là kỹ năng ưu tiên | `/dictation/items?status=…&levelNo=…` |
| 52 | NEW_PART | Part chưa đủ 3 câu (tối đa 2) | Thẻ `all`, `NEW` |
| 50 | VOCAB_NEW | Còn hạn mức từ mới hôm nay | Phiên `NEW` |
| 20 | PLACEMENT | Lần kiểm tra gần nhất cách > 60 ngày | `/placement` |

Thời lượng ước tính: thẻ ngân hàng ≈ min(lô 20 câu, số câu còn) × giây/câu của Part × 1,5 (đọc giải thích); từ vựng ≈ 0,6–0,8 phút/từ; nghe chép 10–15 phút; thi thử 120 phút. **Kế hoạch hôm nay** lấy gợi ý theo ưu tiên tới khi đủ `dailyMinutes` (mặc định 30), luôn có ít nhất một bài. Nội dung VIP người học chưa mở khóa không được gợi ý.

## 5. Database (phần E của `01_schema.sql`)

- E1 `LearnerProfile` (PK `UserId`, FK Users CASCADE, CHECK điểm 10–990 bội số 5, phút 5–600).
- E2 `PlacementTest` (xóa mềm, CHECK thời gian 60–14400, `UX_PlacementTest_Active` unique lọc `IsActive = 1`) và `PlacementTestGroup` (PK `(PlacementTestId, GroupId)`, `SortOrder`, FK tới `QuestionGroup`).
- E3 `PlacementAttempt` (PK `AttemptId`, FK Attempt CASCADE, FK PlacementTest).
- E4 nới `CK_Attempt_Scope` và `CK_Attempt_ExamScope` để nhận `PLACEMENT` (ExamId NULL), thêm `CK_Attempt_PlacementExam` (PLACEMENT luôn EXAM). Chỉ thay ràng buộc khi định nghĩa cũ chưa có `PLACEMENT`; dữ liệu cũ thỏa ràng buộc mới.

Chạy trên database đã có: sửa dòng `USE` cho đúng database đích (máy hiện tại backend dùng `ToeicDb_test_v1`) rồi `01 → 02 → 03` như [hướng dẫn database](TOEIC_Database_Scripts.md). Không có DROP bảng/dữ liệu.

## 6. Bằng chứng kiểm tra (17/11/2026)

| Kiểm tra | Kết quả | Môi trường |
|---|---|---|
| `dotnet build` | 0 cảnh báo, 0 lỗi | — |
| `01 → 02 → 03` rồi chạy lại `01` | Thành công; 4 bảng, 3 CHECK, index lọc đúng; 9 lượt làm bài cũ giữ nguyên | **Bản sao** `ToeicDb_test_v1` (backup COPY_ONLY → database tạm) |
| Kịch bản HTTP đầu-cuối | **65/65** đạt ở bản build cuối (lần trước 66/66; số kiểm tra "mở gợi ý" thay đổi theo dữ liệu): quyền (401/403), lọc ứng viên, gợi ý tự động (đúng số câu, trải 4 Level), validation, chỉ một bài đang dùng, sửa/xóa, làm bài (không lộ đáp án, đổi/bỏ chọn, tiếp tục lượt dở), điểm ước tính + Level, xem lại, lịch sử/dashboard, mục tiêu (validation, upsert), lộ trình; **mọi gợi ý đều mở được bài thật**; lộ trình cập nhật sau khi luyện thêm | Backend thật + database tạm |
| Database **chưa** chạy phần E | **9/9** đạt: dashboard, lịch sử, ngân hàng, Luyện thi, nộp bài vẫn chạy; 3 API mới trả `503 PERSONALIZATION_SCHEMA_MISSING` | Backend thật + bản sao chưa nâng cấp |
| Giao diện Chromium (Admin + người học) | Đạt 17 bước, không lỗi JavaScript, 360px không tràn ngang | Backend thật + database tạm |

Hai database tạm và file backup tạm đã xóa sau khi kiểm tra; database ứng dụng không bị thay đổi.

## 7. Hạn chế và việc tiếp theo

- **Chưa chạy phần E trên database ứng dụng.** Trước khi dùng: chạy `01 → 02 → 03` (sửa `USE`), khởi động lại backend, vào Admin → *Kiểm tra đầu vào* tạo và bật một bài.
- Điểm ước tính từ bài ngắn có sai số lớn hơn đề 200 câu (bài ~40 câu: mỗi câu ≈ 2,5% tỷ lệ đúng). Lộ trình ưu tiên điểm bài thi đủ 100 câu khi mới hơn.
- Ngưỡng (60%/80%, 3/5 câu, 75%/10 câu, 14/60 ngày) là hằng số trong `PersonalizationService`, chưa đưa ra cấu hình.
- Mục tiêu kỹ năng chia đều 50/50; chưa cho người học chỉnh tỷ lệ Nghe/Đọc.
- Chưa có bài viết ngữ pháp (UC-18) nên gợi ý ngữ pháp mở thẻ luyện câu hỏi theo chủ điểm, không mở bài lý thuyết.
