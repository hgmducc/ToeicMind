# CHG-009 — Bài ngữ pháp, báo lỗi mở rộng, tự nộp bài hết giờ, clip nghe sưu tầm (18/11/2026)

Phạm vi: backend `G:\ToeicMind\ToeicMind`, Admin `../ToeicMindAdmin`, Người học `../ToeicMindFE`.

| Use case | Task | Trước đợt này | Sau đợt này |
|---|---|---|---|
| UC-25 Quản lý bài ngữ pháp | P04-04 | Chưa có (bảng `GrammarArticle` có sẵn nhưng chưa ánh xạ) | **Mỗi chủ điểm một bài**; API + màn Admin "Bài ngữ pháp" theo 15 chủ điểm |
| UC-18 Đọc bài ngữ pháp | P04-04 | Chỉ có luyện câu hỏi theo chủ điểm | Trang bài học của chủ điểm (mục lục các phần, đáp án bài tập ẩn), "Đang cập nhật" khi chưa có bài |
| UC-14 Báo lỗi | P09-01 | Chỉ câu hỏi (backend nhận từ vựng nhưng không có nút) | Câu hỏi, từ vựng, bài ngữ pháp, bộ clip Nghe chép |
| UC-04 Luyện thi | P08-03 | Bài hết giờ chỉ chốt ở lần truy cập kế tiếp | Có thêm tác vụ nền tự nộp |
| UC-28 Quản lý clip (TH2) | V2 | Chỉ có TH1 (clip cắt từ đề) | Bộ clip sưu tầm: tạo, phân loại, clip, audio, xuất bản/ẩn, xóa mềm |

Database: không thêm bảng hay cột; chỉ **thêm một index** `UX_GrammarArticle_Topic` (unique có điều kiện, xem mục 1). Mọi bảng và cột khác đã có trong `Docs/DATABASE/01_schema.sql`. Đã đối chiếu trên `ToeicDb_test_v1`: có bảng `GrammarArticle`, các cột `ListeningItem.CategoryId/LevelNo/SourceNote/ExternalKey` và `Report.ArticleId/ListeningItemId`.

## 1. Quyết định trong đợt

Các quyết định dưới đây là lựa chọn kỹ thuật trong phạm vi được giao. Mục nào chạm nghiệp vụ được ghi rõ để rà lại.

- **Chống trùng báo lỗi theo nội dung, không theo loại lỗi** (UC-14 E2, BR-15, `UX_Report_Open`).
  - Trước đây service xét thêm loại lỗi. Gửi loại lỗi khác cho cùng câu thì qua service nhưng bị index từ chối, gây **HTTP 500**.
  - Nay trả `REPORT_DUPLICATE` (409), kể cả khi hai request gửi đồng thời.
- **Admin mở lại báo cáo đã đóng** khi người học đã có báo cáo khác đang mở cho cùng nội dung: trả `REPORT_REOPEN_CONFLICT` (409) thay vì 500.
- **Mỗi chủ điểm đúng một bài** (người dùng chốt ngày 18/11/2026, đóng ISSUE-012). Bài giảng đủ các phần: lý thuyết, cấu trúc, ví dụ mẫu, bài tập mẫu, mẹo làm bài TOEIC.
  - Ràng buộc ở service (tạo bài thứ hai, đổi bài sang chủ điểm đã có bài, khôi phục khi chủ điểm đã có bài khác đều trả `GRAMMAR_ARTICLE_EXISTS` 409).
  - Ràng buộc ở database: `UX_GrammarArticle_Topic ON GrammarArticle(GrammarTopicId) WHERE IsDeleted = 0`, chặn cả hai request đồng thời.
  - Bài trong thùng rác vẫn sửa được.
  - Cột `SortOrder` giữ mặc định 1, không còn trong API.
- **Bài học tương tác, "học đến đâu, luyện đến đó"** (người dùng yêu cầu 18/11/2026). Vẫn lưu trong một nội dung HTML, không tách cột:
  - mỗi phần mở đầu bằng `<h2>` và đi theo nhịp lý thuyết → cấu trúc → ví dụ → câu "Thử ngay"; cuối bài là mẹo TOEIC và bài tập tổng hợp;
  - khối định dạng: `grammar-structure`, `grammar-example`, `grammar-tip`;
  - câu "Thử ngay": `div.grammar-exercise` chứa câu hỏi, `ol.grammar-options > li` (đáp án đúng có class `grammar-correct`) và `div.grammar-explain`. Trang người học dựng thành nút chọn: chọn xong báo đúng/sai, tô đáp án đúng, hiện giải thích, cho làm lại. Toàn bộ xử lý ở client, không lưu tiến độ lên server;
  - đáp án nằm trong HTML gửi về trình duyệt. Chấp nhận được vì đây là bài luyện trong bài học, không chấm điểm;
  - khối bài tập dạng cũ (đáp án trong `<details>`) vẫn hiển thị như HTML thường;
  - Admin soạn bài mới với khung mẫu điền sẵn. Câu "Thử ngay" soạn bằng form (câu hỏi, 2–4 lựa chọn, đáp án đúng, giải thích; văn bản được escape). Phần học thiếu ví dụ/bài tập, bài thiếu mẹo TOEIC hoặc bài tập sai cấu trúc thì có gợi ý, không chặn lưu.
- **Đọc bài cần đăng nhập**, danh sách chủ điểm thì công khai. Theo UC-18 (precondition "Đã đăng nhập") và quy tắc truy cập trong `TOEIC_Code_Style.md`.
- **HTML bài ngữ pháp được lọc hai lần:** `HtmlSanitizer` khi lưu (chỉ giữ 7 class khung bài và bài tập, bỏ class lạ, `id`, `style`, script), `DOMPurify` khi hiển thị. Nội dung chỉ còn thẻ rỗng sau khi lọc bị coi là thiếu nội dung (E1).
- **Bộ clip sưu tầm (TH2):**
  - Chỉ hiện cho người học khi Admin đã xuất bản. Xuất bản cần loại bài (phân loại **lá** của đúng Part), Level và ít nhất một clip.
  - Truy cập miễn phí, vì không thuộc bộ đề nào nên không có cấu hình quyền Nghe VIP. **Cần xác nhận** nếu muốn khóa VIP.
  - Không cho đổi Part khi đã có clip, vì vai trò clip ràng buộc theo Part.
  - Xóa mềm bộ clip cũng ẩn nó. Khôi phục giữ trạng thái ẩn để Admin kiểm tra lại.
- **Tác vụ nền tự nộp** chờ thêm 120 giây sau hạn chót, vì client có thể chưa kịp gửi thời gian xem hướng dẫn cuối cùng. Đường tự nộp lười vẫn giữ.
  - Hai đường không chấm trùng: `FinalizeAsync` chỉ chốt khi trạng thái còn `IN_PROGRESS`.
  - Thời điểm nộp ghi đúng hạn chót, không ghi lúc tác vụ chạy.

## 2. API

### Người học

| Method | Route | Quyền | Mục đích |
|---|---|---|---|
| GET | `/api/grammar/topics` | Công khai | Thêm `grammarTopicId`, `hasArticle` cho mỗi chủ điểm |
| GET | `/api/grammar/topics/{grammarTopicId}/article` | Đăng nhập | `{ topic, article }`: bài học duy nhất kèm nội dung (HTML đã lọc); `article = null` là "Đang cập nhật" |
| POST | `/api/reports` | Đăng nhập | `targetType`: `QUESTION`, `VOCABULARY`, `GRAMMAR_ARTICLE`, `LISTENING_ITEM`; kèm đúng một trong `questionId`, `vocabId`, `articleId`, `listeningItemId` |
| GET | `/api/reports` | Đăng nhập | Thêm `articleId`, `listeningItemId`, `targetTitle`, `examId`, `targetDeleted` |
| GET | `/api/dictation/items?source=EXAM\|STANDALONE` | Công khai | Lọc nguồn bộ clip; bỏ trống = cả hai |
| GET | `/api/dictation/sets` | Công khai | Thêm `standaloneItems` |

`DictationItemDto` thêm `sourceKind` (`EXAM`/`STANDALONE`) và `sourceNote`. Với bộ sưu tầm, các trường `groupId`, `examId`, `examCode`, `examTitle`, `examSetId`, `examSetName`, `groupOrder` là `null`.

Lọc theo `examSetId`, `examId` hoặc `specialTagId` chỉ trả bộ cắt từ đề. Lọc theo `categoryId`, `levelNo`, `partNo` gồm cả hai loại.

### Admin (ADMIN)

| Method | Route | Mục đích |
|---|---|---|
| GET | `/api/admin/grammar-articles/topics` | 15 chủ điểm cố định kèm bài hiện hành (`articleId`, `articleTitle`, `articleUpdatedAt`; null = chưa có bài) |
| GET | `/api/admin/grammar-articles?grammarTopicId&search&isDeleted&page&pageSize` | Danh sách bài không kèm nội dung (màn Admin dùng cho thùng rác) |
| GET | `/api/admin/grammar-articles/{id}` | Chi tiết (kể cả bài đã xóa) |
| POST / PUT | `/api/admin/grammar-articles[/{id}]` | `{ grammarTopicId, title, content }`; chủ điểm đã có bài → 409 `GRAMMAR_ARTICLE_EXISTS` |
| DELETE | `/api/admin/grammar-articles/{id}` | Xóa mềm |
| POST | `/api/admin/grammar-articles/{id}/restore` | Khôi phục; chủ điểm đã có bài khác → 409 |
| GET | `/api/admin/listening-items?partNo&isPublished&isDeleted&search&page&pageSize` | Bộ clip sưu tầm |
| GET | `/api/admin/listening-items/{id}` | Chi tiết bộ và các clip (`mediaId` của audio hiện hành) |
| POST / PUT | `/api/admin/listening-items[/{id}]` | `{ partNo, categoryId?, levelNo?, sourceNote? }` |
| PUT | `/api/admin/listening-items/{id}/status` | `{ isPublished }` |
| DELETE | `/api/admin/listening-items/{id}` | Xóa mềm (đồng thời ẩn) |
| POST | `/api/admin/listening-items/{id}/restore` | Khôi phục (vẫn ẩn) |
| POST / PUT / DELETE | `/api/admin/listening-items/{id}/clips[/{clipId}]` | Clip `{ seqNo?, clipRole, transcriptEn, translationVi?, speaker? }` |
| POST | `/api/admin/listening-items/{id}/clips/{clipId}/media` | Tải audio (multipart `file`, MP3/WAV), thay audio cũ |

Nghe thử và xóa audio clip dùng API media sẵn có: `GET /api/admin/media/{id}/url`, `DELETE /api/admin/media/{id}`. `GetMediaAsync` nay nhận cả clip của bộ sưu tầm.

### Mã lỗi mới

| Mã | HTTP | Khi nào |
|---|---|---|
| `GRAMMAR_ARTICLE_NOT_FOUND`, `GRAMMAR_TOPIC_NOT_FOUND` | 404 | Bài/chủ điểm không có hoặc bài đã xóa (phía người học) |
| `GRAMMAR_ARTICLE_EMPTY` | 400 | Thiếu tiêu đề hoặc nội dung (kể cả rỗng sau khi lọc HTML) |
| `GRAMMAR_TOPIC_INVALID` | 400 | Chủ điểm không thuộc danh sách |
| `GRAMMAR_ARTICLE_EXISTS` | 409 | Chủ điểm đã có bài (mỗi chủ điểm một bài): tạo bài thứ hai, đổi chủ điểm, khôi phục |
| `LISTENING_ITEM_NOT_FOUND`, `CLIP_NOT_FOUND` | 404 | |
| `LISTENING_CATEGORY_INVALID`, `LISTENING_LEVEL_INVALID` | 400 | Loại bài không phải lá đúng Part / Level không có |
| `LISTENING_CLIP_ROLE_INVALID`, `LISTENING_CLIP_EMPTY` | 400 | Vai trò sai Part (E1) / thiếu script |
| `LISTENING_ITEM_CLASSIFICATION_REQUIRED` | 409 | Xuất bản hoặc giữ xuất bản mà thiếu loại bài/Level |
| `LISTENING_ITEM_EMPTY` | 409 | Xuất bản bộ chưa có clip, hoặc xóa clip cuối của bộ đang xuất bản |
| `LISTENING_ITEM_PART_LOCKED` | 409 | Đổi Part khi đã có clip |
| `LISTENING_CLIP_CONFLICT` | 409 | Trùng thứ tự hoặc vai trò (A/B/C/D/QUESTION) trong bộ |
| `REPORT_REOPEN_CONFLICT` | 409 | Mở lại báo cáo khi đã có báo cáo mở khác cho cùng nội dung |

## 3. Cấu hình tác vụ nền tự nộp (`AttemptAutoSubmitWorker`)

| Khóa | Mặc định | Ý nghĩa |
|---|---|---|
| `Learning:AutoSubmitIntervalSeconds` | 60 | Chu kỳ quét (tối thiểu 10); `0` để tắt tác vụ nền |
| `Learning:AutoSubmitGraceSeconds` | 120 | Chờ thêm sau hạn chót (5–3600) |
| `Learning:AutoSubmitBatchSize` | 50 | Số lượt mỗi lần quét (1–500); đủ lô thì quét tiếp ngay |

Lỗi CSDL tạm thời chỉ ghi log rồi thử lại ở chu kỳ sau. Đường tự nộp lười vẫn bảo đảm chốt bài.

## 4. Giao diện

**Người học (`ToeicMindFE`)**

- Hộp báo lỗi dùng chung `features/reports/ReportDialog.jsx`, mỗi loại nội dung có danh sách loại lỗi riêng. Nút báo lỗi có ở:
  - câu hỏi: Luyện tập, xem lại (giữ nguyên);
  - từ vựng: thẻ từ trong đáp án chi tiết, danh sách từ;
  - bài ngữ pháp;
  - trình Nghe chép.
- Không có nút báo lỗi trong Luyện thi (ASM-06).
- Trang `/read/grammar/topics/:topicId` hiện bài học tương tác của chủ điểm:
  - mục lục các phần (tự dựng từ `<h2>`, đánh dấu ✓ khi làm hết câu "Thử ngay" của phần) và thanh tiến độ "Đã làm x/y · đúng z";
  - câu "Thử ngay" bấm chọn đáp án → đúng/sai, giải thích, làm lại; cuối bài tổng kết số câu đúng và nút "Luyện chủ điểm này";
  - trạng thái "Đang cập nhật" khi chủ điểm chưa có bài. Thẻ chủ điểm ở tab Ngữ pháp có liên kết "Đọc bài học".
  - Tách nội dung thành đoạn HTML và bài tập ở `features/grammar/grammarLesson.js` (tiến độ có unit test).
- Nghe chép:
  - thêm mục "Clip sưu tầm (n)";
  - thẻ và trình luyện hiển thị ghi chú nguồn thay cho tên đề;
  - hàng đợi chuyển bộ dùng nguồn `STANDALONE`.
- "Báo lỗi của tôi" hiện tên nội dung cho cả bốn loại.

**Admin (`ToeicMindAdmin`)**

- Menu mới "Bài ngữ pháp" (`/grammar`):
  - bảng 15 chủ điểm với trạng thái "Chưa có bài" hoặc tiêu đề bài, nút "Soạn bài" / "Sửa bài" / "Xóa"; thùng rác có nút khôi phục;
  - soạn bằng `PassageEditor` biến thể `article`: Phần (H2), Mục (H3), danh sách, các khối + Cấu trúc / + Ví dụ / + Mẹo TOEIC, chế độ HTML; "+ Bài tập" mở form và chèn câu "Thử ngay" đúng vị trí con trỏ; khung soạn trực quan tô đáp án đúng và giải thích. Khung bài, khối và gợi ý hoàn thiện nằm trong `features/exams/utils/grammarArticle.js` (có unit test);
  - mở thẳng một bài bằng `?article={id}`.
- Menu mới "Clip nghe sưu tầm" (`/listening`):
  - danh sách và lọc;
  - chi tiết bộ clip: phân loại, clip, tải/nghe/xóa audio, xuất bản/ẩn, xóa/khôi phục;
  - mở thẳng một bộ bằng `?item={id}`.
- "Báo lỗi":
  - hiện loại và tên nội dung, nhãn "Nội dung đã xóa" (UC-26 E1);
  - nút "Mở nội dung" tới màn sửa đề, bài ngữ pháp hoặc bộ clip.
  - Từ vựng chưa có màn quản trị (UC-23) nên chưa có liên kết.

## 5. Kiểm chứng (18/11/2026)

| Hạng mục | Kết quả |
|---|---|
| Backend `dotnet build` | 0 warning, 0 error |
| Tầng repository/service trên `ToeicDb_test_v1` (SQL Server thật) | **48/48 đạt** (lần chạy cuối, gồm lưu bài mẫu Danh từ tương tác qua service thật: giữ đủ 11 câu "Thử ngay"). Truy vấn đọc chạy thẳng, gồm truy vấn tìm lượt quá hạn của tác vụ nền (khớp số đếm bằng SQL tay). Thao tác ghi chạy trong một transaction rồi **rollback**; kiểm tra cuối xác nhận database không đổi. |
| FE người học: lint, 90 unit test, build | Đạt |
| FE người học: `check-learner-ui.mjs` (Chromium + API giả) | Đạt, thêm 2 bước: bài học ngữ pháp tương tác (thứ tự lý thuyết → ví dụ → thử ngay, chọn sai/đúng, giải thích, làm lại, mục lục ✓ và tiến độ, dạng cũ vẫn hiển thị, lọc HTML, "Đang cập nhật", báo lỗi bài); clip sưu tầm và báo lỗi bộ clip. Thêm trang bài ngữ pháp vào kiểm tra 320px. |
| FE người học: `check-vocab-ui.mjs` | Đạt |
| Admin: lint (không có cảnh báo mới), 66 unit test (thêm `tests/grammarArticle.test.js`), build | Đạt |
| Admin: `scripts/check-admin-content.mjs` (mới) | Đạt: bài ngữ pháp (một bài/chủ điểm, khung bài học tương tác, gợi ý hoàn thiện, form "+ Bài tập", chặn khôi phục trùng), clip sưu tầm, liên kết từ Báo lỗi |
| Admin: `check-admin-navigation.mjs` | Đạt |

Các kiểm tra 48 mục gồm:
- lọc HTML độc hại nhưng giữ các class khung bài, bài tập tương tác và `<details>`;
- mỗi chủ điểm một bài: tạo bài thứ hai, đổi sang chủ điểm đã có bài, khôi phục trùng đều trả 409; bài trong thùng rác vẫn sửa được;
- chủ điểm chưa có bài trả `article = null`;
- E1/E2 của UC-25;
- chặn xuất bản khi thiếu phân loại hoặc clip;
- loại bài sai Part hoặc không phải lá;
- vai trò sai Part;
- trùng thứ tự clip trả 409;
- khóa đổi Part;
- bộ sưu tầm hiện trong Nghe chép và không lẫn vào lọc theo bộ đề;
- báo lỗi khác loại cho cùng câu trả 409 (trước là 500);
- báo lại sau khi báo cáo cũ đã đóng;
- mở lại báo cáo gây xung đột trả 409;
- đánh dấu nội dung đã xóa.

Lưu ý: các thao tác ghi đã rollback vẫn tiêu tốn giá trị IDENTITY, nên mã kế tiếp của `GrammarArticle`, `ListeningItem`, `ListeningClip`, `Report` sẽ nhảy cách. Không ảnh hưởng dữ liệu.

## 6. Hạn chế và việc tiếp theo

- **Chạy lại `01_schema.sql`** (hoặc riêng lệnh tạo `UX_GrammarArticle_Topic`) trên database đích. Lệnh có `IF NOT EXISTS` nên chạy lặp an toàn. Chưa chạy thì vẫn có kiểm tra ở service, chỉ thiếu chặn khi hai request lưu đồng thời.
- **Khởi động lại backend** sau lần đổi sang một bài/chủ điểm (route người học đổi thành `/api/grammar/topics/{id}/article`).
- Bằng chứng chạy thật của UC-04: backend được khởi động lại lúc 16:06 ngày 18/11 với bản có tác vụ nền. Các lượt quá hạn trong `ToeicDb_test_v1` đã được tự nộp, ví dụ lượt #14 có `IsAutoSubmitted = 1`, `SubmittedAt` bằng đúng hạn chót.
- Chưa chạy HTTP đầu-cuối có token, chưa upload R2 thật cho audio clip sưu tầm. `DeleteClipAsync` và `SaveClipAudioAsync` (tự mở transaction) chưa được gọi trên SQL thật; phía Admin đã kiểm bằng API giả.
- UC-26 còn thiếu: đóng hàng loạt các báo cáo cùng nội dung (A3), và liên kết sửa từ vựng (cần UC-23).
- Bộ clip sưu tầm chưa có quyền VIP riêng (đang miễn phí) và chưa có nhập hàng loạt từ file (TH2 bước "tải file").

## 7. Bài mẫu

`G:\ToeicMind\samples\bai-ngu-phap-danh-tu.txt`: bài học tương tác chủ điểm Danh từ (5 phần học, mẹo TOEIC, bài tập tổng hợp; 11 câu "Thử ngay"). Dán vào "Mã nguồn HTML" trong màn soạn bài. Xem thử bằng backend giả: đặt biến `MOCK_GRAMMAR_FILE` tới tệp này khi chạy giao diện người học với `mock-learner-content.mjs`.
