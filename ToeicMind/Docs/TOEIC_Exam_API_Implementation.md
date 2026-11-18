# API bộ đề và đề thi — triển khai theo thiết kế v1.3

Ngày bắt đầu: 30/10/2026. Nguồn: `TOEIC_DatabaseDesign_v1.3.md`, `TOEIC_UseCase_Spec_v1.3.md`, `Test_1/Test_1_split.xlsx` và yêu cầu lưu media ở Cloudflare R2.

Nguồn SQL hiện tại theo yêu cầu mới nhất: **`ToeicMindBE/DATABASE`**. Các file 001–006 tách riêng trước đây đã hợp nhất/bỏ; chỉ nâng cấp tại chỗ bằng 01/02/03 của bộ gốc. Xem [hướng dẫn SQL](TOEIC_Database_Scripts.md). Các bằng chứng kiểm thử bên dưới thuộc đợt trước; project kiểm thử đã gỡ ngày 06/11/2026. Chưa áp dụng bộ script đã gộp vào ToeicDb.

Cập nhật theo trả lời người dùng 30/10/2026: **Test_3 là mẫu chuẩn mới**; nghĩa gốc phải lấy từ `meaning_base` riêng, không sao chép nghĩa ngữ cảnh của Test_1. Mã đề cho phép nhập hoặc tự sinh; khi sửa mà bỏ mã thì giữ mã hiện có. Khóa nội dung sau khi có lượt làm, chỉ sửa metadata; media R2 riêng tư và URL ký có hạn đã duyệt. Không hỏi lại các quyết định này.

P03-02/03/04 đã có API quản trị và kiểm thử, xem [hợp đồng nội dung/media/xuất bản](TOEIC_Exam_Content_API.md). Test_3 có 200 câu/103 nhóm, 1.812 dòng Vocab/598 cặp base-pos trước chuẩn hóa; đủ media. Người dùng sẽ tự sửa nhãn mâu thuẫn câu 157/184 và nhãn lặp ở 17 câu **80–88, 147–154** trước khi nhập. Đã duyệt chuẩn hóa `v.phr → phr.v`, `n.phr/adv.phr → phr` (14 dòng, có báo cáo). Hỗ trợ dấu `-`, `–`, `—` trong nhãn; không tự sửa nội dung giải thích.

## 1. Các đợt thực hiện

| Đợt | Task kế hoạch | Đầu ra và tiêu chí | Trạng thái |
|---|---|---|---|
| 1 | P01-01/02, P03-01; UC-19/29 | Schema/ánh xạ ExamSet và Exam; API tạo/sửa/xem/tìm/lọc/phân trang/xóa mềm/khôi phục; unique trong bộ, kiểm tra bộ còn đề, phân quyền | REVIEW — đã triển khai; schema đã áp dụng ToeicDb |
| 2 | P01-03, P03-02; UC-20 | Nhóm/câu/đáp án theo 7 Part, cho Nháp thiếu nội dung, giải thích nguyên khối; danh mục và kiểm tra lá/Part/cờ | REVIEW — API đã triển khai |
| 3 | P03-03; UC-22 | Upload R2, hướng dẫn mặc định/riêng/hiệu lực, URL ký và bù trừ khi ghi DB thất bại | REVIEW — SDK R2 thật đã upload/tải URL ký/dọn object thử; chưa nhập media Test_3 |
| 4 | P05-01/02/03; UC-21 | Chuẩn hóa bản sao Test_3; preview/xác nhận hash, import transaction, giữ nghĩa từ đã có | Chưa có API import; chờ file người dùng sửa để tiếp tục parser/import và nghiệm thu dữ liệu thật |
| 5 | P03-04; UC-19 | Kiểm tra/xuất bản qua procedure, trả toàn bộ lỗi, khóa nội dung theo lịch sử | REVIEW — đã xuất bản thử đề tổng hợp 200 câu/103 nhóm; chưa nhập/xuất bản Test_3 thật |

Đợt 1 cung cấp **thông tin đề**, chưa phải nội dung câu hỏi hay API bắt đầu bài làm. Không có API đặt `Status=PUBLISHED` để bỏ qua kiểm tra xuất bản. Luồng bài làm/chấm điểm thuộc P06/P08.

## 2. Dữ liệu Test_1 đã kiểm tra ở đợt đầu (tham khảo lịch sử)

- Questions: 200 câu, 103 nhóm; số câu Part 1–7 lần lượt 6, 25, 39, 30, 30, 16, 54.
- Excel hiện là bố cục cũ: `group_id`, `group_range`, `difficulty`, `script_vi`; chưa có `group_code`, `level`, `group_translation_vi` theo v1.3.
- Vocab: 1.694 dòng; có `meaning_vi`, chưa có `meaning_base` và `term_meaning_vi`. Không coi số dòng là số từ duy nhất.
- Đối chiếu bằng `scripts/Inspect-ExamSample.py`: 562 cặp `(base, pos)`; không thiếu file media được tham chiếu; 185 câu chưa đúng định dạng `option_explanations` v1.3. Chưa tự sửa nội dung.
- Audio_Segments: 303 dòng, thuộc clip V2; không nhập thành audio nhóm MVP. Sheet Media không dùng theo DB-DEC.
- Có audio/hình thật và Dict; chưa tìm thấy `toeic_directions.xlsx` trong bộ mẫu. Không tự tạo hướng dẫn/media giả để xuất bản.
- Bản gốc giữ nguyên; đổi tên media và mã nhóm trên bản sao sau khi quy tắc chuyển đổi được duyệt. Khóa chính database tự sinh, không lấy ID cũ của Excel.

## 3. Quyết định đang áp dụng

| Mã | Quyết định người dùng | Trạng thái |
|---|---|---|
| EXAM-Q01 | Mã đề nhập hoặc tự sinh; chuẩn hóa metadata trên bản sao, Test_3 làm chuẩn; nghĩa gốc lấy riêng từ meaning_base | Đã chốt; không dùng nghĩa Test_1 để lấp nghĩa gốc |
| Q05 | Chỉ sửa metadata sau khi có lượt làm; khóa cấu trúc/câu/đáp án/media/hướng dẫn đã dùng; sửa lớn tạo đề mới | Đã triển khai, bao gồm lịch sử BANK và hướng dẫn mặc định hiệu lực |
| EXAM-Q02 | R2 riêng tư, kiểm tra quyền rồi cấp URL ký có hạn | Đã triển khai URL xem trước cho ADMIN; quyền phát theo Attempt thuộc P06/P08 |
| EXAM-Q03 | Người dùng tự sửa file Test_3 trước khi nhập | Chờ file; không tự sửa 19 câu đã báo |
| EXAM-Q04 / ISSUE-019 | v.phr → phr.v; n.phr và adv.phr → phr, báo cáo từng dòng | Đã chốt; report ghi 14 dòng cần chuyển |

Thông tin endpoint/bucket/access key đọc từ note local. Không đưa credential vào tài liệu, response, log hoặc mã nguồn. Note bị loại khỏi Git và output/publish; cấu hình runtime đọc từ `.env` Development hoặc secret môi trường.

## 4. Kiểm chứng và việc tiếp theo

Schema triển khai từ `../DATABASE/01_schema.sql`, sau đó 02/03, không chạy DDL lúc API khởi động. Script giữ database/bảng hiện có và chỉ bổ sung phần thiếu. Nếu Exam cũ có dữ liệu nhưng thiếu ExamSetId/ExamCode thì báo lỗi 51003; không tự gán bộ/mã. Index tên đề toàn cục được thay bằng unique trong bộ. Không seed bộ đề hoặc đề giả vào database ứng dụng.

Bằng chứng ngày 30/10/2026:

- Phần kiểm thử tự động cũ (62 test) đã gỡ cùng project kiểm thử ngày 06/11/2026.
- Restore đã làm mới và thành công; lượt build cuối không có warning/error. `dotnet publish ToeicMind.csproj --artifacts-path artifacts/exam-api --no-restore -c Debug -o artifacts/exam-publish` thành công. Đã kiểm tra 80 file publish: không có `.env`, note khóa, Test_1 hoặc chuỗi credential R2.
- Script kiểm tra secret của Git index qua; scan thêm 48 file source/tài liệu/template trong working tree không thấy Access Key ID/Secret Access Key R2. `.env` và note được Git ignore. Không stage/commit/push.
- Đã áp dụng `003` vào **ToeicDb phát triển**, sau khi xác nhận Exam/QuestionGroup/Attempt rỗng. SQLCMD cần SET QUOTED_IDENTIFIER và các option của filtered index; script đã khai báo rõ để chạy nhất quán với ADO.NET. Kiểm tra sau áp dụng: ExamSet=0, Exam=0; ExamSetId và ExamCode NOT NULL; UX_Exam_Set_Code và UX_Exam_Set_Title tồn tại; không còn database test. Không nhập đề mẫu hoặc tạo dữ liệu người dùng.
- Hướng dẫn hiện hành: chạy lần lượt DATABASE/01, 02, 03 theo `TOEIC_Database_Scripts.md`, không dùng file tách lẻ trong backend. API đang chạy cần build/chạy lại để nạp controller mới; không tự dừng tiến trình backend của người dùng.

Kiểm thử R2 riêng từng dùng SDK thật: upload PNG, URL ký GET đúng bytes, unsigned GET bị từ chối HTTP 400; không nhập media đề thật. Chi tiết ở `TOEIC_Exam_Content_API.md`.

Schema `004`–`006` đã áp dụng vào ToeicDb; Exam/QuestionGroup/Question/Media vẫn 0 dòng, giữ nguyên 9 hướng dẫn và 119 phân loại hiện có. Chỉ bổ sung schema nội dung trong đợt này, chưa nâng cấp/triển khai schema nhập từ vựng và clip V2. Tiếp theo P05 với Test_3 sau khi người dùng sửa, rồi nghiệm thu import/media/xuất bản bằng dữ liệu thật; P06/P08 chưa triển khai.

## 5. Hợp đồng API đợt 1

Tiếp tục tiền tố `/api` của auth hiện tại. Mọi API cần Bearer token và kiểm tra tài khoản hiện hành; quản trị cần vai trò ADMIN.

| Nhóm | Method/route | Kết quả |
|---|---|---|
| Admin bộ đề | GET `/api/admin/exam-sets` | Danh sách và số đề/số đề xuất bản |
| | GET `/api/admin/exam-sets/{id}` | Thông tin bộ, kể cả bộ trong thùng rác |
| | POST `/api/admin/exam-sets` | Tạo, trả 201 và Location |
| | PUT `/api/admin/exam-sets/{id}` | Sửa tên/mô tả |
| | DELETE `/api/admin/exam-sets/{id}` | Xóa mềm; 409 kèm danh sách đề nếu bộ còn đề chưa xóa |
| | POST `/api/admin/exam-sets/{id}/restore` | Khôi phục; 409 nếu tên đã dùng lại |
| Admin đề | GET `/api/admin/exams` | Danh sách, tìm/lọc/phân trang |
| | GET `/api/admin/exams/{id}` | Thông tin đề, kể cả đề trong thùng rác |
| | POST `/api/admin/exams` | Tạo Nháp, trả 201 và Location |
| | PUT `/api/admin/exams/{id}` | Sửa thông tin; đổi mã/bộ chỉ khi Nháp |
| | DELETE `/api/admin/exams/{id}` | Xóa mềm; giữ các hàng dữ liệu |
| | POST `/api/admin/exams/{id}/restore` | Khôi phục; yêu cầu bộ đang hoạt động và mã/tên không xung đột |
| Người học | GET `/api/exam-sets`, GET `/api/exam-sets/{id}` | Chỉ bộ chưa xóa có đề xuất bản; số đề chỉ đếm đề xuất bản |
| | GET `/api/exams`, GET `/api/exams/{id}` | Chỉ đề xuất bản chưa xóa trong bộ chưa xóa; không trả nội dung câu/đáp án |

- Request bộ: `{ "name": "ETS 2024", "description": "..." }`.
- Request đề: `{ "examSetId": 1, "examCode": "ETSTest1", "title": "ETS Test 1", "description": "..." }`. Mã tùy chọn: tạo mới để trống thì sinh `EXAM-` + 20 ký tự GUID; khi sửa bỏ trống thì giữ mã hiện hành trong transaction. Mã dài tối đa 30 ký tự ASCII, bắt đầu bằng chữ/số, phần còn lại dùng chữ/số/`_`/`-`; tên tối đa 200, tên bộ 150, mô tả 1000. Name/title được trim, mô tả rỗng thành null.
- Không nhận ID tự sinh, CreatedBy, IsDeleted, IsPublic hay Status trong body. Từ chối field không thuộc DTO bằng 400; CreatedBy lấy từ token. IsPublic thuộc V2.
- Query chung: `page` mặc định 1 (1–1.000.000), `pageSize` mặc định 20 (1–100), `search` tối đa 200 ký tự. Đề thêm `examSetId`; Admin thêm `status=DRAFT|PUBLISHED`, `isDeleted=true` để xem riêng thùng rác. Bộ Admin cũng có `isDeleted`. Thứ tự cố định theo tên rồi ID; đề thêm bộ trước tên.
- Response danh sách: `{ "items": [...], "totalCount": 0, "page": 1, "pageSize": 20 }`. Ngày giờ UTC có `Z`.
- 400 cho validation; 401 thiếu/sai token; 403 sai role; 404 không tồn tại/không được nhìn thấy; 409 cho xung đột. Lỗi nghiệp vụ có `code`, `message`, `traceId`. Các mã: EXAM_SET_NAME_EXISTS, EXAM_CODE_EXISTS, EXAM_TITLE_EXISTS, EXAM_SET_NOT_EMPTY, EXAM_SET_DELETED, EXAM_DELETED, EXAM_MUST_BE_DRAFT, CONCURRENT_CHANGE.
- DELETE/restore lặp lại cùng trạng thái thành công; không đổi DeletedAt khi DELETE lặp. Khôi phục đề giữ trạng thái trước khi xóa; chưa cho sửa nội dung ở đợt này.
- Tạo/chuyển/khôi phục đề và xóa bộ dùng transaction Serializable; unique index chốt xung đột đồng thời, deadlock trả 409 để tải lại/thử lại. FK NO ACTION; trigger chặn DELETE thật. Quyền SQL tối thiểu của tài khoản triển khai/runtime cần cấu hình theo môi trường, không tự thay quyền login đang dùng.
- Ví dụ request dùng file `ToeicMind.Exams.http` ở gốc repo; nhóm/câu, publish/unpublish và media đã bổ sung ở đợt tiếp theo. Chưa có API nhập Excel hoặc bắt đầu bài làm.

## 6. Cấu hình R2

Đã đọc endpoint, bucket và S3 Access Key ID/Secret Access Key từ note local, lưu vào `.env` bằng `R2__Endpoint`, `R2__BucketName`, `R2__AccessKeyId`, `R2__SecretAccessKey`, `R2__Region=auto`. Không dùng trường Token value cho S3. `.env.example` chỉ có cấu trúc trống.

`python scripts/Test-R2Connection.py` gửi HEAD có chữ ký tới bucket, HTTP 200. Kiểm tra runtime SDK R2 tiếp theo đã xác nhận upload, tải bằng URL ký đúng bytes, unsigned GET bị từ chối và dọn object diagnostics tự tạo; không thay chính sách bucket/domain hoặc CORS. URL xem trước ADMIN đã có; chưa kiểm thử player audio hay cấp quyền phát theo lượt làm. Không trả URL công khai cố định.

Tham khảo chính thức: [Cloudflare .NET S3 client](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-net/), [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).
