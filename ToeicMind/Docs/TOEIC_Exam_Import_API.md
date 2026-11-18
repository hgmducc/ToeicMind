# Nhập nội dung Admin — P05, 30/10/2026

Cập nhật 13/11/2026: bốn endpoint dưới đây tiếp tục được dùng cho Excel/media. Hai route `POST /api/admin/exams/import-v1` và `PUT /api/admin/exams/{examId}/import-v1` đã gỡ cùng mapper/DTO riêng; CRUD nhóm đơn lẻ cũng đã gỡ khỏi HTTP API. Repository lưu/xóa nhóm vẫn được transaction cả gói sử dụng. Xem [báo cáo dọn API](API_CLEANUP_2026-11-13.md). Các số liệu OpenAPI cuối tài liệu là lịch sử; binary hiện tại có 98 operation.

Nguồn SQL duy nhất vẫn là `../DATABASE`. Các bảng Vocabulary, VocabularyContext, ListeningItem, ListeningClip đã có; không tạo bộ schema thứ hai. Chỉ thêm `Exam.ImportSourceJson` và metadata clip vào `01_schema.sql` với guard COL_LENGTH. Đã áp dụng cập nhật schema trên ToeicDb trong lượt kiểm tra; sự cố chuyển database và kết quả kiểm tra được ghi rõ ở [báo cáo Admin](../../ToeicMindAdmin%20-%20Copy/docs/ADMIN_AUDIT.md).

## API và quyền

Cả bốn endpoint chỉ cho ADMIN và tiếp tục kiểm tra vai trò/trạng thái hiện hành:

| Method | Route | Kết quả |
|---|---|---|
| POST | `/api/admin/exams/import` | 201 ExamDto; tạo DRAFT, không xuất bản |
| PUT | `/api/admin/exams/{examId}/content` | 200 ExamDto; thay nội dung toàn bộ, giữ ID được gửi lại |
| GET | `/api/admin/exams/{examId}/import-source` | 200 object chứa mọi sheet; 204 nếu chưa lưu nguồn |
| POST | `/api/admin/exams/{examId}/groups/{groupId}/segments/{clipId}/media` | multipart file; 201 MediaFileDto |

POST/PUT nhận `SaveExamContentRequestDto`: các trường `SaveExamRequestDto`, `groups` (1–200), `sourceSheets` tùy chọn. Mỗi group có các trường SaveGroupRequestDto và groupId tùy chọn khi sửa. Nhóm vắng trong PUT được xóa mềm. Câu có questionId giữ ID; clip có clipId giữ ID; không gửi ID khi tạo mới. Part của nhóm không được đổi. Nội dung chỉ sửa ở DRAFT và chưa có lịch sử, bao gồm lịch sử BANK.

`sourceSheets` là object tên sheet → mảng các dòng, giữ mọi cột gốc; tối đa 5 triệu ký tự JSON, body tối đa 10 MiB. Đây là bản nguồn để đối soát, không phải DTO nội dung hiện hành hoặc bằng chứng các URL/file tham chiếu đã tải lên R2. Frontend phải kiểm tra liên kết mồ côi của Vocab/Audio_Segments trước khi gửi.

## Vocab và audio cắt

SaveQuestionRequestDto bổ sung `vocabularies` tùy chọn (tối đa 200). Bỏ trường khi cập nhật giữ từ cũ; mảng rỗng xóa mềm ngữ cảnh của câu. Mỗi mục có term/base (1–100), pos (`n,v,adj,adv,prep,phr,phr.v`), cefr (A1–C2), meaningBase bắt buộc (1–500), termMeaningVi, ipa, definitionEn, exampleEn/Vi. Nghĩa gốc lưu Vocabulary.MeaningVi; nghĩa theo câu lưu VocabularyContext.ContextMeaningVi. Từ đang có hoặc đã xóa mềm dùng lại VocabId theo Lemma/PosCode, khôi phục khi cần và **giữ nghĩa gốc đã lưu** theo DB-DEC-21/UC-21. Nếu từ mới lặp trong cùng lô với nhiều nghĩa gốc, giữ nghĩa của lần xuất hiện đầu tiên. Khác nghĩa không chặn import hoặc cập nhật nội dung; nghĩa theo ngữ cảnh và ví dụ vẫn lưu riêng cho từng câu. Cặp ngữ cảnh trùng vẫn bị từ chối.

Cập nhật 31/10/2026: POST import và PUT content trả thêm `importWarnings` trong ExamDto (mảng rỗng nếu không có khác biệt). Mỗi dòng có `code: "VOCAB_MEANING_PRESERVED"`, `questionNo`, `term`, `base`, `pos`, `importedMeaningBase`, `storedMeaningBase`, `message`. Đây là thông tin đối soát sau khi transaction thành công, không phải lỗi yêu cầu Admin xử lý; frontend hiển thị riêng với thông báo lưu/media. Các API đọc ExamDto khác không có trường này. `sourceSheets` giữ nguyên dữ liệu nguồn; đọc lại nội dung nhóm trả nghĩa từ điển được bảo toàn.

SaveGroupRequestDto bổ sung `audioSegments` tùy chọn (tối đa 500). Bỏ trường giữ clip cũ, mảng rỗng xóa mềm clip/media. Mỗi mục: clipId chỉ khi sửa, seq, clipKey, role, text, translationVi, speaker, sourceAudio, clipAudio, textSource, startSec/endSec/durationSec. Role Part 1 là OPTION_A–D, Part 2 là QUESTION/OPTION_A–C, Part 3/4 là SENTENCE. Thứ tự/mã/role không được trùng; thời gian không âm, end không trước start. Clip của đề dùng ListeningItem.GroupId; không mở API luyện nghe V2 hoặc tự xuất bản ListeningItem.

Response QuestionDto có vocabularies đủ trường nghĩa và ví dụ. QuestionGroupDto có audioSegments gồm ID, metadata và media của từng clip. API URL ký và xóa media hỗ trợ clip, kiểm tra đúng nhóm/đề và khóa lịch sử. Audio clip không được lưu bằng route audio nhóm vì mỗi nhóm chỉ có một audio chính.

## Transaction và lỗi

Validation nội dung diễn ra trước ghi dữ liệu; kiểm tra phân loại, uniqueness, từ điển, trạng thái và lịch sử nằm trong transaction Serializable. Nhập lỗi bất kỳ rollback cả metadata đề, nhóm, câu, đáp án, từ mới và ngữ cảnh. Dữ liệu raw không được dùng để vượt các quy tắc backend. Giải thích sai nhãn vẫn bị từ chối cả ở nháp nếu đã điền; không tự chữa lời giải hoặc đáp án.

Upload R2 là bước sau commit nội dung, có lỗi riêng và có thể thử lại. Main audio, clip audio và ảnh có owner/slot riêng. Không coi SQL rollback là rollback object storage; cơ chế cleanup hiện có chỉ dọn object mới khi chắc chắn chưa đăng ký DB. URL ký không được log.

## Kiểm chứng

Các test tích hợp cũ (86 test) đã gỡ cùng project kiểm thử ngày 06/11/2026; mục này không còn bằng chứng đi kèm.

Browser Chromium với backend/R2 thật: lưu đề nháp tổng hợp hợp lệ, mở lại đủ 5 sheet, phát main audio/clip và giải mã ảnh qua URL ký. Object audit được dọn bằng tên/key riêng và database thử được xóa sau nghiệm thu. Google/OTP dùng mock riêng, không coi là đăng nhập/gửi email thật.

Test_1 đọc đủ 200 câu/1.694 vocab/303 segments; Test_3 đủ 200/1.812/201. Hai nguồn lần lượt có 185/19 lỗi nhãn OptionExplanations, API từ chối không ghi dòng nào. Chưa nhập hoặc xuất bản hai đề thật; cần biên tập dữ liệu nguồn. Xem [báo cáo đầy đủ](../../ToeicMindAdmin%20-%20Copy/docs/ADMIN_AUDIT.md).


Cập nhật nghiệm thu 31/10/2026: kiểm thử nhập một đề nháp tổng hợp đủ 200 câu, 1.812 vocab, 201 segments và đọc lại đủ Questions/Vocab/Audio_Segments/Dict/Media đã qua. Bộ hồi quy SQL Server 86/86, không skip, gồm API seed hướng dẫn mặc định chỉ thêm mục thiếu/giữ nội dung đã sửa và kiểm tra quyền. OpenAPI hiện có 49 thao tác/38 đường dẫn. Browser qua 13 nhóm kiểm tra; sửa nội dung giữ ID, CRUD/khôi phục, hướng dẫn riêng, phân trang và thử lại clip lỗi không tạo trùng đề. Các lỗi 503 và Google/OTP dùng mock rõ ràng. Đã dọn object/database audit.
