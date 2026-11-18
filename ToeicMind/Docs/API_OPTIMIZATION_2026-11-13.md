# Tối ưu API, gộp endpoint và phân quyền công khai — 13/11/2026

Phạm vi: `G:\ToeicMind\ToeicMind`, đồng bộ hai client `../LEARNER/js` và `../ToeicMindAdmin - Copy/src`. Task: P03-01–04, P05-02, CHG-002. Báo cáo này nối tiếp [API_CLEANUP_2026-11-13.md](API_CLEANUP_2026-11-13.md) và thay thế hợp đồng cũ của các endpoint nêu dưới đây. OpenAPI: **98 → 88 operation**.

## 1. Quyết định phân quyền: xem danh sách công khai, làm bài cần đăng nhập

Nguyên tắc: endpoint chỉ trả **danh mục/danh sách/cấu trúc** (không có chữ câu hỏi, script, đáp án, audio ký) thì công khai; endpoint trả **nội dung để làm** hoặc **ghi tiến độ** thì cần đăng nhập. Khách chưa có tiến độ (mọi bộ/thẻ ở trạng thái `NEW`, số đã luyện = 0); người đã đăng nhập gửi token trên cùng endpoint thì nhận tiến độ của mình.

| Nhóm | Công khai (không cần token) | Cần đăng nhập |
| --- | --- | --- |
| Đề thi | `GET /api/exam-sets`, `GET /api/exams`, `GET /api/exam-catalogs`, `GET /api/exams/{id}/modes` | `GET /api/exams/{id}/directions`, `/parts/{n}`, `/parts/{n}/media`; toàn bộ `/api/attempts/*` |
| Ngân hàng, ngữ pháp | `GET /api/bank/parts/{n}/cards`, `GET /api/grammar/topics` | `POST /api/bank/attempts`, `DELETE …/cards/{key}/progress` |
| Nghe chép | `GET /api/dictation/sets`, `/sets/{id}/exams`, `/topics`, `/items` | `GET /api/dictation/items/{id}` (script, audio), `POST …/progress` |
| Từ vựng hệ thống | `GET /api/vocab/overview`, `/sets/{id}/exams`, `/lessons` | `GET /api/vocab/words`, `/study`; `POST /{id}/review`; `DELETE /{id}/progress` |
| Khác | Các API đăng ký/đăng nhập/quên mật khẩu như cũ | `/api/me/*`, `/api/reports`, `/api/Auth/me`, đổi/đặt mật khẩu, toàn bộ `/api/admin/*` |

Lưu ý:

- `modes` công khai vì chỉ có tên Part, số câu, thời gian đề xuất và dàn ý nhóm (cờ có audio/hình); không có chữ câu hỏi hay link media.
- `GET /api/vocab/words` **yêu cầu đăng nhập** (quyết định đã được người dùng xác nhận 13/11/2026) vì trả nghĩa/định nghĩa của từ (nội dung học). Nếu sau này đổi ý: thêm `[AllowAnonymous]` trên action và đổi `GetWordsAsync` nhận `int? userId` như `GetLessonsAsync`.
- Token **hết hạn hoặc bị khóa** gửi tới endpoint công khai không bị từ chối: máy chủ coi như khách (200, tiến độ rỗng). Client nên làm mới token trước khi gọi (kiểm tra `exp`), nếu không người dùng sẽ thấy tiến độ trống cho tới khi gọi một API cần đăng nhập.
- Chưa có giới hạn tần suất (rate limit) cho các endpoint công khai. Danh mục (`exam-catalogs`) đã được cache 10 phút trong bộ nhớ; các danh sách khác truy vấn trực tiếp.

## 2. Endpoint được gộp

| STT | Endpoint cũ | Endpoint mới | Ghi chú |
| --- | --- | --- | --- |
| 1 | `GET /api/me/progress`, `/me/study-days`, `/me/score-history` | `GET /api/me/dashboard?days=30&scoreLimit=20` | Phản hồi thêm `scoreHistory`; `studyDays` = `days` ngày gần nhất (1–365, mặc định 30); `parts` (tiến độ 7 Part) đã có sẵn. Màn trang chủ Learner từ 3 lệnh gọi còn 1 |
| 2 | `GET /api/exams/{id}/outline` | `GET /api/exams/{id}/modes` | Mỗi phần tử `parts[]` có thêm `groups[]` (dàn ý nhóm: `groupId`, `groupOrder`, `firstQuestionNo`, `questionCount`, `hasAudio`, `hasImage`). Một cache và một ETag |
| 3 | `GET /api/attempts/{id}/review` | `GET /api/attempts/{id}/result?includeReview=true` | Phản hồi thêm `groups[]` (xem lại từng câu). Luyện thi vẫn bị chặn `403 REVIEW_NOT_ALLOWED` khi `includeReview=true` (trừ khi bật `Learning:AllowExamReview`) |
| 4 | `GET /api/me/reports` | `GET /api/reports` | Cùng một tài nguyên với `POST /api/reports`; cùng bộ lọc/phân trang |
| 5 | `GET /api/admin/dashboard/summary`, `/activity`, `/exams`, `/hardest-questions` | `GET /api/admin/dashboard?days=30&limit=5&minAnswers=5` | Trả `{ summary, activity, popularExams, hardestQuestions }`. `limit` dùng cho cả hai danh sách xếp hạng |
| 6 | `POST /api/admin/users/{id}/lock`, `/unlock` | `PUT /api/admin/users/{id}/status` | Body `{ "status": "LOCKED" \| "ACTIVE" }`, cùng quy tắc không tự khóa mình / còn ít nhất một ADMIN |
| 7 | `POST /api/admin/exams/{id}/publish`, `/unpublish` | `PUT /api/admin/exams/{id}/status` | Body `{ "status": "PUBLISHED" \| "DRAFT" }`; phản hồi vẫn `{ examId, status }`; lỗi chưa đủ điều kiện vẫn `400 EXAM_PUBLICATION_INVALID`. `GET …/publish-check` giữ nguyên |

Không gộp (có lý do): `set-password` và `change-password` (Admin UI có luồng/mã lỗi `PASSWORD_ALREADY_SET` riêng; `change-password` đã chấp nhận thiếu `OldPassword` cho tài khoản Google chưa có mật khẩu, có thể gộp sau khi sửa UI); `exam-sets` và `exams` (hai tài nguyên khác nhau); các API Nghe chép/Từ vựng có cặp “tổng quan” và “đề của bộ” (dữ liệu khác nhau).

## 3. Làm gọn mã

- `ApiControllerBase`: bật `[ApiController]`, cung cấp `UserId`, `UserIdOrNull`, `Respond(...)` (tuple `(dữ liệu, lỗi)` → 200/201 hoặc lỗi; chỉ mã lỗi → 204) và `Fail(code)`. Phần lớn action còn một biểu thức.
- `ApiErrors`: một bảng mã lỗi → (status, thông báo) thay cho `ExamApiErrors`, `LearningApiErrors` và hàm `Error()` riêng của `AdminUsersController`. Giữ nguyên mọi mã, status và thông báo cũ. Auth giữ thông báo theo luồng nhưng dùng chung dạng JSON `{ code, message, traceId }`.
- `VocabSchemaFilterAttribute` thay cho hàm bọc `RunAsync` ở mọi action từ vựng (thiếu bảng/cột CHG-005 vẫn trả `503 VOCAB_SCHEMA_MISSING`).
- Gộp controller: `ExamSetsController` + `ExamCatalogsController` → `ExamsController`; `AdminExamGroups/Import/Publication` → `AdminExamsController`. Route HTTP không đổi (trừ mục 2).
- Dùng chung: `StudyClock` (múi giờ ngày học, thay 5 bản sao), `CategoryTree` (duyệt cây phân loại, thay 2 bản sao), `LearnerTotals.AccuracyPercent`, `AuthService.CheckNewPassword/SaveNewPasswordAsync`.
- Cache danh mục: một nơi (`ExamContentRepository.GetCatalogAsync`, 10 phút) thay cho 3 cache riêng; `exam-catalogs` công khai nhờ đó không chạm SQL mỗi lần gọi.
- Truy vấn: dashboard admin đếm bằng truy vấn tổng hợp (`COUNT` có điều kiện) và `AVG` trong SQL thay vì ~20 `COUNT` riêng và kéo toàn bộ điểm về bộ nhớ; ngày học của dashboard người học và thống kê admin dùng một truy vấn; kiểm tra token chỉ đọc hai cột `Status`, `Role`.
- Xóa: 6 DTO (`StudyDaysRequestDto`, `DashboardRangeRequestDto`, `TopListRequestDto`, `AttemptReviewDto`, `ExamOutlineDto`, `PartOutlineDto`), `IStatsRepository.GetLastStudyDateAsync`, các phương thức service tương ứng.
- Không đổi schema, không chạy SQL, không đổi `AppDbContext`.

## 4. Đồng bộ client

| Client | File | Thay đổi |
| --- | --- | --- |
| Learner | `js/pages/home.js` | Một lệnh gọi `/api/me/dashboard?days=84&scoreLimit=20`, lấy `studyDays`, `scoreHistory` từ đó |
| Learner | `js/pages/result.js` | Trang xem lại gọi `result?includeReview=true`, đọc `groups` |
| Learner | `js/pages/player.js` | Lấy tiêu đề đề từ `modes` thay cho `outline` |
| Learner | `js/pages/me.js`, `js/me.js` | `/api/reports` thay cho `/api/me/reports` (`js/me.js` không được `index.html` nạp, sửa cho khỏi lệch) |
| Learner | `HUONG_DAN.md` | Cập nhật bảng API |
| Admin | `adminApi.js` | `getAdminDashboard` thay 4 hàm thống kê; `lockAdminUser`/`unlockAdminUser` gọi `PUT …/status` |
| Admin | `examService.js` | `publishExam`/`unpublishExam` gọi `PUT …/status` (tên hàm giữ nguyên, UI không đổi) |
| Admin | `DashboardView.jsx`, `scripts/check-admin-navigation.mjs` | Dùng phản hồi gộp; mock API cập nhật |
| Backend | `ToeicMind.*.http` | Theo route mới; đánh dấu endpoint công khai; bỏ ví dụ reset mật khẩu admin đã gỡ |

Trình duyệt Learner chưa tận dụng phần công khai: `core.js` vẫn chuyển mọi route (trừ đăng nhập/đăng ký) về `#/login` khi chưa có phiên. Cần đánh dấu `public: true` cho trang Đề thi/Nghe/Đọc/Từ vựng (danh sách) và dẫn tới đăng nhập khi người dùng bấm “Bắt đầu”. Chưa làm vì ngoài phạm vi backend được giao.

## 5. Kiểm chứng đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `dotnet build ToeicMind.csproj -p:UseAppHost=false -o <thư mục tạm>` | Đạt, 0 warning / 0 error (trước và sau khi sửa) |
| OpenAPI của binary mới (cổng 5099, tiến trình riêng) | 88 operation (98 − 14 + 4); đúng 13 GET công khai theo bảng mục 1 (+ 7 API xác thực công khai như cũ); 14 operation cũ biến mất; 4 operation mới có mặt (`GET /api/admin/dashboard`, `GET /api/reports`, `PUT …/users/{id}/status`, `PUT …/exams/{id}/status`) |
| HTTP trực tiếp, không token, trên CSDL test cục bộ | 17 lệnh GET công khai trả 200 (khách: `practiced=0`, trạng thái `NEW`, `mine=true` rỗng); 15 endpoint làm bài/nội dung/admin trả 401 |
| Chạy trực tiếp service trên CSDL test (chỉ đọc, bản sao mã nguồn ở thư mục tạm) | 30/30 kiểm tra đạt (1 mục bỏ qua vì thiếu dữ liệu, xem mục 6): số liệu dashboard admin từ truy vấn tổng hợp **trùng** cách đếm cũ (người dùng, đề, lượt làm, điểm TB, độ chính xác TB, báo lỗi mới); dashboard người học gộp (`studyDays` 30/90 ngày, `scoreHistory`, `recentAttempts`, chuỗi ngày); thống kê admin khớp dashboard; `result` không kèm/kèm review (103 nhóm, 200 câu, có giải thích, đáp án chọn khớp `questions`); người khác truy cập lượt → `ATTEMPT_NOT_FOUND`; Luyện thi + `includeReview` → `REVIEW_NOT_ALLOWED` |
| Frontend Admin `npm run build`, `npm test` | Đạt; 59/59 |
| `node scripts/check-admin-navigation.mjs` | Đạt (gồm dashboard lỗi/thử lại với API gộp) |
| `node --check` các file Learner đã sửa | Đạt |

## 6. Chưa kiểm chứng / hạn chế

- Chưa có tài khoản đăng nhập trong phiên kiểm thử nên **chưa gọi qua HTTP** các endpoint có token (`/api/me/dashboard`, `result?includeReview`, `/api/reports` GET, `PUT …/status` của người dùng và đề). Logic service của dashboard và kết quả/xem lại đã chạy trên dữ liệu thật như bảng trên; **hai API đổi trạng thái (khóa/mở khóa người dùng, xuất bản/gỡ xuất bản đề) chưa chạy** vì sẽ ghi vào CSDL — chỉ đã build và rà soát mã, logic service/repository không đổi so với bản cũ.
- CSDL test chỉ có 2 người dùng, 7 lượt làm và không có lượt Luyện tập đã nộp; nhánh xem lại của Luyện tập được kiểm qua lượt Luyện thi với cờ `Learning:AllowExamReview` bật trong tiến trình thử.
- Giao diện Learner chưa chạy trong trình duyệt sau khi sửa; chỉ kiểm cú pháp.
- Không có project kiểm thử tự động backend (đã gỡ trước đó), không thêm lại.

## 7. Áp dụng

Cần khởi động lại backend từ mã nguồn mới (bản đang chạy chưa có thay đổi) và triển khai bản Admin/Learner đã sửa đồng thời: client cũ gọi route đã gỡ sẽ nhận 404/405. Tiến trình kiểm thử cổng 5099 đã dừng.
