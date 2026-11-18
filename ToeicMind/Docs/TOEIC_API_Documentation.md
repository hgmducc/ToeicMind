# ToeicMind — API Documentation

| Thuộc tính | Giá trị |
|---|---|
| Ngày đối chiếu | 13/11/2026 |
| Phạm vi | OpenAPI hiện tại có **88 thao tác** (sau [tối ưu API 13/11/2026](API_OPTIMIZATION_2026-11-13.md); các số 98 trong tài liệu là trước đợt này). Các mục A/E mô tả nền tảng auth/đề thi; module mở rộng liên kết ở mục 2.3. Những endpoint đã gỡ có nhãn riêng và không còn trong bảng endpoint hiện hành |
| Đối tượng sử dụng | Frontend Người học, frontend Admin, người kiểm thử API |
| Nguồn hợp đồng | Controller, DTO, service/repository, script SQL chuẩn và OpenAPI của bản triển khai hiện tại |
| Task liên quan | P02-01–05; P03-01–04; tài liệu tích hợp cho P10-01 |

Tài liệu mô tả hành vi đang triển khai. Các giá trị ID, tên và thời điểm trong ví dụ là dữ liệu minh họa. Lấy ID thật từ response hoặc danh mục của môi trường đang gọi; không giả định ID giống nhau giữa các database.

Cập nhật 13/11/2026 (CHG-006 VIP): thêm gói VIP, thanh toán VNPay (`/api/vip/*`, `/api/admin/vip/*`) và quyền Miễn phí/VIP theo bộ đề/đề (`402 VIP_REQUIRED`); chi tiết tại [báo cáo VIP](VIP_PAYMENT_2026-11-13.md). Số operation OpenAPI hiện cao hơn 88 do các API VIP.

Cập nhật 13/11/2026 (tối ưu API): danh sách đề/bộ đề/danh mục/cấu trúc đề và các danh sách bài tập (thẻ ngân hàng, ngữ pháp, Nghe chép, tổng quan/bài học từ vựng) **công khai**; làm bài, nội dung Part/media/hướng dẫn, chi tiết clip, học/ôn từ vựng và lưu tiến độ cần đăng nhập. Đã gộp 14 operation vào 4 operation mới: `me/dashboard` (thêm `scoreHistory`, `days`, `scoreLimit`; thay `me/progress`, `me/study-days`, `me/score-history`), `exams/{id}/modes` (thay `outline`), `attempts/{id}/result?includeReview=true` (thay `review`), `GET /api/reports` (thay `me/reports`), `GET /api/admin/dashboard` (thay 4 API thống kê), `PUT admin/users/{id}/status` (thay `lock`/`unlock`), `PUT admin/exams/{id}/status` (thay `publish`/`unpublish`). Sau khi bỏ quyền Admin sửa tên/email người khác, OpenAPI hiện có 87 operation. Bảng và ví dụ bên dưới nhắc tới các route cũ này là lịch sử; xem [báo cáo tối ưu API](API_OPTIMIZATION_2026-11-13.md) để có hợp đồng hiện hành.

Cập nhật 13/11/2026: đã gỡ 12 API không còn client gọi và giữ việc gỡ reset mật khẩu quản trị trước đó. Danh sách và cách thay thế tại [báo cáo dọn API](API_CLEANUP_2026-11-13.md); báo cáo này được ưu tiên so với ví dụ/lịch sử kiểm tra cũ. Nhập Excel vẫn dùng E35/E36, danh sách người học E02/E04 vẫn giữ. Tạo người dùng/bộ đề trả 201 và DTO, không còn header Location trỏ tới GET chi tiết đã gỡ.

Cập nhật Admin/P05: [hợp đồng E35–E38, vocab/audioSegments và transaction nhập](TOEIC_Exam_Import_API.md). Các số liệu 44/33 và 49/38 ở lịch sử là số operation/path của đợt cũ, không phải OpenAPI hiện tại. Cập nhật SQL đã được áp dụng vào ToeicDb trong lượt kiểm tra trước; xem sự cố và phạm vi tác động trong báo cáo được liên kết ở tài liệu nhập.

## Mục lục

- [1. Kết nối, xác thực và quy ước](#quy-uoc)
- [2. Danh sách endpoint](#endpoint-index)
- [3. Các model response](#response-models)
- [4. Xác thực và tài khoản](#auth)
- [5. Danh mục và API Người học](#learner)
- [6. Quản trị bộ đề](#admin-sets)
- [7. Quản trị thông tin đề](#admin-exams)
- [8. Quản trị nhóm, câu hỏi và đáp án](#groups)
- [9. Quản trị hướng dẫn](#directions)
- [10. Media Cloudflare R2](#media)
- [11. Kiểm tra và xuất bản đề](#publication)
- [12. Mã lỗi và cách xử lý](#errors)
- [13. Luồng tích hợp và ví dụ gọi API](#integration)
- [14. Phạm vi chưa có và kiểm chứng tài liệu](#verification)

<a id="quy-uoc"></a>

## 1. Kết nối, xác thực và quy ước

### 1.1. Base URL

| Môi trường/profile | Base URL |
|---|---|
| Local `http` | `http://localhost:5078` |
| Local `https` | `https://localhost:7283` |
| Staging/Production | Dùng domain thực tế của nơi triển khai |

URL local lấy từ [launchSettings.json](../Properties/launchSettings.json). Toàn bộ route bên dưới được nối vào base URL. API hiện dùng `/api/...`, chưa có tiền tố `/api/v1`.

Trong Development có Swagger UI tại `/swagger` và OpenAPI JSON tại `/openapi/v1.json`. OpenAPI hiện sinh route `/api/Auth/...`; tài liệu dùng dạng `/api/auth/...`, được router hiện tại chấp nhận tương đương.

API có HTTPS redirection; ưu tiên base URL HTTPS khi môi trường đã có chứng chỉ phù hợp. Cấu hình khởi chạy và secret xem [README](../README.md). Database dùng nguồn `../DATABASE`; xem [hướng dẫn nâng cấp database](TOEIC_Database_Scripts.md), không dựng lại database đang có để thử API.

### 1.2. Header và định dạng

Request JSON:

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <accessToken>
```

- Chỉ gửi `Authorization` với access token của ToeicMind. Refresh token và Google ID token được gửi trong JSON của endpoint tương ứng.
- JSON dùng `camelCase`. Thời điểm response dùng UTC ISO 8601, ví dụ `2026-10-30T03:00:00Z`.
- Response thành công trả trực tiếp object/mảng; không có lớp bọc `success` hoặc `data`. HTTP `204` không có body.
- Trường nullable có thể trả `null`; danh sách trả `[]` khi không có phần tử.
- Các ID route phải là số nguyên dương. Route có ID bằng 0, âm hoặc sai kiểu có thể trả `404` do không khớp route; validation body/query sai trả `400`.
- Những POST không yêu cầu body gồm restore, publish và unpublish. Không gửi lại toàn bộ đề cho các thao tác này.
- Request upload dùng `multipart/form-data`; xem mục 10. Không tự đặt boundary khi dùng `FormData` hoặc `curl -F`.

### 1.3. Phân quyền

| Ký hiệu | Quyền truy cập |
|---|---|
| Công khai | Không bắt buộc Bearer token |
| Đăng nhập | Access token hợp lệ; `LEARNER` hoặc `ADMIN` đều có thể gọi |
| ADMIN | Access token hợp lệ và role hiện tại là `ADMIN` |

Endpoint được bảo vệ trả `401` khi token thiếu/sai/hết hạn. Backend kiểm tra lại tài khoản trên mỗi request: tài khoản không còn `ACTIVE`, bị xóa hoặc role hiện tại khác role trong JWT làm token cũ bị từ chối. Người đã xác thực nhưng thiếu role Admin nhận `403`.

GET dưới `/api/exams` và `/api/exam-sets` áp dụng phạm vi Người học kể cả khi người gọi là Admin. Muốn xem Nháp/thùng rác, dùng `/api/admin/...`.

### 1.4. Token và vòng đời phiên

- Login bằng email hoặc Google trả `AuthResponseDto`. Đăng ký email chỉ trả `UserDto`, không tạo phiên đăng nhập.
- Access token và refresh token có hạn theo cấu hình; giá trị mặc định trong dự án là 15 phút và 7 ngày. Dùng `expiresAt` và `refreshExpiresAt` trong response để xử lý thời hạn.
- Refresh xoay vòng cả cặp token. Sau mỗi lần thành công phải thay cả hai token; không tiếp tục dùng refresh token cũ.
- Client cần dùng chung một request refresh đang chạy cho các request/tab dùng chung phiên. Dùng lại refresh token đã thu hồi hoặc thua cạnh tranh refresh có thể khiến các refresh token còn hạn của user bị thu hồi.
- Logout thu hồi refresh token được gửi. Set/change/reset password thu hồi toàn bộ refresh token của user, gồm cả token của phiên đang gọi; các endpoint này không trả cặp token mới.
- Các thao tác trên không lập blacklist access token. JWT đã cấp có thể còn dùng được đến hạn nếu tài khoản vẫn đáp ứng kiểm tra quyền. Client cần xóa phiên khi logout và yêu cầu đăng nhập lại sau khi thay mật khẩu.

### 1.5. Validation và PUT

DTO đăng ký, set-password và các DTO ghi dữ liệu đề thi từ chối trường JSON lạ. Ví dụ không gửi `role` khi đăng ký, `status` khi tạo đề, `optionId` khi sửa đáp án, hoặc `storageKey` khi upload media.

PUT của bộ đề, metadata đề, nhóm và hướng dẫn nhận đầy đủ các trường request bắt buộc; không phải JSON Patch. Khi bỏ trường mô tả/nội dung tùy chọn, trường đó có thể được đưa về `null`. Riêng `examCode` bỏ trống khi PUT được giữ nguyên. Với nhóm, danh sách câu và cờ là trạng thái mong muốn sau cập nhật; chi tiết tại mục 8.

### 1.6. Phân trang và tìm kiếm

Áp dụng cho bốn danh sách bộ đề/đề của Admin và Người học:

| Query | Kiểu | Mặc định | Điều kiện |
|---|---|---|---|
| `page` | integer | `1` | 1–1.000.000 |
| `pageSize` | integer | `20` | 1–100 |
| `search` | string? | Không lọc | Tối đa 200 ký tự; trim trước khi tìm |

Response:

```json
{
  "items": [],
  "totalCount": 0,
  "page": 1,
  "pageSize": 20
}
```

`totalCount` là số bản ghi sau lọc, trước phân trang; trang vượt dữ liệu trả `items: []`. Bộ đề tìm theo `name`, sắp xếp theo tên rồi ID. Đề tìm theo `title` hoặc `examCode`, sắp xếp theo ID bộ đề, tên đề rồi ID đề. Không có query tùy chọn sắp xếp. Phân biệt hoa/thường và dấu khi tìm kiếm/phát hiện trùng phụ thuộc collation SQL Server của môi trường.

Admin có thêm `isDeleted` boolean, mặc định `false`: `false` chỉ lấy mục chưa xóa, `true` chỉ lấy thùng rác; đây không phải cờ lấy cả hai trạng thái.

<a id="endpoint-index"></a>

## 2. Danh sách endpoint

### 2.1. Xác thực — 11 thao tác

| Mã | Method | Route | Mục đích | Quyền | Thành công |
|---|---|---|---|---|---|
| A01 | POST | `/api/auth/register` | Đăng ký tài khoản Người học | Công khai | 201 `UserDto` |
| A02 | POST | `/api/auth/login` | Đăng nhập bằng email và mật khẩu | Công khai | 200 `AuthResponseDto` |
| A03 | POST | `/api/auth/google-login` | Đăng nhập bằng tài khoản Google | Công khai | 200 `AuthResponseDto` |
| A04 | POST | `/api/auth/refresh` | Cấp cặp token mới bằng refresh token hiện tại | Công khai | 200 `AuthResponseDto` |
| A05 | POST | `/api/auth/logout` | Đăng xuất bằng cách thu hồi refresh token được gửi | Công khai | 204 |
| A06 | GET | `/api/auth/me` | Lấy thông tin tài khoản đang đăng nhập | Đăng nhập | 200 `UserDto` |
| A07 | POST | `/api/auth/set-password` | Thiết lập mật khẩu lần đầu cho tài khoản chưa có mật khẩu | Đăng nhập | 200 `{ message }` |
| A08 | PUT | `/api/auth/change-password` | Đổi mật khẩu của tài khoản đang đăng nhập | Đăng nhập | 200 `{ message }` |
| A09 | POST | `/api/auth/forgot-password` | Yêu cầu gửi mã OTP đặt lại mật khẩu qua email | Công khai | 200 `{ code, message }` |
| A10 | POST | `/api/auth/reset-password` | Đặt lại mật khẩu bằng mã OTP | Công khai | 200 `{ message }` |
| A11 | PUT | `/api/auth/me` | Người dùng tự sửa hồ sơ của mình (tên hiển thị) — CHG-008 | Đăng nhập | 200 `UserDto` |

### 2.2. Danh mục và đề thi — 34 thao tác

| Mã | Method | Route | Mục đích | Quyền | Thành công |
|---|---|---|---|---|---|
| E01 | GET | `/api/exam-catalogs` | Lấy danh mục Part, độ khó, phân loại và cờ đặc biệt | Đăng nhập | 200 `ExamCatalogDto` |
| E02 | GET | `/api/exam-sets` | Lấy danh sách bộ có đề xuất bản cho Người học | Đăng nhập | 200 trang `ExamSetDto` |
| E04 | GET | `/api/exams` | Lấy danh sách đề đã xuất bản cho Người học | Đăng nhập | 200 trang `ExamDto` |
| E06 | GET | `/api/admin/exam-sets` | Lấy danh sách bộ đề để quản trị hoặc xem thùng rác | ADMIN | 200 trang `ExamSetDto` |
| E08 | POST | `/api/admin/exam-sets` | Tạo bộ đề mới | ADMIN | 201 `ExamSetDto` |
| E09 | PUT | `/api/admin/exam-sets/{id}` | Sửa tên và mô tả bộ đề | ADMIN | 200 `ExamSetDto` |
| E10 | DELETE | `/api/admin/exam-sets/{id}` | Xóa mềm bộ không còn đề chưa xóa | ADMIN | 204 |
| E11 | POST | `/api/admin/exam-sets/{id}/restore` | Khôi phục bộ đề đã xóa mềm | ADMIN | 200 `ExamSetDto` |
| E12 | GET | `/api/admin/exams` | Lấy danh sách đề để quản trị, lọc trạng thái hoặc xem thùng rác | ADMIN | 200 trang `ExamDto` |
| E13 | GET | `/api/admin/exams/{id}` | Xem thông tin một đề để quản trị, chưa gồm nội dung câu hỏi | ADMIN | 200 `ExamDto` |
| E14 | POST | `/api/admin/exams` | Tạo đề Nháp trong một bộ đề | ADMIN | 201 `ExamDto` |
| E15 | PUT | `/api/admin/exams/{id}` | Sửa thông tin đề hoặc chuyển bộ khi được phép | ADMIN | 200 `ExamDto` |
| E16 | DELETE | `/api/admin/exams/{id}` | Xóa mềm đề thi | ADMIN | 204 |
| E17 | POST | `/api/admin/exams/{id}/restore` | Khôi phục đề thi đã xóa mềm | ADMIN | 200 `ExamDto` |
| E18 | GET | `/api/admin/exams/{examId}/groups` | Lấy các nhóm cùng câu hỏi, đáp án và media của đề | ADMIN | 200 mảng `QuestionGroupDto` |
| E24 | GET | `/api/admin/directions` | Lấy hướng dẫn mặc định, bản riêng hoặc bản hiệu lực của đề | ADMIN | 200 mảng `ExamDirectionDto` |
| E25 | POST | `/api/admin/directions` | Tạo mục hướng dẫn mặc định hoặc bản riêng cho đề | ADMIN | 201 `ExamDirectionDto` |
| E26 | PUT | `/api/admin/directions/{id}` | Sửa nội dung và ví dụ của mục hướng dẫn | ADMIN | 200 `ExamDirectionDto` |
| E28 | POST | `/api/admin/exams/{examId}/groups/{groupId}/media` | Tải audio hoặc hình lên R2 và gắn vào nhóm | ADMIN | 201 `MediaFileDto` |
| E29 | POST | `/api/admin/directions/{id}/media` | Tải audio hoặc hình lên R2 và gắn vào hướng dẫn | ADMIN | 201 `MediaFileDto` |
| E30 | GET | `/api/admin/media/{id}/url` | Cấp URL ký có hạn để Admin xem trước media | ADMIN | 200 `SignedMediaUrlDto` |
| E31 | DELETE | `/api/admin/media/{id}` | Xóa mềm media khỏi nội dung đang sử dụng | ADMIN | 204 |
| E32 | GET | `/api/admin/exams/{examId}/publish-check` | Kiểm tra điều kiện xuất bản và liệt kê lỗi cần sửa | ADMIN | 200 `{ isValid, issues }` |
| E33 | POST | `/api/admin/exams/{examId}/publish` | Kiểm tra và xuất bản đề để Người học nhìn thấy | ADMIN | 200 `{ examId, status }` |
| E34 | POST | `/api/admin/exams/{examId}/unpublish` | Ngừng xuất bản và đưa đề về trạng thái Nháp | ADMIN | 200 `{ examId, status }` |
| E35 | POST | `/api/admin/exams/import` | Nhập toàn bộ nội dung nháp trong một transaction | ADMIN | 201 ExamDto |
| E36 | PUT | `/api/admin/exams/{examId}/content` | Lưu toàn bộ nội dung, giữ ID câu/clip và xóa mềm phần bỏ | ADMIN | 200 ExamDto |
| E37 | GET | `/api/admin/exams/{examId}/import-source` | Đọc lại toàn bộ sheet nguồn để đối soát | ADMIN | 200 object hoặc 204 |
| E38 | POST | `/api/admin/exams/{examId}/groups/{groupId}/segments/{clipId}/media` | Tải audio cắt vào slot clip riêng | ADMIN | 201 MediaFileDto |
| E39 | POST | `/api/admin/directions/seed` | Thêm các hướng dẫn mặc định còn thiếu, giữ bản đang có | ADMIN | 200 `{ inserted, total, directions }` |

### 2.3. Người học làm bài và thống kê Admin — 34 thao tác (CHG-003)

Chi tiết, luồng vào đề, quy tắc chấm điểm, mã lỗi: [TOEIC_Learner_API.md](TOEIC_Learner_API.md); cách đo và tối ưu tải đề: [TOEIC_Performance_Exam_Loading.md](TOEIC_Performance_Exam_Loading.md).

| Nhóm | Route |
|---|---|
| Vào đề (L01–L04) | `GET /api/exams/{id}/outline`, `/directions`, `/parts/{partNo}`, `/parts/{partNo}/media` |
| Làm bài (L05–L14) | `POST/GET /api/attempts`, `GET/DELETE /api/attempts/{id}`, `PUT .../answers/{questionId}`, `POST .../direction-time`, `.../submit`, `.../abandon`, `GET .../result`, `.../review` |
| Ngân hàng (L15–L17) | `GET /api/bank/parts/{partNo}/cards`, `POST /api/bank/attempts`, `DELETE /api/bank/parts/{partNo}/cards/{cardKey}/progress` |
| Học tập (L18–L25) | `GET /api/me/dashboard`, `/progress`, `/study-days`, `/score-history`, `/vocabulary` (GET/POST/DELETE `{id}`), `/reports` |
| Báo lỗi (L26) | `POST /api/reports` |
| Admin thống kê (S01–S06) | `GET /api/admin/dashboard/summary`, `/activity`, `/exams`, `/hardest-questions`; `GET /api/admin/users/{id}/stats`, `/attempts` |
| Admin báo lỗi (S07–S08) | `GET /api/admin/reports`, `PUT /api/admin/reports/{id}` |

<a id="response-models"></a>

## 3. Các model response

### 3.1. UserDto và AuthResponseDto

`UserDto`:

```json
{
  "userId": 12,
  "username": "Nguyen Van A",
  "email": "learner@example.com",
  "role": "LEARNER",
  "status": "ACTIVE",
  "hasPassword": true,
  "createdAt": "2026-10-30T03:00:00Z"
}
```

`userId` là integer, `hasPassword` là boolean; các trường còn lại là string. Role là `ADMIN` hoặc `LEARNER`. `hasPassword: false` nghĩa là tài khoản chưa có mật khẩu email; không phải lỗi đăng nhập Google. API không trả `passwordHash`, `googleId` hoặc token hash.

`AuthResponseDto` chứa đầy đủ `UserDto` trong `user`:

```json
{
  "accessToken": "<toeicmind-access-token>",
  "refreshToken": "<toeicmind-refresh-token>",
  "expiresAt": "2026-10-30T03:15:00Z",
  "refreshExpiresAt": "2026-11-06T03:00:00Z",
  "user": {
    "userId": 12,
    "username": "Nguyen Van A",
    "email": "learner@example.com",
    "role": "LEARNER",
    "status": "ACTIVE",
    "hasPassword": true,
    "createdAt": "2026-10-30T03:00:00Z"
  }
}
```

### 3.2. ExamSetDto

```json
{
  "examSetId": 3,
  "name": "ETS 2026",
  "description": "Bộ đề luyện thi TOEIC",
  "isDeleted": false,
  "deletedAt": null,
  "examCount": 2,
  "publishedExamCount": 1,
  "createdAt": "2026-10-30T03:00:00Z",
  "updatedAt": "2026-10-30T03:30:00Z"
}
```

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `examSetId` | integer | ID bộ đề |
| `name` | string | Tên bộ |
| `description` | string hoặc null | Mô tả |
| `isDeleted`, `deletedAt` | boolean, datetime hoặc null | Trạng thái/mốc xóa mềm |
| `examCount` | integer | Admin: số đề chưa xóa; Người học: số đề xuất bản chưa xóa |
| `publishedExamCount` | integer | Số đề `PUBLISHED` chưa xóa |
| `createdAt`, `updatedAt` | datetime | Mốc tạo/cập nhật UTC |

Ở API Người học, hai số đếm chỉ phản ánh đề có thể hiển thị; không lộ số đề Nháp.

### 3.3. ExamDto

```json
{
  "examId": 21,
  "examSetId": 3,
  "examCode": "ETS2026_T01",
  "title": "Test 01",
  "description": "Đề luyện tập số 1",
  "status": "DRAFT",
  "isDeleted": false,
  "deletedAt": null,
  "createdAt": "2026-10-30T03:00:00Z",
  "updatedAt": "2026-10-30T03:00:00Z"
}
```

`examId`, `examSetId` là integer; `isDeleted` là boolean; `description`, `deletedAt` có thể null. `status` là `DRAFT` hoặc `PUBLISHED`. Response này **chỉ là metadata**, không chứa nhóm/câu/đáp án/media. Nội dung Admin lấy bằng E18.

### 3.4. QuestionGroupDto, QuestionDto và QuestionOptionDto

```json
{
  "groupId": 401,
  "examId": 21,
  "partNo": 5,
  "groupOrder": 101,
  "categoryId": 85,
  "groupLevelNo": null,
  "passageHtml": null,
  "transcriptEn": null,
  "translationVi": "Báo cáo đã hoàn thành hôm qua.",
  "specialTagIds": [],
  "questions": [
    {
      "questionId": 1201,
      "questionNo": 101,
      "levelNo": 1,
      "questionText": "The report was ____ yesterday.",
      "explanation": "Câu dùng bị động nên cần quá khứ phân từ.",
      "optionExplanations": "A: completed - Đúng: phù hợp cấu trúc bị động.\nB: complete - Sai: đây là dạng nguyên thể.\nC: completing - Sai: không phù hợp cấu trúc.\nD: completes - Sai: đây là dạng hiện tại.",
      "options": [
        { "optionId": 4801, "optionLabel": "A", "optionText": "completed", "isCorrect": true },
        { "optionId": 4802, "optionLabel": "B", "optionText": "complete", "isCorrect": false },
        { "optionId": 4803, "optionLabel": "C", "optionText": "completing", "isCorrect": false },
        { "optionId": 4804, "optionLabel": "D", "optionText": "completes", "isCorrect": false }
      ]
    }
  ],
  "media": []
}
```

ID/số thứ tự/Part/Level là integer; `isCorrect` là boolean. Các trường nội dung và độ khó nullable như request ở mục 8. Response nhóm chỉ chứa câu/media chưa xóa. Câu sắp theo `questionNo`, phương án theo `optionLabel`, media nhóm theo `sortOrder` rồi `mediaId`. Các trường `isCorrect`, `explanation`, `optionExplanations` trong response nội dung này dành cho Admin.

### 3.5. ExamDirectionDto

```json
{
  "directionId": 8,
  "examId": null,
  "directionKind": "PART",
  "skill": null,
  "partNo": 6,
  "directionsEn": "Read the texts and select the best answers.",
  "directionsVi": "Đọc các đoạn văn và chọn đáp án phù hợp nhất.",
  "exampleEn": null,
  "exampleVi": null,
  "media": []
}
```

`examId: null` là mặc định dùng chung; khác null là bản riêng cho đề. `skill`, `partNo` tuân thủ khóa SECTION/PART tại mục 9. `directionsVi`, `exampleEn`, `exampleVi` nullable. `media` là mảng `MediaFileDto` chưa xóa của chính bản hướng dẫn được trả.

### 3.6. MediaFileDto và SignedMediaUrlDto

`MediaFileDto`:

```json
{
  "mediaId": 501,
  "mediaType": "AUDIO",
  "storageKey": "exams/21/p3/032/part-3-q032-034-example.mp3",
  "altText": "Part 3, câu 32 đến 34",
  "sortOrder": 1
}
```

`mediaType` là `AUDIO` hoặc `IMAGE`; `altText` nullable. `storageKey` là khóa object, không phải URL công khai. Hệ thống tự sinh key; ví dụ trên chỉ minh họa cấu trúc, không phải đường dẫn để dùng thử.

`SignedMediaUrlDto`:

```json
{
  "mediaId": 501,
  "url": "https://r2.example.invalid/private-object?signature=example",
  "expiresAt": "2026-10-30T03:10:00Z"
}
```

URL minh họa không sử dụng được. URL thật lấy qua E30, tải trực tiếp bằng GET tới R2 trong thời hạn cho phép.

### 3.7. ExamIssueDto

```json
{
  "code": "AUDIO_REQUIRED",
  "message": "Nhóm Listening thiếu audio.",
  "partNo": 3,
  "groupId": 402,
  "questionId": null
}
```

`partNo`, `groupId`, `questionId` có thể null khi lỗi không thuộc một bản ghi cụ thể. Model này xuất hiện trong validation nội dung và publish. Danh sách mã ở mục 12.

<a id="auth"></a>

## 4. Xác thực và tài khoản

### A01. POST /api/auth/register

**Quyền:** công khai. Tạo tài khoản `LEARNER`, trạng thái `ACTIVE`.

| Body | Kiểu | Bắt buộc | Điều kiện |
|---|---|---|---|
| `username` | string | Có | Tối đa 100 ký tự; tên hiển thị, không phải khóa đăng nhập |
| `email` | string | Có | Email hợp lệ, tối đa 255 ký tự |
| `password` | string | Có | 6–72 ký tự và không quá 72 byte UTF-8 |
| `confirmPassword` | string | Có | Trùng chính xác `password` |

```json
{
  "username": "Nguyen Van A",
  "email": "learner@example.com",
  "password": "ExamplePass123!",
  "confirmPassword": "ExamplePass123!"
}
```

**Thành công:** `201 Created`, body `UserDto`. Email được trim và chuyển chữ thường, tên hiển thị được trim. Không gửi `role`; không có API đăng ký Admin.

**Lỗi:** `400 VALIDATION_ERROR`, `PASSWORD_MISMATCH`, `PASSWORD_TOO_LONG`; `409 EMAIL_EXISTS`. Sai xác nhận thường bị validation DTO bắt trước service, nên có thể nhận `VALIDATION_ERROR` thay cho `PASSWORD_MISMATCH`. Sau đăng ký, gọi A02 để đăng nhập.

### A02. POST /api/auth/login

**Quyền:** công khai.

| Body | Kiểu | Bắt buộc | Điều kiện |
|---|---|---|---|
| `email` | string | Có | Email hợp lệ, tối đa 255 ký tự; trim/chuyển chữ thường |
| `password` | string | Có | Tối đa 72 ký tự; so khớp nguyên văn, không trim |

```json
{ "email": "learner@example.com", "password": "ExamplePass123!" }
```

**Thành công:** `200 OK`, body `AuthResponseDto`.

**Lỗi:** `400 VALIDATION_ERROR`; `400 NO_PASSWORD_SET` khi tài khoản Google chưa có mật khẩu; `401 INVALID_CREDENTIALS` khi sai thông tin hoặc mật khẩu vượt 72 byte UTF-8; `401 ACCOUNT_LOCKED` khi tài khoản bị khóa. Login không có mật khẩu không phát token.

Frontend Admin phải kiểm tra `user.role === "ADMIN"` trước khi cho vào trang quản trị; auth dùng chung vẫn có thể đăng nhập thành công tài khoản Người học.

### A03. POST /api/auth/google-login

**Quyền:** công khai.

```json
{ "idToken": "<google-id-token>" }
```

`idToken` là string bắt buộc, lấy từ kết quả đăng nhập Google của frontend. Không gửi Google access token, authorization code, client secret hoặc JWT ToeicMind vào trường này.

**Thành công:** `200 OK`, body `AuthResponseDto`. Backend kiểm tra Google ID token và email đã xác minh. Khi tài khoản chưa có sẽ tạo `LEARNER`; email đã có và chưa liên kết Google có thể được liên kết. Tài khoản mới qua Google trả `hasPassword: false`; có thể tiếp tục sử dụng Google hoặc gọi A07.

**Lỗi:** `400 VALIDATION_ERROR`; `401 INVALID_GOOGLE_TOKEN`, `ACCOUNT_LOCKED` hoặc `EMAIL_EXISTS` trong nhánh không thể tạo/liên kết tài khoản. Google Client ID của frontend phải khớp audience được backend cấu hình.

### A04. POST /api/auth/refresh

**Quyền:** công khai; refresh token là thông tin xác thực của thao tác này.

```json
{ "refreshToken": "<current-refresh-token>" }
```

`refreshToken`: string bắt buộc, tối đa 512 ký tự.

**Thành công:** `200 OK`, body `AuthResponseDto` mới. Cặp token cũ được thay bằng cặp mới; `user` phản ánh tài khoản hiện tại.

**Lỗi:** `400 VALIDATION_ERROR`; `401 INVALID_REFRESH_TOKEN` khi token không tồn tại, hết hạn, bị thu hồi/dùng lại hoặc tài khoản không còn hợp lệ. Khi nhận 401 phải đưa người dùng về luồng đăng nhập; không lặp vô hạn với token cũ.

### A05. POST /api/auth/logout

**Quyền:** công khai. Body giống A04.

**Thành công:** `204 No Content`, kể cả token không tồn tại hoặc đã thu hồi. Không yêu cầu access token còn hạn. Thu hồi refresh token được gửi, không tự logout mọi thiết bị.

**Lỗi:** `400 VALIDATION_ERROR` nếu body thiếu token/sai giới hạn. Client xóa phiên local sau logout.

### A06. GET /api/auth/me

**Quyền:** đăng nhập. Không body hoặc query.

**Thành công:** `200 OK`, body `UserDto` của chính người gọi. Dùng để kiểm tra lại phiên và `hasPassword` sau đăng nhập/thiết lập mật khẩu.

**Lỗi:** `401` nếu token/tài khoản không còn hợp lệ; lỗi Bearer thông thường có code `UNAUTHORIZED`. Client vẫn phải xử lý HTTP 401 nếu không đọc được JSON.

### A07. POST /api/auth/set-password

**Quyền:** đăng nhập. Dành cho tài khoản chưa có mật khẩu (`hasPassword: false`).

```json
{
  "newPassword": "ExamplePass456!",
  "confirmNewPassword": "ExamplePass456!"
}
```

Hai trường là string bắt buộc; `newPassword` 6–72 ký tự, không quá 72 byte UTF-8; xác nhận phải trùng. Không nhận `oldPassword` hoặc trường lạ.

**Thành công:** `200 OK`, body có `message` thông báo thiết lập thành công. Thu hồi mọi refresh token; không trả token mới hoặc `UserDto`.

**Lỗi:** `400 VALIDATION_ERROR`, `PASSWORD_ALREADY_SET`, `PASSWORD_MISMATCH`, `PASSWORD_TOO_LONG`; `401 UNAUTHORIZED` hoặc `USER_NOT_FOUND`. Tài khoản đã có mật khẩu dùng A08.

### A08. PUT /api/auth/change-password

**Quyền:** đăng nhập.

```json
{
  "oldPassword": "ExamplePass123!",
  "newPassword": "ExamplePass456!",
  "confirmNewPassword": "ExamplePass456!"
}
```

`newPassword`, `confirmNewPassword` bắt buộc; mật khẩu mới tối thiểu 6 ký tự, tối đa 72 byte UTF-8. `oldPassword` phải được cung cấp và chính xác nếu tài khoản đã có mật khẩu. Code hiện tại cũng cho tài khoản chưa có mật khẩu bỏ `oldPassword`; luồng thiết lập lần đầu nên dùng A07.

**Thành công:** `200 OK`, body `{ "message": "Đổi mật khẩu thành công. Các phiên đăng nhập trên thiết bị khác đã được đăng xuất." }`. Mọi refresh token đều bị thu hồi, gồm cả phiên hiện tại.

**Lỗi:** `400 VALIDATION_ERROR`, `OLD_PASSWORD_REQUIRED`, `SAME_AS_OLD_PASSWORD`, `PASSWORD_MISMATCH`, `PASSWORD_TOO_LONG`, `USER_NOT_FOUND`; `401 INVALID_OLD_PASSWORD` hoặc lỗi xác thực Bearer.

### A09. POST /api/auth/forgot-password

**Quyền:** công khai.

```json
{ "email": "learner@example.com" }
```

`email`: string bắt buộc, đúng định dạng; trim/chuyển chữ thường.

**Thành công:** `200 OK`:

```json
{
  "code": "OTP_SENT",
  "message": "Nếu email hợp lệ, mã OTP xác thực đã được gửi đến hộp thư của bạn."
}
```

Email không có tài khoản hoặc tài khoản không hoạt động vẫn nhận response thành công, không gửi OTP. Response không chứa OTP. Với tài khoản hợp lệ, OTP có 6 chữ số, hạn mặc định 5 phút theo `Email:OtpExpiryMinutes`; thời gian giữa hai lần yêu cầu tối thiểu 60 giây. Khi có nhiều bản ghi OTP, backend chọn mã chưa dùng, còn hạn có ID mới nhất để kiểm tra.

**Lỗi:** `400 VALIDATION_ERROR`; `429 OTP_COOLDOWN` khi gửi lại quá sớm. Lỗi gửi mail không được xử lý có thể trả `500 INTERNAL_SERVER_ERROR`. Cần cấu hình SMTP để kiểm thử nhận email thật; chế độ local/mock không chứng minh mail đã đến hộp thư.

### A10. POST /api/auth/reset-password

**Quyền:** công khai.

```json
{
  "email": "learner@example.com",
  "otp": "123456",
  "newPassword": "ExamplePass456!",
  "confirmNewPassword": "ExamplePass456!"
}
```

| Body | Điều kiện |
|---|---|
| `email` | String bắt buộc, đúng định dạng |
| `otp` | String bắt buộc gồm đúng 6 chữ số; không gửi kiểu number |
| `newPassword` | String bắt buộc, tối thiểu 6 ký tự, không quá 72 byte UTF-8 |
| `confirmNewPassword` | String bắt buộc, trùng mật khẩu mới |

**Thành công:** `200 OK`, body `{ "message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới." }`. OTP bị đánh dấu đã dùng; mọi refresh token bị thu hồi. Không tự đăng nhập.

**Lỗi `400`:** `VALIDATION_ERROR`, `USER_NOT_FOUND`, `OTP_EXPIRED_OR_NOT_FOUND`, `OTP_MAX_ATTEMPTS_EXCEEDED`, `INVALID_OTP`, `PASSWORD_MISMATCH`, `PASSWORD_TOO_LONG`. Nhập sai tăng bộ đếm; sau 5 lần sai, các lần thử tiếp bị chặn và cần yêu cầu mã mới. OTP đã dùng không được dùng lại.

### A11. PUT /api/auth/me (CHG-008, 18/11/2026)

**Quyền:** đăng nhập. Người dùng (kể cả quản trị viên) chỉ sửa được hồ sơ của **chính mình**: mã người dùng lấy từ access token, không nhận từ route hoặc body. Không có API nào cho quản trị viên sửa tên, email hay mật khẩu của người khác; quản trị viên chỉ đổi vai trò/trạng thái, thu hồi phiên và cấp/thu hồi VIP.

```json
{ "username": "Tên hiển thị mới" }
```

`username` bắt buộc, được cắt khoảng trắng hai đầu, 1–100 ký tự. Trường lạ (`role`, `email`, `status`, `userId`…) bị từ chối với `400`. Email là tên đăng nhập (gắn tài khoản Google) nên không sửa ở đây.

**Thành công:** `200 OK`, body `UserDto` sau khi sửa. Không đổi token.

**Lỗi:** `400 VALIDATION_ERROR`, `USERNAME_REQUIRED`, `USERNAME_TOO_LONG`; `401 UNAUTHORIZED` hoặc `USER_NOT_FOUND` (tài khoản bị khóa/không còn).

**Lưu ý cho client:** A08 trả `401 INVALID_OLD_PASSWORD` khi sai mật khẩu hiện tại; client không được coi mã này là hết phiên (không làm mới token, không đăng xuất). Sau A08 thành công mọi refresh token bị thu hồi, nên FE/Admin đăng nhập lại ngay bằng mật khẩu mới để giữ phiên trên thiết bị đang dùng.

<a id="learner"></a>

## 5. Danh mục và API Người học

### E01. GET /api/exam-catalogs

**Quyền:** đăng nhập. Không body/query. **Thành công:** `200 OK`, `ExamCatalogDto`:

| Thuộc tính | Nội dung phần tử |
|---|---|
| `parts` | `partNo` integer, `partName` string, `skill` string, `standardQuestionCount` integer, `optionCount` integer |
| `levels` | `levelNo` integer, `nameVi` string, `shortLabel` string |
| `categories` | `categoryId` integer, `partNo` integer, `parentCategoryId` integer/null, `code` string, `nameVi` string, `nameEn` string/null, `sortOrder` integer, `isLeaf` boolean |
| `specialTags` | `specialTagId` integer, `partNo` integer, `code` string, `nameVi` string |

Mỗi thuộc tính là một mảng. Danh mục `categories` chỉ chứa phân loại đang hoạt động. Khi tạo/sửa nhóm, chọn `isLeaf: true` của đúng Part. `specialTags` cũng phải thuộc đúng Part. Không hard-code ID phân loại/cờ từ ví dụ. API này chỉ đọc danh mục, chưa có endpoint quản trị các danh mục trên.

| Part | Skill | Số câu chuẩn | Số phương án | Phạm vi số câu |
|---|---|---|---|---|
| 1 | LISTENING | 6 | 4 | 1–6 |
| 2 | LISTENING | 25 | 3 | 7–31 |
| 3 | LISTENING | 39 | 4 | 32–70 |
| 4 | LISTENING | 30 | 4 | 71–100 |
| 5 | READING | 30 | 4 | 101–130 |
| 6 | READING | 16 | 4 | 131–146 |
| 7 | READING | 54 | 4 | 147–200 |

Số câu/số phương án chuẩn được trả từ cấu hình database. Bảng trên là dữ liệu chuẩn đang áp dụng. `levelNo` nhận 1–4; tên hiển thị lấy từ `levels`.

### E02. GET /api/exam-sets

**Quyền:** đăng nhập. Query: `page`, `pageSize`, `search` theo mục 1.6.

```http
GET /api/exam-sets?page=1&pageSize=20&search=ETS
```

**Thành công:** `200 OK`, trang `ExamSetDto`. Chỉ hiển thị bộ chưa xóa có ít nhất một đề `PUBLISHED` chưa xóa. Không thấy bộ Nháp/rỗng trong danh sách là hành vi bình thường. Danh sách không kèm các đề bên trong; gọi E04 với `examSetId`.

**Lỗi:** `400 VALIDATION_ERROR`, `401`.

### E03. GET /api/exam-sets/{id} ? ?? g?

Endpoint ?? g? ng?y 13/11/2026 sau khi ??i chi?u Admin v? Ng??i h?c. H?p ??ng v? ph??ng ?n thay th? xem [b?o c?o d?n API](API_CLEANUP_2026-11-13.md).

### E04. GET /api/exams

**Quyền:** đăng nhập. Query chung theo mục 1.6, thêm `examSetId` integer tùy chọn, tối thiểu 1.

```http
GET /api/exams?examSetId=3&page=1&pageSize=20&search=Test
```

**Thành công:** `200 OK`, trang `ExamDto`. Chỉ lấy đề `PUBLISHED`, chưa xóa, thuộc bộ chưa xóa. `examSetId` không có dữ liệu phù hợp trả trang rỗng, không phải 404. API này không nhận bộ lọc trạng thái Nháp/thùng rác của Admin.

**Lỗi:** `400 VALIDATION_ERROR`, `401`.

### E05. GET /api/exams/{id} ? ?? g?

Endpoint ?? g? ng?y 13/11/2026 sau khi ??i chi?u Admin v? Ng??i h?c. H?p ??ng v? ph??ng ?n thay th? xem [b?o c?o d?n API](API_CLEANUP_2026-11-13.md).

<a id="admin-sets"></a>

## 6. Quản trị bộ đề

Tất cả endpoint mục này yêu cầu ADMIN. Tên bộ duy nhất giữa các bộ chưa xóa. Bộ đã xóa có thể nhường tên cho bộ khác; khôi phục có thể gặp xung đột tên.

### E06. GET /api/admin/exam-sets

Query: `page`, `pageSize`, `search`, `isDeleted` theo mục 1.6.

```http
GET /api/admin/exam-sets?isDeleted=false&page=1&pageSize=20
```

**Thành công:** `200 OK`, trang `ExamSetDto`, gồm cả bộ rỗng và bộ chưa có đề xuất bản. `isDeleted=true` lấy riêng bộ đã xóa. **Lỗi:** `400 VALIDATION_ERROR`, `401`, `403`.

### E07. GET /api/admin/exam-sets/{id} ? ?? g?

Endpoint ?? g? ng?y 13/11/2026 sau khi ??i chi?u Admin v? Ng??i h?c. H?p ??ng v? ph??ng ?n thay th? xem [b?o c?o d?n API](API_CLEANUP_2026-11-13.md).

### E08. POST /api/admin/exam-sets

| Body | Kiểu | Bắt buộc | Điều kiện |
|---|---|---|---|
| `name` | string | Có | Tối đa 150 ký tự; trim |
| `description` | string/null | Không | Tối đa 1.000 ký tự; trim, chuỗi trắng thành null |

```json
{ "name": "ETS 2026", "description": "Bộ đề luyện thi TOEIC" }
```

**Thành công:** `201 Created`, `ExamSetDto`; không có header `Location` tới E07 đã gỡ. ID, người tạo và thời điểm do server quản lý.

**Lỗi:** `400 VALIDATION_ERROR`; `409 EXAM_SET_NAME_EXISTS`, `CONCURRENT_CHANGE`; `401`, `403`.

### E09. PUT /api/admin/exam-sets/{id}

Body cùng cấu trúc E08; gửi lại `name` và mô tả mong muốn. **Thành công:** `200 OK`, `ExamSetDto`. Không tạo bản ghi mới nếu ID chưa có.

**Lỗi:** `404 EXAM_SET_NOT_FOUND`; `409 EXAM_SET_DELETED`, `EXAM_SET_NAME_EXISTS`, `CONCURRENT_CHANGE`; `400 VALIDATION_ERROR`; `401`, `403`. Bộ đã xóa phải được khôi phục trước khi sửa.

### E10. DELETE /api/admin/exam-sets/{id}

Không body. Xóa mềm, chỉ được thực hiện khi bộ không còn đề chưa xóa. Có thể xóa/chuyển các đề còn lại trước; đề Nháp cũng tính là đề chưa xóa.

**Thành công:** `204 No Content`. Gọi lại trên bộ đã xóa vẫn thành công.

**Lỗi:** `404 EXAM_SET_NOT_FOUND`; `409 EXAM_SET_NOT_EMPTY`, `CONCURRENT_CHANGE`; `401`, `403`.

Khi `EXAM_SET_NOT_EMPTY`, response có thêm trường `exams` dạng trang `ExamDto`:

```json
{
  "code": "EXAM_SET_NOT_EMPTY",
  "message": "Bộ còn đề chưa xóa. Hãy xóa hoặc chuyển đề trước.",
  "exams": {
    "items": [
      {
        "examId": 21,
        "examSetId": 3,
        "examCode": "ETS2026_T01",
        "title": "Test 01",
        "description": null,
        "status": "DRAFT",
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2026-10-30T03:00:00Z",
        "updatedAt": "2026-10-30T03:00:00Z"
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20
  },
  "traceId": "<trace-id>"
}
```

Trường `exams` chứa trang đầu, tối đa 20 đề; nếu `totalCount` lớn hơn số phần tử trang đầu, dùng E12 với `examSetId` để xem các trang còn lại.

### E11. POST /api/admin/exam-sets/{id}/restore

Không body. **Thành công:** `200 OK`, `ExamSetDto`; chỉ khôi phục bộ, không khôi phục các đề đã xóa bên trong. Gọi lại trên bộ đang hoạt động vẫn thành công.

**Lỗi:** `404 EXAM_SET_NOT_FOUND`; `409 EXAM_SET_NAME_EXISTS`, `CONCURRENT_CHANGE`; `401`, `403`.

<a id="admin-exams"></a>

## 7. Quản trị thông tin đề

Tất cả endpoint mục này yêu cầu ADMIN. Mỗi đề thuộc đúng một bộ. Mã và tên đề duy nhất **trong cùng bộ**, giữa các đề chưa xóa. Hai bộ khác nhau có thể trùng mã/tên.

### E12. GET /api/admin/exams

Query chung theo mục 1.6, thêm:

| Query | Kiểu | Mặc định | Điều kiện |
|---|---|---|---|
| `examSetId` | integer? | Không lọc | Tối thiểu 1 |
| `status` | string? | Không lọc | `DRAFT` hoặc `PUBLISHED` |
| `isDeleted` | boolean | `false` | `true` chỉ lấy đề đã xóa |

```http
GET /api/admin/exams?examSetId=3&status=DRAFT&isDeleted=false&page=1&pageSize=20
```

**Thành công:** `200 OK`, trang `ExamDto`. Không tìm thấy dữ liệu phù hợp trả trang rỗng. **Lỗi:** `400 VALIDATION_ERROR`, `401`, `403`.

### E13. GET /api/admin/exams/{id}

Không body/query. **Thành công:** `200 OK`, `ExamDto`, kể cả đề Nháp hoặc đã xóa. Response chỉ chứa metadata. **Lỗi:** `404 EXAM_NOT_FOUND`, `401`, `403`.

### E14. POST /api/admin/exams

| Body | Kiểu | Bắt buộc | Điều kiện |
|---|---|---|---|
| `examSetId` | integer | Có | ID bộ đang hoạt động, tối thiểu 1 |
| `examCode` | string/null | Không | Tối đa 30 ký tự; nếu cung cấp phải khớp `[A-Za-z0-9][A-Za-z0-9_-]*` |
| `title` | string | Có | Tối đa 200 ký tự; trim |
| `description` | string/null | Không | Tối đa 1.000 ký tự; trim, chuỗi trắng thành null |

```json
{
  "examSetId": 3,
  "examCode": "ETS2026_T01",
  "title": "Test 01",
  "description": "Đề luyện tập số 1"
}
```

Có thể bỏ `examCode` hoặc gửi null để server sinh mã bắt đầu bằng `EXAM-`. Không phụ thuộc phần ngẫu nhiên cụ thể của mã. Khi tự nhập, dùng mã không có khoảng trắng; không dùng mã nhóm Excel làm `examId`.

**Thành công:** `201 Created`, `ExamDto` có `status: "DRAFT"`, chưa có nội dung; `Location` trỏ E13. Không nhận trường `status`, `createdBy`, ID tự đặt hoặc toàn bộ câu hỏi trong request này.

**Lỗi:** `400 VALIDATION_ERROR`; `404 EXAM_SET_NOT_FOUND`; `409 EXAM_SET_DELETED`, `EXAM_CODE_EXISTS`, `EXAM_TITLE_EXISTS`, `CONCURRENT_CHANGE`; `401`, `403`.

### E15. PUT /api/admin/exams/{id}

Body cùng cấu trúc E14. Gửi đủ `examSetId` và `title`. Bỏ `examCode`/gửi null giữ mã hiện có. Có thể chuyển bộ bằng cách thay `examSetId` khi trạng thái/lịch sử cho phép.

| Thay đổi | Điều kiện |
|---|---|
| Tên, mô tả | Cho phép khi đề hoạt động, kể cả đã xuất bản hoặc có lượt làm |
| Mã đề, bộ đề | Đề phải Nháp và chưa có lịch sử |
| Nhóm, câu, đáp án, media, hướng dẫn riêng | Dùng các endpoint chuyên biệt, đề phải Nháp và chưa có lịch sử |

**Thành công:** `200 OK`, `ExamDto`. Không thay trạng thái xuất bản bằng PUT metadata.

**Lỗi:** `400 VALIDATION_ERROR`; `404 EXAM_NOT_FOUND`, `EXAM_SET_NOT_FOUND`; `409 EXAM_DELETED`, `EXAM_SET_DELETED`, `EXAM_MUST_BE_DRAFT`, `EXAM_CONTENT_LOCKED`, `EXAM_CODE_EXISTS`, `EXAM_TITLE_EXISTS`, `CONCURRENT_CHANGE`; `401`, `403`.

### E16. DELETE /api/admin/exams/{id}

Không body. **Thành công:** `204 No Content`, xóa mềm đề, giữ lịch sử và dữ liệu liên quan. Gọi lại trên đề đã xóa vẫn thành công; không thay `deletedAt` lần đầu. Không phải lệnh xóa vật lý hoặc xóa các lượt làm.

**Lỗi:** `404 EXAM_NOT_FOUND`; `409 CONCURRENT_CHANGE`; `401`, `403`.

### E17. POST /api/admin/exams/{id}/restore

Không body. **Thành công:** `200 OK`, `ExamDto`. Bộ cha phải đang hoạt động. Khôi phục giữ trạng thái trước khi xóa; nếu trước đó là `PUBLISHED`, đề có thể xuất hiện lại với Người học ngay khi được khôi phục. Gọi lại trên đề chưa xóa vẫn thành công.

**Lỗi:** `404 EXAM_NOT_FOUND`; `409 EXAM_SET_DELETED`, `EXAM_CODE_EXISTS`, `EXAM_TITLE_EXISTS`, `CONCURRENT_CHANGE`; `401`, `403`.

<a id="groups"></a>

## 8. Quản trị nhóm, câu hỏi và đáp án

Các endpoint mục này yêu cầu ADMIN. Đọc có thể dùng cho đề Nháp hoặc đã xuất bản chưa xóa. Ghi nội dung chỉ khi đề Nháp, bộ hoạt động và chưa có lịch sử. Lịch sử bao gồm lượt làm tham chiếu đề và câu của đề đã xuất hiện trong bài `BANK`, kể cả lượt BANK không có `ExamId`.

### 8.1. Request ghi nhóm — SaveGroupRequestDto

| Trường | Kiểu | Bắt buộc | Điều kiện |
|---|---|---|---|
| `partNo` | integer | Có | 1–7; không đổi Part của nhóm đã tạo |
| `groupOrder` | integer/null | Khi chưa có câu | 1–200; nếu có câu, server luôn lấy `questionNo` nhỏ nhất |
| `categoryId` | integer | Có | Nút lá đang hoạt động thuộc đúng Part |
| `groupLevelNo` | integer/null | Không ở Nháp | 1–4; chỉ dùng Part 3, 4, 6, 7 |
| `passageHtml` | string/null | Không ở Nháp | Tối đa 200.000 ký tự; chỉ Part 6, 7; được lọc HTML trước lưu |
| `transcriptEn` | string/null | Không ở Nháp | Tối đa 50.000 ký tự; chỉ Part 1–4 |
| `translationVi` | string/null | Không ở Nháp | Tối đa 50.000 ký tự; dùng cho mọi Part |
| `specialTagIds` | integer[] | Không được null | Tối đa 5 ID dương khác nhau, thuộc đúng Part; có thể gửi `[]` |
| `questions` | object[] | Không được null | Tối đa 5 phần tử; giới hạn thực tế theo Part ở bảng dưới; có thể `[]` khi có `groupOrder` |

Hai mảng có giá trị khởi tạo rỗng nếu bỏ khỏi JSON; nên luôn gửi rõ mảng mong muốn, đặc biệt khi PUT để tránh vô tình bỏ câu/cờ. Nội dung chuỗi tùy chọn được trim, chuỗi trắng thành null; `optionText` được lưu theo request.

| Part | Số câu tối đa khi lưu Nháp | Số câu mỗi nhóm khi xuất bản |
|---|---|---|
| 1, 2, 5 | 1 | 1 |
| 3, 4 | 3 | 3 |
| 6 | 4 | 4 |
| 7 | 5 | 2–5 |

### 8.2. Request câu và đáp án

Mỗi phần tử `questions`:

| Trường | Kiểu | Điều kiện |
|---|---|---|
| `questionId` | integer/null | Bỏ/null với câu mới; khi sửa dùng ID câu đang hoạt động trong chính nhóm |
| `questionNo` | integer | Bắt buộc, 1–200; không trùng trong request hoặc với câu đang hoạt động khác của đề |
| `levelNo` | integer/null | 1–4; Nháp có thể thiếu |
| `questionText` | string/null | Tối đa 50.000 ký tự |
| `explanation` | string/null | Tối đa 50.000 ký tự |
| `optionExplanations` | string/null | Tối đa 20.000 ký tự; định dạng ở mục 8.3 |
| `options` | object[] | Không null; tối đa 4; Nháp có thể rỗng/chưa đủ |

Mỗi phần tử `options`:

| Trường | Kiểu | Điều kiện |
|---|---|---|
| `optionLabel` | string | Bắt buộc, `A`/`B`/`C`/`D`; Part 2 chỉ A/B/C; không trùng trong câu |
| `optionText` | string | Tối đa 1.000 ký tự; Nháp có thể rỗng |
| `isCorrect` | boolean | Mặc định false; Nháp tối đa một đáp án đúng, xuất bản phải đúng một |

ID option do server sinh. Khi sửa, phương án được nhận diện bằng `optionLabel`; không gửi `optionId`. API không nhận `correctAnswer: "A"`; dùng `isCorrect` trên phương án tương ứng.

### 8.3. Định dạng optionExplanations

Đây là một string chứa toàn bộ giải thích phương án, không phải mảng/object JSON. Part 2 có 3 dòng A/B/C; các Part khác 4 dòng A/B/C/D theo thứ tự. Mỗi dòng bắt đầu `A:`/`B:`/... và có đúng một nhãn `- Đúng` hoặc `- Sai` (cũng nhận dấu `–`, `—`). Chỉ một dòng Đúng, khớp phương án `isCorrect: true`.

```text
A: completed - Đúng: phù hợp cấu trúc bị động.
B: complete - Sai: đây là dạng nguyên thể.
C: completing - Sai: không phù hợp cấu trúc.
D: completes - Sai: đây là dạng hiện tại.
```

Trong JSON dùng `\n` để xuống dòng. Không lặp nhãn hoặc dùng `Sai/Đúng`. Nếu đã cung cấp chuỗi này thì phải đúng định dạng ngay khi lưu Nháp. Muốn lưu Nháp chưa biên soạn xong, có thể để null; khi xuất bản phải có đầy đủ. Backend kiểm tra cấu trúc/nhãn, không xác minh lý do ngữ nghĩa của giải thích; người biên soạn chịu trách nhiệm nội dung.

### E18. GET /api/admin/exams/{examId}/groups

Query tùy chọn: `partNo` integer 1–7. Không phân trang.

```http
GET /api/admin/exams/21/groups?partNo=5
```

**Thành công:** `200 OK`, mảng `QuestionGroupDto`, sắp theo `groupOrder`, có câu, phương án, cờ và metadata media. Không có nhóm phù hợp trả `[]`.

**Lỗi:** `400 VALIDATION_ERROR`; `404 EXAM_NOT_FOUND` nếu đề không có/đã xóa; `401`, `403`.

### E19. GET /api/admin/exams/{examId}/groups/{groupId} ? ?? g?

Endpoint ?? g? ng?y 13/11/2026 sau khi ??i chi?u Admin v? Ng??i h?c. H?p ??ng v? ph??ng ?n thay th? xem [b?o c?o d?n API](API_CLEANUP_2026-11-13.md).

### E20. POST /api/admin/exams/{examId}/groups ? ?? g?

Endpoint ?? g? ng?y 13/11/2026 sau khi ??i chi?u Admin v? Ng??i h?c. H?p ??ng v? ph??ng ?n thay th? xem [b?o c?o d?n API](API_CLEANUP_2026-11-13.md).

### E21. PUT /api/admin/exams/{examId}/groups/{groupId} ? ?? g?

Endpoint ?? g? ng?y 13/11/2026 sau khi ??i chi?u Admin v? Ng??i h?c. H?p ??ng v? ph??ng ?n thay th? xem [b?o c?o d?n API](API_CLEANUP_2026-11-13.md).

### E22. DELETE /api/admin/exams/{examId}/groups/{groupId} ? ?? g?

Endpoint ?? g? ng?y 13/11/2026 sau khi ??i chi?u Admin v? Ng??i h?c. H?p ??ng v? ph??ng ?n thay th? xem [b?o c?o d?n API](API_CLEANUP_2026-11-13.md).

### E23. DELETE /api/admin/exams/{examId}/groups/{groupId}/questions/{questionId} ? ?? g?

Endpoint ?? g? ng?y 13/11/2026 sau khi ??i chi?u Admin v? Ng??i h?c. H?p ??ng v? ph??ng ?n thay th? xem [b?o c?o d?n API](API_CLEANUP_2026-11-13.md).

<a id="directions"></a>

## 9. Quản trị hướng dẫn

Các endpoint yêu cầu ADMIN. Đề xuất bản phải có **9 mục hướng dẫn hiệu lực**: 2 SECTION (`LISTENING`, `READING`) và 7 PART. Mỗi khóa `(directionKind, skill, partNo)` có tối đa một bản đang hoạt động cho mỗi đề và một bản mặc định.

### 9.1. Request ghi hướng dẫn — SaveDirectionRequestDto

| Trường | Kiểu | Bắt buộc | Điều kiện |
|---|---|---|---|
| `examId` | integer/null | Không | Null/bỏ: mặc định; ID dương: bản riêng của đề |
| `directionKind` | string | Có | `SECTION` hoặc `PART` |
| `skill` | string/null | Với SECTION | `LISTENING` hoặc `READING`; PART phải null/bỏ |
| `partNo` | integer/null | Với PART | 1–7; SECTION phải null/bỏ |
| `directionsEn` | string | Có | Tối đa 50.000 ký tự |
| `directionsVi` | string/null | Không | Tối đa 50.000 ký tự |
| `exampleEn` | string/null | Không | Tối đa 50.000 ký tự |
| `exampleVi` | string/null | Không | Tối đa 50.000 ký tự |

Các trường văn bản được trim, chuỗi trắng ở trường tùy chọn thành null. Khi sửa không được đổi khóa `(examId, directionKind, skill, partNo)`.

Bản riêng của đề ưu tiên **toàn bộ mục**, gồm văn bản, ví dụ và media. Trường null trong bản riêng không tự lấy trường tương ứng từ mặc định. Xóa mềm bản riêng làm mục đó quay về mặc định nếu mặc định còn hoạt động.

Hướng dẫn riêng chỉ sửa khi đề Nháp và chưa có lịch sử. Hướng dẫn mặc định bị khóa khi có đề có lịch sử đang dùng mặc định đó; nếu đề có override của đúng khóa thì nó không sử dụng mặc định của khóa đó. Việc khóa áp dụng cả thay media mặc định.

### E24. GET /api/admin/directions

| Query | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `examId` | integer? | null | ID đề dương, nếu cần bản riêng/hiệu lực |
| `effective` | boolean | `false` | Có gộp mặc định và ưu tiên bản riêng hay không |

| Cách gọi | Dữ liệu trả |
|---|---|
| Không có `examId` | Chỉ các mục mặc định chưa xóa |
| `examId=21&effective=false` | Chỉ bản riêng của đề 21 |
| `examId=21&effective=true` | Các mục hiệu lực: ưu tiên bản riêng, còn lại lấy mặc định |

**Thành công:** `200 OK`, mảng `ExamDirectionDto`; không phân trang. Khi đề chưa có override, `effective=false` có thể trả `[]` dù `effective=true` trả đủ 9 mục. Endpoint này không dùng để xác nhận đề tồn tại; gọi E13 để kiểm tra metadata đề.

**Lỗi:** `400 VALIDATION_ERROR`, `401`, `403`.

### E25. POST /api/admin/directions

Ví dụ tạo bản riêng cho Part 3:

```json
{
  "examId": 21,
  "directionKind": "PART",
  "skill": null,
  "partNo": 3,
  "directionsEn": "Listen to each conversation and answer the questions.",
  "directionsVi": "Nghe mỗi hội thoại và trả lời các câu hỏi.",
  "exampleEn": null,
  "exampleVi": null
}
```

Ví dụ khóa SECTION mặc định: `examId: null`, `directionKind: "SECTION"`, `skill: "LISTENING"`, `partNo: null`; các trường nội dung theo mục 9.1.

**Thành công:** `201 Created`, `ExamDirectionDto`. Bộ seed đã có 9 mục mặc định; muốn sửa mục đó phải dùng PUT với ID lấy từ E24, không POST trùng khóa.

**Lỗi:** `400 VALIDATION_ERROR`, `DIRECTION_KEY_INVALID`; `404 EXAM_NOT_FOUND`; `409 EXAM_MUST_BE_DRAFT`, `EXAM_CONTENT_LOCKED`, `DEFAULT_DIRECTIONS_LOCKED`, `EXAM_CONTENT_CONFLICT`, `CONCURRENT_CHANGE`; `401`, `403`.

### E26. PUT /api/admin/directions/{id}

Body cùng E25, giữ nguyên toàn bộ khóa. **Thành công:** `200 OK`, `ExamDirectionDto`. Các trường nội dung tùy chọn bỏ đi có thể bị đưa về null; media được quản lý riêng.

**Lỗi:** các lỗi ghi hướng dẫn ở E25; thêm `404 DIRECTION_NOT_FOUND`, `409 DIRECTION_KEY_IMMUTABLE`.

### E27. DELETE /api/admin/directions/{id} ? ?? g?

Endpoint ?? g? ng?y 13/11/2026 sau khi ??i chi?u Admin v? Ng??i h?c. H?p ??ng v? ph??ng ?n thay th? xem [b?o c?o d?n API](API_CLEANUP_2026-11-13.md).

<a id="media"></a>

## 10. Media Cloudflare R2

### 10.1. Hợp đồng upload và lưu trữ

Bucket riêng tư. Client upload **qua backend**; chưa có API cấp URL upload trực tiếp từ trình duyệt. Không gửi Access Key/Secret Key hoặc tên bucket trong request. Backend tự xác định loại tệp, sinh storage key và ghi quan hệ vào database.

| Loại | Đuôi hỗ trợ | Content-Type backend lưu | Giới hạn mặc định |
|---|---|---|---|
| AUDIO | `.mp3`, `.wav` | `audio/mpeg`, `audio/wav` | 25 MiB = 26.214.400 byte |
| IMAGE | `.png`, `.jpg`, `.jpeg` | `image/png`, `image/jpeg` | 10 MiB = 10.485.760 byte |

Backend kiểm tra đuôi tệp và chữ ký nội dung đầu/cuối theo định dạng hỗ trợ; không chỉ tin MIME client gửi. Đây không phải kiểm tra giải mã toàn bộ audio/image. Tệp rỗng không hợp lệ.

Giới hạn loại tệp điều chỉnh bằng `Media:MaxAudioBytes`, `Media:MaxImageBytes`; request multipart còn có trần 50 MiB ở controller. Tên tệp có thể đặt dễ đọc, ví dụ `part-3-q032-034.mp3`; server chuẩn hóa tên, thêm phần ngẫu nhiên để tránh đè object. Không nhận ID/key do client tự đặt.

- Nhóm Part 1–4 nhận audio và image; Part 5–7 chỉ nhận image.
- Upload audio mới cho cùng nhóm thay audio đang hoạt động bằng bản mới; bản cũ được xóa mềm. Nhóm có thể có nhiều image.
- Với một hướng dẫn, upload mới thay media đang hoạt động **cùng loại** của hướng dẫn đó: tối đa một audio và một image đang hoạt động.
- DELETE media chỉ xóa mềm bản ghi; object R2 không bị xóa vật lý qua API này. URL đã ký không có cơ chế thu hồi ngay qua DELETE/logout; dùng thời hạn URL để giới hạn sử dụng.

### E28. POST /api/admin/exams/{examId}/groups/{groupId}/media

**Quyền:** ADMIN. Nhóm thuộc đúng đề; đề Nháp và chưa có lịch sử.

| Vị trí | Trường | Kiểu | Bắt buộc | Điều kiện |
|---|---|---|---|---|
| Form multipart | `file` | binary file | Có | Một tệp đúng loại/giới hạn |
| Query | `altText` | string? | Không | Tối đa 300 ký tự; trim, chuỗi trắng thành null |
| Query | `sortOrder` | integer | Không | 1–255, mặc định 1 |

```http
POST /api/admin/exams/21/groups/402/media?sortOrder=1&altText=Part%203%2C%20cau%2032-34
Content-Type: multipart/form-data; boundary=<generated-by-client>
Authorization: Bearer <admin-access-token>
```

Tên field file phải là **`file`**. `altText`, `sortOrder` nằm trong query, không phải các trường JSON hoặc form thay thế.

**Thành công:** `201 Created`, `MediaFileDto`; gọi E30 để lấy URL xem trước. Không có URL phát vĩnh viễn trong response upload.

**Lỗi:** `400 VALIDATION_ERROR`, `MEDIA_INVALID`, `MEDIA_TYPE_INVALID`, `AUDIO_NOT_ALLOWED`; `404 GROUP_NOT_FOUND`, `EXAM_NOT_FOUND`; `409 EXAM_CONTENT_LOCKED`, `EXAM_MUST_BE_DRAFT`, `EXAM_CONTENT_CONFLICT`, `CONCURRENT_CHANGE`; `413 MEDIA_TOO_LARGE`; `503 STORAGE_UNAVAILABLE`; `401`, `403`. Request vượt trần multipart cũng có thể bị web server từ chối 413 trước khi tạo JSON nghiệp vụ.

### E29. POST /api/admin/directions/{id}/media

**Quyền:** ADMIN. Body multipart chỉ có `file`; cùng định dạng/giới hạn với E28. Không có query `altText`/`sortOrder` trên endpoint này; bản ghi mới có `altText: null`, `sortOrder: 1`.

**Thành công:** `201 Created`, `MediaFileDto`. Audio/image mới thay bản đang hoạt động cùng loại trên mục hướng dẫn. Hướng dẫn riêng phải thuộc đề Nháp chưa có lịch sử; hướng dẫn mặc định phải chưa bị khóa sử dụng.

**Lỗi:** như E28 tùy trường hợp, thay lỗi nhóm bằng `DIRECTION_NOT_FOUND` và có thêm `409 DEFAULT_DIRECTIONS_LOCKED`. Không áp dụng giới hạn audio Part 1–4 của **nhóm** cho audio của hướng dẫn.

### E30. GET /api/admin/media/{id}/url

**Quyền:** ADMIN. `id` là `mediaId`, không phải group/direction ID. Không body/query.

**Thành công:** `200 OK`, `SignedMediaUrlDto`, header `Cache-Control: no-store`. Mặc định URL hạn 10 phút theo `R2:SignedUrlMinutes`, được giới hạn trong khoảng 1–60 phút. API hiện không có tham số cho client tự chọn thời hạn.

Client GET trực tiếp `url` trước `expiresAt`; không gắn Bearer ToeicMind vào request tới R2. URL có thể mở `<audio>`/`<img>` khi trình duyệt và cấu hình bucket phù hợp. Khi cần URL mới, gọi lại endpoint; không tự ghép `storageKey` thành URL công khai. Việc ký URL không thay cho kiểm tra object có tồn tại hoặc bảo đảm phát media trong browser thành công.

**Lỗi:** `404 MEDIA_NOT_FOUND` khi không có media hoạt động phù hợp hoặc nguồn đã bị xóa; `503 STORAGE_UNAVAILABLE`; `401`, `403`. Đây là API xem trước Admin; chưa có endpoint ký media cho Người học theo lượt làm.

### E31. DELETE /api/admin/media/{id}

**Quyền:** ADMIN. Không body.

**Thành công:** `204 No Content`, xóa mềm media. Đề chứa media phải Nháp, chưa có lịch sử; hướng dẫn mặc định phải chưa bị khóa. Gọi lại media đã xóa trả 404.

**Lỗi:** `404 MEDIA_NOT_FOUND`, `EXAM_NOT_FOUND`; `409 EXAM_CONTENT_LOCKED`, `EXAM_MUST_BE_DRAFT`, `DEFAULT_DIRECTIONS_LOCKED`, `CONCURRENT_CHANGE`; `401`, `403`.

<a id="publication"></a>

## 11. Kiểm tra và xuất bản đề

### 11.1. Điều kiện xuất bản

Đề/bộ phải hoạt động và thỏa toàn bộ quy tắc kiểm tra:

1. Đủ 200 câu ở 7 Part, số câu/phạm vi theo mục 5; số câu trong nhóm đúng cấu trúc, liên tiếp; `groupOrder` bằng số câu nhỏ nhất.
2. Phân loại là nút lá đang hoạt động, đúng Part. Có bản dịch nhóm tiếng Việt ở mọi Part.
3. Part 1–4 có transcript và audio nhóm; Part 1 có image. Nhóm gắn cờ `chart_or_table` phải có image.
4. Part 6/7 có `passageHtml`; Part 3/4/6/7 có `groupLevelNo`.
5. Mọi câu có độ khó, giải thích chung và giải thích phương án đúng định dạng. Nội dung câu bắt buộc ở Part 2/3/4/5/7 theo bộ kiểm tra hiện tại.
6. Mỗi câu đủ phương án có nội dung; Part 2 có A/B/C, các Part khác A/B/C/D; đúng một phương án đúng và nhãn giải thích khớp đáp án.
7. Có đủ 9 mục hướng dẫn hiệu lực, `directionsEn` không rỗng.

Cho phép lưu Nháp thiếu các nội dung bắt buộc khi xuất bản; vẫn phải tuân thủ kiểu dữ liệu, giới hạn và các quy tắc lưu Nháp ở mục 8. `publish-check` chỉ là kết quả tại thời điểm gọi; publish sẽ kiểm tra lại để xử lý thay đổi xảy ra sau đó.

### E32. GET /api/admin/exams/{examId}/publish-check

**Quyền:** ADMIN. Không body/query.

**Thành công:** `200 OK`, kể cả khi đề chưa đủ điều kiện:

```json
{
  "isValid": false,
  "issues": [
    {
      "code": "PART_QUESTION_COUNT",
      "message": "Part 1 cần 6 câu, hiện có 0.",
      "partNo": 1,
      "groupId": null,
      "questionId": null
    }
  ]
}
```

Ví dụ rút gọn một issue; response thực tế có thể chứa nhiều lỗi. Đề hợp lệ trả `{ "isValid": true, "issues": [] }`. Thao tác này không đổi trạng thái đề.

**Lỗi:** `404 EXAM_NOT_FOUND` nếu đề/bộ không hoạt động; `401`, `403`.

### E33. POST /api/admin/exams/{examId}/publish

**Quyền:** ADMIN. Không body.

**Thành công:** `200 OK`:

```json
{ "examId": 21, "status": "PUBLISHED" }
```

Khi chưa hợp lệ: `400 Bad Request`, trạng thái không bị đổi bởi thao tác thất bại:

```json
{
  "code": "EXAM_PUBLICATION_INVALID",
  "message": "Đề chưa đủ điều kiện xuất bản",
  "errors": [
    {
      "code": "AUDIO_REQUIRED",
      "message": "Nhóm Listening thiếu audio.",
      "partNo": 3,
      "groupId": 402,
      "questionId": null
    }
  ],
  "traceId": "<trace-id>"
}
```

Lỗi khác: `404 EXAM_NOT_FOUND`; `409 CONCURRENT_CHANGE`; `401`, `403`. Request publish không nhận `status` từ client. Gọi publish lại vẫn kiểm tra nội dung trước khi trả kết quả.

### E34. POST /api/admin/exams/{examId}/unpublish

**Quyền:** ADMIN. Không body. **Thành công:** `200 OK`:

```json
{ "examId": 21, "status": "DRAFT" }
```

Gọi lại trên đề đang Nháp cũng thành công. Unpublish làm đề ngừng hiển thị ở API Người học, không xóa lịch sử. **Đưa về Nháp không mở khóa nội dung nếu đã có lượt làm**; trường hợp đó chỉ sửa tên/mô tả hoặc tạo đề mới cho thay đổi lớn.

**Lỗi:** `404 EXAM_NOT_FOUND` khi đề/bộ không hoạt động; `401`, `403`.

<a id="errors"></a>

<a id="admin-users"></a>

## 11A. Quản trị người dùng và học viên

Tất cả endpoint nằm dưới `/api/admin/users`, **chỉ ADMIN** (`401` khi thiếu token, `403` khi không phải ADMIN). Danh sách học viên là danh sách người dùng lọc `role=LEARNER`. Admin không được sửa tên hoặc email của tài khoản khác; thông tin cá nhân thuộc quyền của chính chủ tài khoản. Không có xóa cứng: khóa tài khoản (`LOCKED`) để giữ lịch sử học tập và dữ liệu liên quan (đề do ADMIN tạo tham chiếu `CreatedBy`).

`AdminUserDto`: `userId, username, email, role (ADMIN|LEARNER), status (ACTIVE|LOCKED), hasPassword, hasGoogle, activeSessionCount, createdAt, updatedAt`. Không bao giờ trả mật khẩu băm. `activeSessionCount` là số refresh token chưa thu hồi và chưa hết hạn.

| Endpoint | Chức năng | Thành công |
|---|---|---|
| `GET /api/admin/users?page&pageSize(≤100)&search&role&status` | Danh sách, mới nhất trước; `search` khớp một phần tên hoặc email | `200` `{items,totalCount,page,pageSize}` |
| `GET /api/admin/users/summary` | Đếm tổng, ADMIN, LEARNER, bị khóa | `200` `{total,admins,learners,locked}` |
| `POST /api/admin/users` | Tạo tài khoản và chọn vai trò. Body `{username,email,password,role}` | `201` |
| `PUT /api/admin/users/{id}/role` | Đổi vai trò. Body `{role}`. Thu hồi refresh token của người đó | `200` |
| `POST /api/admin/users/{id}/lock` | Khóa. Access token bị từ chối ngay ở request kế tiếp; refresh token bị thu hồi | `200` |
| `POST /api/admin/users/{id}/unlock` | Mở khóa | `200` |
| `POST /api/admin/users/{id}/revoke-sessions` | Đăng xuất mọi thiết bị | `204` |

Quy tắc: email được trim và chuyển chữ thường; mật khẩu 6–72 byte UTF-8; DTO từ chối trường lạ.

**Lỗi:** `400 VALIDATION_ERROR`, `PASSWORD_TOO_LONG`; `404 USER_NOT_FOUND`; `409 EMAIL_EXISTS` (tạo hoặc đổi email trùng), `CANNOT_MODIFY_SELF` (tự đổi vai trò hoặc tự khóa), `LAST_ADMIN` (hạ quyền hoặc khóa ADMIN đang hoạt động cuối cùng); `401`, `403`. Việc kiểm tra "ADMIN cuối cùng" nằm trong một câu UPDATE có điều kiện nên không có khoảng trống giữa kiểm tra và ghi.

## 12. Mã lỗi và cách xử lý

### 12.1. Dạng response lỗi

Lỗi nghiệp vụ thông thường:

```json
{
  "code": "EXAM_CONTENT_LOCKED",
  "message": "Đề đã có lượt làm. Nội dung, đáp án và cấu trúc được khóa; chỉnh sửa lớn cần tạo đề mới.",
  "traceId": "<trace-id>"
}
```

Lỗi validation DTO/body/query: HTTP `400`, `errors` là **object theo tên trường**:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "errors": {
    "Email": ["The Email field is not a valid e-mail address."]
  },
  "traceId": "<trace-id>"
}
```

Tên key validation có thể là tên property PascalCase (`Email`), đường dẫn model hoặc `$` khi JSON không hợp lệ/trường không được nhận. Không giả định tất cả message là tiếng Việt.

Lỗi nội dung nhóm: HTTP `400`, code `EXAM_CONTENT_INVALID`, `message: "Nội dung nhóm không hợp lệ"`, `errors` là **mảng `ExamIssueDto`**. Lỗi publish cũng dùng mảng này nhưng code ngoài cùng là `EXAM_PUBLICATION_INVALID`. Không xử lý hai dạng `errors` bằng cùng giả định object theo field.

`traceId` hỗ trợ đối chiếu log; không phải ID đề/phiên. Frontend phân nhánh theo HTTP status và `code`, không so khớp toàn bộ câu `message`.

### 12.2. HTTP status chung

| Status | Ý nghĩa/cách xử lý |
|---|---|
| 200 | Thành công có JSON; riêng publish-check vẫn 200 khi `isValid=false` |
| 201 | Đã tạo, response chứa bản ghi mới |
| 204 | Thành công không body; không gọi JSON parser vô điều kiện |
| 400 | Request/validation/nghiệp vụ không hợp lệ; sửa dữ liệu trước khi gửi lại |
| 401 | Xác thực không hợp lệ; đọc code để phân biệt login sai, OTP/password và access/refresh token |
| 403 | Đã xác thực nhưng thiếu quyền Admin |
| 404 | Route/ID không khớp, tài nguyên không có hoặc không được phép nhìn thấy |
| 409 | Xung đột tên/mã, trạng thái, lịch sử hoặc thay đổi đồng thời |
| 413 | Tệp/request quá lớn |
| 429 | Cooldown yêu cầu OTP |
| 500 | `INTERNAL_SERVER_ERROR`: lỗi chưa xử lý; lưu traceId để kiểm tra |
| 503 | `STORAGE_UNAVAILABLE`: kho media chưa sẵn sàng |

Response `403` của middleware hiện có thể không có JSON. `404` không khớp route, lỗi giới hạn request ở web server/proxy và các lỗi hạ tầng cũng không bảo đảm theo mẫu nghiệp vụ. Luôn kiểm tra content type/body trước khi đọc JSON. Không giả định có code `FORBIDDEN` trong response 403 hiện tại.

### 12.3. Mã nghiệp vụ đề thi

| HTTP | Code | Ý nghĩa/hướng xử lý |
|---|---|---|
| 404 | `EXAM_SET_NOT_FOUND`, `EXAM_NOT_FOUND` | Bộ/đề không có hoặc không hoạt động/không được hiển thị trong scope đang gọi |
| 404 | `GROUP_NOT_FOUND`, `QUESTION_NOT_FOUND` | Nhóm/câu không thuộc đúng đề/nhóm hoặc không còn truy cập được |
| 404 | `DIRECTION_NOT_FOUND`, `MEDIA_NOT_FOUND` | Hướng dẫn/media không còn hoạt động phù hợp |
| 409 | `EXAM_SET_NAME_EXISTS` | Tên bộ trùng bộ chưa xóa; đổi tên hoặc xử lý xung đột trước restore |
| 409 | `EXAM_CODE_EXISTS`, `EXAM_TITLE_EXISTS` | Mã/tên trùng một đề chưa xóa trong cùng bộ |
| 409 | `EXAM_SET_NOT_EMPTY` | Xóa/chuyển hết đề chưa xóa trước khi xóa bộ |
| 409 | `EXAM_SET_DELETED`, `EXAM_DELETED` | Khôi phục bộ/đề trước khi ghi |
| 409 | `EXAM_MUST_BE_DRAFT` | Unpublish trước khi đổi nội dung/mã/bộ; vẫn phải thỏa khóa lịch sử |
| 409 | `EXAM_CONTENT_LOCKED` | Đã có lịch sử, giữ nội dung cũ; tạo đề mới cho thay đổi lớn |
| 409 | `DEFAULT_DIRECTIONS_LOCKED` | Có đề với lịch sử dùng mặc định này; không sửa nội dung/media mặc định |
| 409 | `DEFAULT_DIRECTION_DELETE_NOT_ALLOWED` | Không được xóa mục mặc định; sửa tại chỗ khi chưa bị khóa |
| 409 | `EXAM_CONTENT_CONFLICT` | Trùng thứ tự nhóm, số câu, phương án hoặc khóa hướng dẫn; tải lại và kiểm tra trùng |
| 409 | `GROUP_PART_IMMUTABLE` | Không đổi Part của nhóm có sẵn |
| 409 | `DIRECTION_KEY_IMMUTABLE` | Không đổi khóa định danh hướng dẫn có sẵn |
| 409 | `CONCURRENT_CHANGE` | Tải lại dữ liệu, kiểm tra trạng thái mới rồi thử lại thao tác cần thiết |
| 400 | `CATEGORY_MUST_BE_ACTIVE_LEAF` | Chọn phân loại lá đang hoạt động, đúng Part từ E01 |
| 400 | `SPECIAL_TAG_INVALID` | Cờ không thuộc Part hoặc danh sách cờ không hợp lệ |
| 400 | `QUESTION_NOT_IN_GROUP` | Chỉ gửi ID câu đang thuộc nhóm sửa |
| 400 | `OPTION_REMOVAL_NOT_ALLOWED` | Giữ đủ các nhãn option đã lưu khi PUT câu |
| 400 | `DIRECTION_KEY_INVALID` | SECTION có Skill/không PartNo; PART có PartNo/không Skill |
| 400 | `MEDIA_INVALID` | Tệp rỗng hoặc metadata upload không hợp lệ |
| 400 | `MEDIA_TYPE_INVALID` | Đuôi/chữ ký tệp không đúng loại hỗ trợ |
| 400 | `AUDIO_NOT_ALLOWED` | Nhóm Part 5–7 không nhận audio |
| 413 | `MEDIA_TOO_LARGE` | Vượt giới hạn loại tệp theo cấu hình |
| 503 | `STORAGE_UNAVAILABLE` | Kiểm tra cấu hình/kết nối R2; không coi upload đã thành công |

Các mã auth và HTTP tương ứng được ghi theo từng endpoint A01–A10 vì cùng mã có thể có status khác nhau theo thao tác, ví dụ `USER_NOT_FOUND`.

### 12.4. Issue validation nhóm

Các code dưới đây nằm trong `errors[]` khi response ngoài cùng là `400 EXAM_CONTENT_INVALID`:

| Code | Điều kiện phát sinh |
|---|---|
| `GROUP_SIZE_INVALID` | Số câu vượt tối đa của Part khi lưu Nháp |
| `GROUP_ORDER_REQUIRED` | Nhóm không có câu và không nhập `groupOrder` |
| `QUESTION_NUMBER_DUPLICATE` | Lặp số câu trong request nhóm |
| `QUESTION_ID_DUPLICATE` | Lặp ID câu trong request |
| `QUESTION_ID_NOT_ALLOWED` | Tạo nhóm mới nhưng có gửi ID câu |
| `SPECIAL_TAG_INVALID` | Danh sách ID cờ lặp hoặc có ID không dương |
| `GROUP_LEVEL_NOT_ALLOWED` | Nhập độ khó nhóm ngoài Part 3/4/6/7 |
| `PASSAGE_NOT_ALLOWED` | Nhập đoạn văn ngoài Part 6/7 |
| `TRANSCRIPT_NOT_ALLOWED` | Nhập transcript ngoài Part 1–4 |
| `OPTION_LABEL_INVALID` | Nhãn option trùng/không phù hợp Part |
| `MULTIPLE_CORRECT_OPTIONS` | Có hơn một phương án đúng |
| `OPTION_EXPLANATIONS_INVALID` | Giải thích không đủ/thừa/sai thứ tự hoặc nhãn Đúng/Sai không khớp |

`SPECIAL_TAG_INVALID` còn có thể là code lỗi trực tiếp từ kiểm tra cờ trong database, khi đó không có mảng issues. Client nên đọc cả code ngoài cùng và mảng lỗi nếu có.

### 12.5. Issue kiểm tra xuất bản

Các code sau xuất hiện trong `issues[]` của E32 hoặc `errors[]` khi E33 trả `EXAM_PUBLICATION_INVALID`:

| Code | Điều kiện phát sinh |
|---|---|
| `PART_QUESTION_COUNT` | Số câu của một Part chưa đúng chuẩn |
| `GROUP_SIZE_INVALID` | Số câu nhóm không đúng cấu trúc khi xuất bản |
| `GROUP_ORDER_INVALID` | GroupOrder không bằng câu nhỏ nhất hoặc số câu trong nhóm không liên tiếp |
| `CATEGORY_NOT_LEAF` | Phân loại không còn là lá hoạt động/không đúng Part |
| `GROUP_TRANSLATION_REQUIRED` | Thiếu bản dịch nhóm |
| `TRANSCRIPT_REQUIRED` | Thiếu transcript Listening |
| `PASSAGE_REQUIRED` | Thiếu đoạn văn Part 6/7 |
| `GROUP_LEVEL_REQUIRED` | Thiếu độ khó nhóm Part 3/4/6/7 |
| `AUDIO_REQUIRED` | Thiếu audio nhóm Part 1–4 |
| `IMAGE_REQUIRED` | Thiếu hình Part 1 hoặc nhóm có cờ yêu cầu hình/bảng |
| `QUESTION_CONTENT_REQUIRED` | Thiếu độ khó câu/giải thích/giải thích phương án |
| `QUESTION_TEXT_REQUIRED` | Thiếu nội dung câu ở Part bắt buộc |
| `QUESTION_NUMBER_INVALID` | Số câu không thuộc phạm vi Part |
| `OPTIONS_INVALID` | Thiếu/sai số option, nội dung rỗng hoặc không đúng một đáp án đúng |
| `DIRECTIONS_INCOMPLETE` | Chưa đủ 9 mục hướng dẫn hiệu lực có nội dung tiếng Anh |
| `OPTION_EXPLANATIONS_INVALID` | Giải thích phương án lưu trong đề không đúng cấu trúc/đáp án |

`EXAM_NOT_FOUND` được controller chuyển thành lỗi HTTP 404 trực tiếp. `CONCURRENT_CHANGE` khi publish được chuyển thành HTTP 409. Không coi chúng là lỗi nội dung cần biên soạn lại.

<a id="integration"></a>

## 13. Luồng tích hợp và ví dụ gọi API

### 13.1. Luồng Người học

1. Đăng ký A01 nếu chưa có tài khoản, sau đó login A02; hoặc đăng nhập Google bằng A03.
2. Lưu cặp token/expiry và `UserDto` cần cho phiên; khi khôi phục phiên gọi A06 để kiểm tra lại user.
3. Gọi E02 lấy bộ có đề xuất bản; E04 với `examSetId` lấy đề trong bộ và metadata đề; dùng API outline/modes khi vào đề.
4. Khi token hết hạn, dùng một request refresh A04, cập nhật cả cặp token rồi tiếp tục request phù hợp. Nếu refresh thất bại, yêu cầu đăng nhập lại.
5. Logout A05 và xóa dữ liệu phiên local.

Luồng hiện tại dừng ở danh sách/metadata đề. Chưa có API tạo Attempt, nhận đề để làm bài, nộp đáp án, chấm điểm, lấy lịch sử hoặc phát media theo lượt làm.

### 13.2. Luồng Admin biên soạn đề

1. Đăng nhập bằng tài khoản Admin đã có. Đăng ký công khai không tạo Admin.
2. E01 lấy Part, Level, phân loại lá và cờ. E08 tạo bộ hoặc E06 chọn bộ có sẵn.
3. E14 tạo đề Nháp; ghi lại `examId`, `examCode` server trả.
4. E35 nhập cả gói nội dung và E36 lưu lại đề. Dùng E18 đọc lại nhóm/câu/clip để giữ ID khi cập nhật.
5. E28 upload audio/image cho nhóm; E24 xem hướng dẫn mặc định/hiệu lực, E25/E26 tạo/sửa bản riêng nếu cần; E29 upload media hướng dẫn.
6. E30 lấy URL ký để Admin xem trước. Khi URL hết hạn gọi lại, không lưu làm URL cố định của đề.
7. E32 kiểm tra; dùng `partNo/groupId/questionId` điều hướng tới lỗi. Sửa hết lỗi rồi E33 xuất bản.
8. Khi cần sửa nội dung đề xuất bản chưa có lịch sử: E34 chuyển Nháp rồi sửa. Đề có lịch sử chỉ sửa tên/mô tả; tạo đề mới cho thay đổi lớn.

Không tự động retry POST tạo bộ/đề/nhóm hoặc upload khi client không biết server đã commit hay chưa; có thể tạo thêm tài nguyên. Các API này chưa có `Idempotency-Key`. Tải lại danh sách/trạng thái để xác định kết quả trước khi gửi lại.

### 13.3. PowerShell — đăng nhập, tạo bộ và đề Nháp

Ví dụ dành cho máy Windows. Thay tài khoản/mật khẩu minh họa bằng tài khoản Admin trong môi trường thử; không lưu token/mật khẩu thật vào file theo dõi bởi Git.

```powershell
$baseUrl = 'https://localhost:7283'

$loginBody = @{
    email = 'admin@example.com'
    password = 'ExampleAdminPass123!'
} | ConvertTo-Json

$session = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/login" `
    -ContentType 'application/json' -Body $loginBody

if ($session.user.role -ne 'ADMIN') {
    throw 'Can tai khoan ADMIN de tao de.'
}
$headers = @{ Authorization = "Bearer $($session.accessToken)" }

$catalog = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/exam-catalogs" -Headers $headers

$setBody = @{ name = 'Bo de tu soan'; description = 'Du lieu minh hoa' } | ConvertTo-Json
$examSet = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/admin/exam-sets" `
    -Headers $headers -ContentType 'application/json' -Body $setBody

$examBody = @{
    examSetId = $examSet.examSetId
    title = 'Test 01'
    description = 'De nhap chua co noi dung'
    # Bo examCode de he thong tu sinh.
} | ConvertTo-Json
$exam = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/admin/exams" `
    -Headers $headers -ContentType 'application/json' -Body $examBody

$check = Invoke-RestMethod -Method Get `
    -Uri "$baseUrl/api/admin/exams/$($exam.examId)/publish-check" -Headers $headers
$check.issues | Format-Table code, partNo, groupId, questionId
```

Đề mới tạo chưa có câu nên `isValid` sẽ false. Dùng E36 để lưu cả gói nội dung; chọn `categoryId` từ `$catalog.categories` với `partNo` phù hợp và `isLeaf=true`. Cần có đủ nội dung và media trước khi xuất bản.

### 13.4. curl.exe — upload media và lấy URL ký

PowerShell; thay ID và đường dẫn tệp bằng giá trị thật. `$accessToken` chỉ chứa token, không chứa tiền tố Bearer:

```powershell
$baseUrl = 'https://localhost:7283'
$accessToken = '<admin-access-token>'

curl.exe --request POST `
    "$baseUrl/api/admin/exams/21/groups/402/media?sortOrder=1" `
    --header "Authorization: Bearer $accessToken" `
    --form 'file=@C:/toeic-media/part-3-q032-034.mp3'

curl.exe --request GET "$baseUrl/api/admin/media/501/url" `
    --header "Authorization: Bearer $accessToken"
```

Dùng `mediaId` từ response upload cho lệnh lấy URL; 501 chỉ là ID minh họa. Chứng chỉ HTTPS local cần được tin cậy theo cấu hình máy phát triển.

### 13.5. JavaScript — upload từ trình duyệt

Ví dụ dùng các biến `baseUrl`, `examId`, `groupId`, `accessToken` từ ứng dụng và `file` là một `File` do người dùng chọn:

```javascript
const form = new FormData();
form.append('file', file);

const query = new URLSearchParams({ sortOrder: '1', altText: 'Part 3, câu 32–34' });
const response = await fetch(
  `${baseUrl}/api/admin/exams/${examId}/groups/${groupId}/media?${query}`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  },
);
if (!response.ok) {
  throw new Error(`Upload thất bại: HTTP ${response.status}`);
}
const media = await response.json();
```

Không thêm `Content-Type: application/json` hoặc tự điền `multipart/form-data` cho request này; trình duyệt cần tạo boundary. Mẫu trên chỉ minh họa upload; khi xây UI, đọc thêm code/errors theo mục 12 để hiện lỗi cụ thể.

### 13.6. Lưu ý cho frontend

- Cho chọn phân loại từ E01 theo đúng Part và `isLeaf`. Không nhầm `categoryId`, `groupId`, `questionId`, `mediaId` hoặc mã đề dạng string.
- Nút sửa nội dung phụ thuộc trạng thái Nháp và khóa lịch sử; `ExamDto` hiện chưa có trường `hasAttempts/canEditContent`. Backend là nơi chốt quyền ghi; xử lý `EXAM_CONTENT_LOCKED` khi nhận 409.
- PUT nhóm là cập nhật aggregate: luôn giữ ID và toàn bộ câu/phương án cần giữ; không gửi lại nguyên response có các trường chỉ đọc.
- GET đề Người học không trả đáp án/nội dung. Không dùng endpoint Admin để thay API player cho Người học.
- Response upload chưa có URL. Lấy URL qua E30 và quản lý `expiresAt`; không coi storage key là URL.
- Khi gặp `EXAM_SET_NOT_EMPTY`, lấy thêm trang đề để xử lý, không mặc định response lỗi đã chứa toàn bộ đề của bộ.
- API CORS và CORS của R2 là hai cấu hình khác nhau. `Program.cs` hiện dùng danh sách `Cors:AllowedOrigins` nếu có; khi danh sách trống nhánh hiện tại cho phép mọi origin/header/method. Điều này không tự cấu hình CORS bucket hoặc xác nhận player hoạt động trên mọi trình duyệt.

<a id="verification"></a>

## 14. Phạm vi chưa có và kiểm chứng tài liệu

### 14.1. Các API chưa được triển khai

Không có endpoint cho các chức năng sau trong bản mô tả này:

- Parser Excel phía server hoặc export đề. Admin đọc/xem trước Excel tại client rồi xác nhận JSON qua E35/E36.
- Clone đề; restore nhóm/câu/media/hướng dẫn; POST/PUT câu/option riêng lẻ.
- CRUD từ điển/chủ đề độc lập, ngữ pháp hoặc quản trị catalog. Vocab/ngữ cảnh trong đề được lưu bằng E35/E36 và aggregate nhóm.
- Tạo/nộp/chấm bài, nhận nội dung bài cho Người học, lịch sử, tiến độ, bài BANK hoặc player.
- URL media theo quyền lượt làm của Người học; upload R2 trực tiếp từ client; API đổi tên/reorder media sau upload.
- Quản lý tài khoản Admin hoặc endpoint đăng ký role Admin.

Thiết kế database/use case có thể mô tả các chức năng này cho các giai đoạn sau; việc có bảng hoặc yêu cầu thiết kế không đồng nghĩa đã có API. Không dùng route tự suy đoán từ tên bảng.

### 14.2. Nguồn đối chiếu và bằng chứng

- [Controllers](../Controllers), [DTOs](../DTOs), [Services](../Services) và [Repositories](../Repositories): nguồn cho route, kiểu dữ liệu, validation, quyền, status và nghiệp vụ thực tế.
- [Nguồn SQL chuẩn](TOEIC_Database_Scripts.md): `../DATABASE/01_schema.sql`, `02_views_procs_triggers.sql`, `03_seed.sql`, gồm quy tắc kiểm tra xuất bản và ràng buộc dữ liệu.
- [Use Case v1.3](TOEIC_UseCase_Spec_v1.3.md): UC-01–03, UC-19/20/22/29, BR-08/20/25/33; [Database v1.3](TOEIC_DatabaseDesign_v1.3.md); quyết định người dùng về khóa nội dung sau lượt làm và R2 riêng tư.
- Tài liệu triển khai bổ trợ: [auth](TOEIC_Auth_Implementation.md), [bộ đề/metadata](TOEIC_Exam_API_Implementation.md), [nội dung/media/publish](TOEIC_Exam_Content_API.md). Các kết quả kiểm thử theo ngày trong tài liệu cũ là lịch sử; dùng hợp đồng hiện tại ở đây khi tích hợp.
- Đối chiếu OpenAPI trực tiếp của backend ngày 30/10/2026: **44 operation, 33 path**, security Bearer và multipart upload. Artifact kiểm tra local: `artifacts/api-documentation/openapi.json` (không phải nguồn SQL hoặc endpoint mới).
- Kiểm tra tài liệu: đủ 44/44 endpoint theo OpenAPI; 30 ví dụ JSON parse thành công, 27 liên kết hợp lệ; 2 block PowerShell và 1 block JavaScript qua kiểm tra cú pháp. Đã rà mã code từ nguồn với nội dung tài liệu.
- Smoke chỉ đọc/validation trong đợt viết tài liệu: GET `/api/auth/me`, GET `/api/exam-catalogs` không token trả `401 UNAUTHORIZED`; đăng ký với dữ liệu không hợp lệ trả `400 VALIDATION_ERROR` trước khi tạo tài khoản. Tiến trình backend kiểm tra tạm đã dừng.

Đợt viết tài liệu không thay mã API, schema, secret hoặc dữ liệu ứng dụng và không nhập/xuất bản đề thật. Bộ SQL đã sửa ở đợt trước chưa được áp dụng vào ToeicDb; cần làm theo hướng dẫn database khi triển khai. Khi sửa API tiếp theo, cập nhật tài liệu này cùng controller/DTO và OpenAPI; không chỉ cập nhật ví dụ trong Swagger.
