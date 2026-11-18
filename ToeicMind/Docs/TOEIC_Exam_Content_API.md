# API nội dung đề, hướng dẫn, media và xuất bản

Ngày triển khai: 30/10/2026. Task P03-02/03/04; UC-19/20/22; thiết kế database v1.3 và quyết định người dùng về mã đề, khóa lịch sử, R2 riêng tư. Tiếp nối [API bộ đề/thông tin đề](TOEIC_Exam_API_Implementation.md).

Cập nhật P05 trong cùng ngày: đã có API nhập/lưu toàn bộ nội dung, vocab và audio cắt riêng; xem [TOEIC_Exam_Import_API.md](TOEIC_Exam_Import_API.md). Các ghi chú “chưa có import” bên dưới là lịch sử của đợt P03. Kiểm thử mới nhất 86/86; browser đã phát main/clip và xem ảnh R2 thật trên đề nháp tổng hợp. Hai file Test_1/Test_3 vẫn bị chặn bởi 185/19 lỗi giải thích nguồn.

Cập nhật nguồn SQL theo người dùng: chỉ dùng bộ **`../DATABASE` đã triển khai**, không dùng các file 001–006 rút gọn trong backend nữa. Các kết quả kiểm thử bên dưới là bằng chứng đợt trước; project kiểm thử đã gỡ ngày 06/11/2026. Chưa áp dụng bộ script đã gộp vào ToeicDb. Xem [hướng dẫn cập nhật tại chỗ](TOEIC_Database_Scripts.md).

## 1. Route và quyền

Toàn bộ thao tác dưới đây cần JWT ADMIN, trừ `GET /api/exam-catalogs` cho mọi tài khoản đã đăng nhập. Token được kiểm tra vai trò/trạng thái tài khoản hiện hành. Không mở API lấy nội dung đáp án hay URL media cho LEARNER ngoài lượt làm; P06/P08 sẽ bổ sung DTO/quyền theo Attempt.

| Method | Route | Chức năng |
|---|---|---|
| GET | `/api/exam-catalogs` | 7 Part, 4 Level, phân loại đang hoạt động kèm IsLeaf, 5 cờ |
| GET | `/api/admin/exams/{examId}/groups?partNo=1` | Nhóm/câu/đáp án/media metadata, sắp theo GroupOrder; tối đa 200 câu trong một đề |
| GET | `/api/admin/exams/{examId}/groups/{groupId}` | Chi tiết nhóm thuộc đúng đề |
| POST | `/api/admin/exams/{examId}/groups` | Tạo nhóm và câu/đáp án, trả 201 cùng Location |
| PUT | `/api/admin/exams/{examId}/groups/{groupId}` | Sửa toàn bộ nhóm; câu có ID giữ nguyên ID, câu không có ID là thêm mới |
| DELETE | `/api/admin/exams/{examId}/groups/{groupId}` | Xóa mềm nhóm, câu và metadata media; giữ file R2 |
| DELETE | `/api/admin/exams/{examId}/groups/{groupId}/questions/{questionId}` | Xóa mềm một câu của nhóm |
| GET | `/api/admin/directions?examId=1&effective=true` | Bản riêng ưu tiên hơn mặc định; bỏ examId lấy mặc định, effective=false chỉ lấy đúng phạm vi |
| POST | `/api/admin/directions` | Tạo mục mặc định hoặc bản riêng, trả 201 |
| PUT | `/api/admin/directions/{id}` | Sửa nội dung tại chỗ, không đổi khóa phạm vi/kind/skill/part |
| DELETE | `/api/admin/directions/{id}` | Xóa mềm bản riêng để dùng lại mặc định; không xóa mục mặc định |
| POST | `/api/admin/exams/{examId}/groups/{groupId}/media` | Multipart `file`, query `altText` tối đa 300, `sortOrder` 1–255 |
| POST | `/api/admin/directions/{id}/media` | Multipart `file` cho hướng dẫn |
| GET | `/api/admin/media/{id}/url` | URL ký GET xem trước, trả Url/ExpiresAt UTC, Cache-Control: no-store |
| DELETE | `/api/admin/media/{id}` | Xóa mềm metadata, giữ object R2 |
| GET | `/api/admin/exams/{examId}/publish-check` | Dry-run, trả isValid và toàn bộ issues; không ghi dữ liệu |
| POST | `/api/admin/exams/{examId}/publish` | Kiểm tra và xuất bản nguyên giao dịch; 200 hoặc 400 kèm issues |
| POST | `/api/admin/exams/{examId}/unpublish` | Chuyển về DRAFT; không mở khóa nếu đã có lịch sử |

Cộng với đợt đầu: **34 operation trên 23 path đề thi**. Có request mẫu trong `ToeicMind.Exams.http`; có thể chọn file upload trực tiếp trên Swagger.

## 2. Nhóm/câu/đáp án

Request nhóm có `partNo`, `categoryId` của lá đang hoạt động trong Part đó; tùy chọn `groupOrder`, `groupLevelNo`, `passageHtml`, `transcriptEn`, `translationVi`, `specialTagIds`, `questions`. GroupOrder tự lấy số câu nhỏ nhất; nhóm chưa có câu phải nhập GroupOrder. Chỉ lưu dữ liệu dùng chung một lần ở nhóm; không nhận GroupId/ExamId/IsDeleted từ body.

Mỗi câu có `questionId` (chỉ khi sửa câu đã có trong chính nhóm), `questionNo` 1–200, `levelNo` 1–4, `questionText`, `explanation`, `optionExplanations`, `options`. Mỗi option có `optionLabel`, `optionText`, `isCorrect`; không nhận OptionId để đổi câu sở hữu. Không serialize entity/navigation ra response.

- Nháp được thiếu câu/đáp án/giải thích/độ khó/media. Cỡ nhóm tối đa 1/1/3/3/1/4/5 theo Part; số tối thiểu và đủ nội dung kiểm tra khi xuất bản.
- Part 2 chỉ A/B/C; Part khác A–D. Không lặp nhãn hoặc có hơn một đáp án đúng. Các phương án đã lưu chỉ sửa tại chỗ, không bỏ riêng khỏi request; giữ ID khi đổi đáp án đúng.
- `optionExplanations` trống được phép ở Nháp. Nếu đã điền: một dòng mỗi nhãn theo thứ tự; đúng một dấu nhãn Đúng/Sai mỗi dòng, đúng một dòng Đúng khớp đáp án. Hỗ trợ `-`, `–`, `—`; từ chối nhãn lặp và `Sai/Đúng`. Lưu nguyên khối, không tự viết lý do.
- PUT là thay thế danh sách câu của nhóm: ID có trong request được sửa, không có ID là thêm; các câu cũ không còn trong request được xóa mềm. Nếu muốn giữ ID phải gửi lại questionId. Không đổi Part của nhóm đã tạo. Thứ tự nhóm và số câu trùng trong nội dung chưa xóa trả 409. Giữ filtered unique `(ExamId, GroupOrder) WHERE IsDeleted=0` của script gốc; nhóm xóa mềm giải phóng thứ tự đó.
- PassageHtml chỉ Part 6/7 và qua HtmlSanitizer; giữ bảng, đoạn và `<hr>`, loại script/event/URL nguy hiểm. Transcript chỉ Part 1–4; GroupLevel chỉ Part 3/4/6/7; TranslationVi ở mọi Part. Cờ phải thuộc đúng Part.

## 3. Khóa nội dung và xuất bản

Nội dung chỉ sửa khi đề DRAFT và chưa có lịch sử. Khóa được kiểm tra **trong transaction Serializable**, gồm cả `Attempt.ExamId` và câu được tham chiếu từ `AttemptAnswer` của BANK. Ẩn lịch sử không mở khóa. Mã/bộ cũng bị khóa sau lịch sử; tên/mô tả vẫn sửa được. Sửa lớn tạo đề mới; không tự tạo snapshot/phiên bản mới trong đợt này.

Hướng dẫn mặc định chỉ bị khóa nếu có đề có lịch sử thực sự dùng mục mặc định đó. Đề có bản ghi đè không khóa bản mặc định tương ứng. Hướng dẫn riêng, media của nhóm và media hướng dẫn cũng chịu cùng kiểm tra lịch sử. Quyền đổi trạng thái DRAFT/PUBLISHED không thay thế khóa nội dung.

`sp_ValidateExam` trả từng vấn đề theo Code/Message/PartNo/GroupId/QuestionId: số câu chuẩn 6/25/39/30/30/16/54, cỡ/thứ tự/phạm vi nhóm, số câu đúng Part, loại lá, bản dịch, transcript/audio Listening, hình Part 1 hoặc cờ chart_or_table, passage/độ khó nhóm, level/giải thích/OptionExplanations, đủ phương án có nội dung và đúng một phương án đúng, 9 hướng dẫn hiệu lực.

Tầng ứng dụng kiểm tra nhãn OptionExplanations nguyên khối. Khi publish, transaction giữ khóa đọc nội dung tới lúc `sp_PublishExam` chốt trạng thái; cả lỗi ứng dụng và SQL được trả cùng báo cáo. Chuyển về Nháp trước khi sửa đề xuất bản; đề có lịch sử vẫn khóa sau khi về Nháp. Kiểm tra xuất bản dựa vào metadata media đã đăng ký qua upload, không quét lại toàn bucket R2.

## 4. Media R2

Runtime dùng AWSSDK.S3 **4.0.104.8**, endpoint S3 trong secret config, region `auto`, ForcePathStyle; checksum chỉ dùng khi bắt buộc để tương thích R2. Không dùng public URL hoặc trường Token value trong note cho S3. Key tương đối do server sinh, có exam/Part/số câu đầu, tên file rút gọn và GUID; không nhận key/URL từ client. Chỉ lưu StorageKey và loại file theo schema v1.3.

Chấp nhận MP3, WAV, PNG, JPEG; đối chiếu signature đầu/cuối với đuôi file, không tin Content-Type client. Đây là nhận diện container, chưa phải giải mã/phát kiểm tra toàn bộ audio. Mặc định tối đa audio 25 MiB, image 10 MiB; body multipart tối đa 50 MiB. Cấu hình `Media__MaxAudioBytes`, `Media__MaxImageBytes`, `R2__SignedUrlMinutes` (mặc định 10, giới hạn 1–60 phút).

Một audio mỗi nhóm Listening; upload audio mới thay slot bằng cách xóa mềm metadata cũ. Hướng dẫn tối đa một audio/một image, cũng thay slot. Hình nhóm thêm theo SortOrder. File cũ giữ nguyên cho tham chiếu lịch sử; URL đã cấp có hiệu lực tới hạn, không coi xóa mềm là thu hồi tức thời URL đã ký.

Upload R2 dùng key duy nhất trước khi đăng ký DB; repository kiểm tra lại quyền sửa sau upload. Nếu đăng ký thất bại, chỉ dọn key mới **khi xác nhận DB chưa đăng ký key**. Nếu trạng thái commit không xác định hoặc cleanup thất bại, giữ object và log mã cleanup/key để xử lý, không xóa object có thể đã được tham chiếu. SQL rollback không được coi là rollback R2. Không log credential hoặc URL ký.

API URL hiện chỉ dành cho ADMIN xem trước. Cấp URL theo Attempt, số lần phát Listening, reconnect và player thuộc P06/P08; chưa tuyên bố đã kiểm thử phát audio thật trên trình duyệt.

## 5. Schema và kiểm chứng

Nguồn chuẩn: `ToeicMindBE/DATABASE`. Database đã có chỉ cập nhật bằng `01_schema.sql` → `02_views_procs_triggers.sql` → `03_seed.sql`, dùng `-f 65001 -b`, không chạy file `00`. Đã xóa 6 file SQL trùng/rút gọn trong backend. API không tự chạy DDL.

Các thay đổi auth/bộ đề/cột nội dung/ContextMeaningVi được gộp vào `DATABASE/01_schema.sql` dưới dạng cập nhật tại chỗ. Giữ cột legacy để không mất dữ liệu; FK/CHECK/index gốc được giữ hoặc điều chỉnh phần cần thiết. `DATABASE/02_views_procs_triggers.sql` có fn_ExamHasHistory và hai procedure, giữ toàn bộ các view/trigger gốc. `03_seed.sql` giữ nguyên dữ liệu seed, không ghi đè nội dung đã sửa. DbContext vẫn tối giản, không dùng EnsureCreated/Migrate.

Lịch sử đợt trước: đã bổ sung nội dung vào ToeicDb, khi kiểm tra Exam/QuestionGroup/Question/Media vẫn 0 dòng, giữ 9 hướng dẫn/119 phân loại. Lần chuyển nguồn hiện tại sửa file và kiểm tra trên database test riêng; chưa chạy bộ script đã gộp vào ToeicDb, không nhập Test_3 hoặc tạo Attempt trong database ứng dụng.

- Các test tích hợp cũ (78 test) đã gỡ cùng project kiểm thử ngày 06/11/2026; mục này không còn bằng chứng đi kèm.

Tham khảo chính thức: [Cloudflare .NET S3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-net/), [Microsoft OpenAPI metadata](https://learn.microsoft.com/aspnet/core/fundamentals/openapi/include-metadata), [Microsoft OpenAPI transformers](https://learn.microsoft.com/aspnet/core/fundamentals/openapi/customize-openapi).

Tiếp theo P05: nhận Test_3 người dùng sửa, chuẩn hóa bản sao/mã nhóm/tên media/loại từ, triển khai preview/xác nhận nhập nguyên transaction và upsert từ vựng có meaning_base riêng. **Chưa có API import Excel** trong đợt này; không tự chữa 19 câu để vượt validation.
