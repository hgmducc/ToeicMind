# ToeicMind — API Người học và Thống kê Admin

> Cập nhật 18/11/2026 (CHG-009): bài ngữ pháp, mỗi chủ điểm một bài (`/api/grammar/topics/{id}/article`; Admin `/api/admin/grammar-articles`), báo lỗi 4 loại đối tượng (`GRAMMAR_ARTICLE`, `LISTENING_ITEM`), Nghe chép thêm bộ clip sưu tầm (`source=STANDALONE`; Admin `/api/admin/listening-items`) và tác vụ nền tự nộp bài hết giờ. Xem [CONTENT_FEATURES_2026-11-18.md](CONTENT_FEATURES_2026-11-18.md).

> Cập nhật 17/11/2026 (CHG-007): kiểm tra đầu vào (`/api/placement`, Admin `/api/admin/placement-tests`), mục tiêu (`/api/me/profile`) và lộ trình gợi ý bài học (`/api/me/learning-plan`); `Attempt.Scope` thêm `PLACEMENT`. Xem [PERSONALIZATION_2026-11-17.md](PERSONALIZATION_2026-11-17.md).

> Cập nhật 13/11/2026: tài liệu này mô tả đợt CHG-003/004/005. Đợt [tối ưu API 13/11/2026](API_OPTIMIZATION_2026-11-13.md) đã gộp `me/progress`, `me/study-days`, `me/score-history` vào `me/dashboard`; `exams/{id}/outline` vào `modes`; `attempts/{id}/review` vào `result?includeReview=true`; `me/reports` thành `GET /api/reports`; 4 API thống kê Admin thành `GET /api/admin/dashboard`; và cho phép khách xem các danh sách. Khi mâu thuẫn, báo cáo tối ưu API được ưu tiên.

| Thuộc tính | Giá trị |
|---|---|
| Ngày | 03/11/2026 (CHG-003), cập nhật 05/11/2026 (CHG-004: chế độ làm bài, Nghe chép, Đọc), 06/11/2026 (CHG-005: học từ vựng SM-2, luyện thi liền mạch) |
| Phạm vi | **48 API mới**: 40 API Người học (vào đề, các chế độ làm bài, làm bài, lịch sử, tiến độ, ngân hàng câu hỏi, ngữ pháp, Nghe chép, học từ vựng, từ vựng cá nhân, báo lỗi) và 8 API Admin (thống kê, báo lỗi) |
| Nguồn hợp đồng | Controller/DTO trong `Controllers/`, `DTOs/Learning/`, `DTOs/Dashboard/`; bảng học tập theo `TOEIC_DatabaseDesign_v1.3.md` |
| Trạng thái kiểm chứng | Biên dịch sạch (0 lỗi, 0 cảnh báo); kiểm thử luồng FE trên máy chủ giả. **Chưa chạy trên SQL Server thật** — xem mục 6 |

Quy ước chung (xác thực Bearer, lỗi `{ code, message, traceId }`, trang `{ items, totalCount, page, pageSize }`) giữ nguyên như [TOEIC_API_Documentation.md](TOEIC_API_Documentation.md). Thời gian trả về là UTC (ISO 8601).

## 1. Danh sách endpoint

### 1.1. Vào đề (nhanh, tách nhỏ) — Đăng nhập

| Mã | Method | Route | Mục đích |
|---|---|---|---|
| L01 | GET | `/api/exams/{id}/outline` | Dàn ý đề: Part, nhóm, số câu, có audio/hình. Không có chữ nên rất nhẹ. Có ETag |
| L02 | GET | `/api/exams/{id}/directions` | Hướng dẫn hiệu lực (phần thi, từng Part) kèm audio hướng dẫn đã ký |
| L03 | GET | `/api/exams/{id}/parts/{partNo}?media=true\|false` | Nội dung một Part để làm bài. `media=false`: chỉ chữ (nhanh nhất, có ETag/304) |
| L04 | GET | `/api/exams/{id}/parts/{partNo}/media` | Chỉ link audio/hình đã ký của một Part, nhóm theo nhóm câu hỏi; dùng tải media sau chữ hoặc làm mới link hết hạn |

### 1.2. Làm bài — Đăng nhập, chỉ lượt của chính mình

| Mã | Method | Route | Mục đích |
|---|---|---|---|
| L27 | GET | `/api/exams/{id}/modes` | Các chế độ làm bài của đề: Luyện thi (full / nghe / đọc / từng Part / nhiều Part, có giờ gợi ý và khoảng giờ cho phép) và Luyện tập (full / từng Part), kèm số câu mỗi Part |
| L05 | POST | `/api/attempts` | Bắt đầu làm bài trong một đề (Mode, Scope, PartNos, TimeLimitSeconds) |
| L06 | GET | `/api/attempts` | Lịch sử làm bài (lọc `mode`, `scope`, `status`; `page`, `pageSize`) |
| L07 | GET | `/api/attempts/{id}` | Trạng thái lượt: câu đã chọn, thời gian còn lại; dùng để làm tiếp khi tải lại trang |
| L08 | PUT | `/api/attempts/{id}/answers/{questionId}` | Lưu đáp án một câu `{ optionId, reveal? }`. Luyện tập với `reveal` mặc định `true` trả kèm đáp án đúng và giải thích; `reveal = false` chỉ lưu lựa chọn |
| L09 | POST | `/api/attempts/{id}/direction-time` | Cộng số giây xem hướng dẫn (không tính vào đồng hồ thi) |
| L10 | POST | `/api/attempts/{id}/submit` | Nộp bài, nhận kết quả (nộp lại trả kết quả cũ) |
| L11 | POST | `/api/attempts/{id}/abandon` | Bỏ dở |
| L12 | GET | `/api/attempts/{id}/result` | Kết quả: số đúng, điểm quy đổi, thống kê theo Part |
| L13 | GET | `/api/attempts/{id}/review` | Xem lại từng câu kèm giải thích, transcript, từ vựng (không dành cho Luyện thi) |
| L14 | DELETE | `/api/attempts/{id}` | Xóa mềm khỏi lịch sử (không xóa lượt đang làm) |

### 1.3. Ngân hàng câu hỏi, tiến độ, từ vựng, báo lỗi — Đăng nhập

| Mã | Method | Route | Mục đích |
|---|---|---|---|
| L15 | GET | `/api/bank/parts/{partNo}/cards?categoryId&levelNo` | Thẻ Level, thẻ chủ điểm (gồm loại con) và thẻ "Tất cả" kèm tiến độ; có tùy chọn lọc chủ điểm cho thẻ Level và Level cho thẻ chủ điểm |
| L16 | POST | `/api/bank/attempts` | Bắt đầu lượt học từ một thẻ `{ partNo, cardKey, pick, categoryId?, levelNo? }` |
| L17 | DELETE | `/api/bank/parts/{partNo}/cards/{cardKey}/progress` | Xóa tiến độ của thẻ để học lại |
| L18 | GET | `/api/me/dashboard` | Tổng quan học tập |
| L19 | GET | `/api/me/progress` | Tiến độ 7 Part |
| L20 | GET | `/api/me/study-days?from&to` | Các ngày đã học (lịch học) |
| L21 | GET | `/api/me/score-history?limit` | Đường điểm các bài Luyện thi có điểm |
| L22 | GET | `/api/me/vocabulary?search` | Bộ từ cá nhân |
| L23 | POST | `/api/me/vocabulary` | Lưu từ (`vocabId` hoặc `customWord` + `customMeaning`) |
| L24 | DELETE | `/api/me/vocabulary/{id}` | Xóa từ khỏi bộ |
| L25 | GET | `/api/me/reports` | Báo lỗi tôi đã gửi |
| L26 | POST | `/api/reports` | Báo lỗi nội dung: câu hỏi, từ vựng, bài ngữ pháp, bộ clip Nghe chép (CHG-009) |

### 1.4. Nghe chép (clip cắt) và Ngữ pháp — Đăng nhập

| Mã | Method | Route | Mục đích |
|---|---|---|---|
| L28 | GET | `/api/dictation/sets` | Các bộ đề gốc có clip nghe chép (Test 1, Test 2, …) kèm số bộ clip và tiến độ |
| L29 | GET | `/api/dictation/sets/{examSetId}/exams` | Các đề trong một bộ; mỗi đề có thẻ Part 1–4 kèm số clip |
| L30 | GET | `/api/dictation/topics?partNo` | Mục "Theo chủ đề": loại bài, Level, dạng đặc biệt kèm số bộ clip |
| L31 | GET | `/api/dictation/items` | Danh sách bộ clip, lọc `examSetId`, `examId`, `partNo` (1–4), `categoryId` (gồm loại con), `levelNo`, `specialTagId`, `status` (`NEW`, `PRACTICED`, `NEEDS_PRACTICE`, `DONE`), `page`, `pageSize` |
| L32 | GET | `/api/dictation/items/{itemId}` | Chi tiết một bộ clip: từng clip (văn bản, thời điểm, link audio đã ký) và tiến độ |
| L33 | POST | `/api/dictation/items/{itemId}/progress` | Ghi một lượt nghe chép `{ mode, accuracyPercent }` |
| L34 | GET | `/api/grammar/topics?parentCategoryId` | Tab Ngữ pháp (Part 5): chủ điểm nhóm theo loại cha, kèm số câu và tiến độ |

### 1.4b. Học từ vựng (lặp lại ngắt quãng) — Đăng nhập

| Mã | Method | Route | Mục đích |
|---|---|---|---|
| L35 | GET | `/api/vocab/overview` | Tổng quan: số từ mới / đang học / đã thuộc, số từ đến hạn ôn, tiến độ hôm nay, các bộ đề có từ vựng |
| L36 | GET | `/api/vocab/sets/{examSetId}/exams` | Các đề của bộ đề kèm số từ, tiến độ và các Part có từ vựng |
| L37 | GET | `/api/vocab/words` | Danh sách từ, lọc `examSetId`, `examId`, `partNo`, `cefrLevel`, `status` (`NEW`, `LEARNING`, `MASTERED`, `DUE`), `search`, `mine`, `page`, `pageSize` |
| L38 | GET | `/api/vocab/study` | Tạo phiên học; tham số `examSetId`, `examId`, `partNo`, `mine`, `cefrLevel`, `mode` (`MIXED` đến hạn rồi mới, `REVIEW`, `NEW`, `PRACTICE` luyện tự do: ngẫu nhiên mọi từ trong phạm vi), `limit` (≤100, mặc định 20), `newLimit`; hoặc `ids` (VocabId cách nhau dấu phẩy, ≤100) để học một bài. Trả thẻ kèm ngữ cảnh ví dụ, `previewMinutes` và `pool` (≤40 từ làm đáp án gây nhiễu cho trắc nghiệm/trò chơi) |
| L39 | POST | `/api/vocab/{vocabId}/review` | Ghi một lượt ôn `{ grade }` (0 Quên, 1 Khó, 2 Nhớ, 3 Dễ); máy chủ tính lịch ôn kế tiếp và lưu tiến độ |
| L40 | DELETE | `/api/vocab/{vocabId}/progress` | Xóa tiến độ của một từ để học lại |
| L41 | GET | `/api/vocab/lessons` | Chia từ trong phạm vi (`examSetId`, `examId`, `partNo`, `mine`, `cefrLevel`) thành các bài nhỏ `size` từ (5–30, mặc định 10) theo thứ tự nhập đề; mỗi bài có `wordIds`, tiến độ (`learnedCount`, `masteredCount`, `dueCount`) và vài từ xem trước |

### 1.5. Admin — ADMIN

| Mã | Method | Route | Mục đích |
|---|---|---|---|
| S01 | GET | `/api/admin/dashboard/summary` | Tổng quan: người dùng, kho đề, lượt làm, học viên hoạt động 7 ngày, điểm/độ chính xác trung bình, báo lỗi mới |
| S02 | GET | `/api/admin/dashboard/activity?days=30` | Hoạt động từng ngày (người dùng mới, lượt làm, học viên hoạt động), đủ mọi ngày trong khoảng |
| S03 | GET | `/api/admin/dashboard/exams?limit=10` | Đề được làm nhiều nhất, kết quả trung bình |
| S04 | GET | `/api/admin/dashboard/hardest-questions?limit&minAnswers` | Câu có tỷ lệ sai cao nhất |
| S05 | GET | `/api/admin/users/{id}/stats` | Thống kê học tập một học viên |
| S06 | GET | `/api/admin/users/{id}/attempts` | Lịch sử làm bài một học viên |
| S07 | GET | `/api/admin/reports?status` | Danh sách báo lỗi (kèm email người báo) |
| S08 | PUT | `/api/admin/reports/{id}` | Xử lý báo lỗi `{ status, adminNote }` |

## 2. Luồng vào đề khuyến nghị

1. `GET /api/exams/{id}/outline` — hiện ngay thanh điều hướng Part/câu, tổng số câu.
2. `POST /api/attempts` — tạo lượt (cùng lúc gọi bước 3).
3. `GET /api/exams/{id}/parts/{n}?media=false` cho Part đầu — **chữ + đáp án vào đề ngay**; các Part còn lại tải nền theo thứ tự.
4. `GET /api/exams/{id}/parts/{n}/media` — lấy link audio/hình sau khi chữ đã hiện. Link hết hạn sau `R2:SignedUrlMinutes` (mặc định 10 phút): gọi lại endpoint này khi cần.
5. `GET /api/exams/{id}/directions` khi người học mở hướng dẫn; báo `direction-time` khi đóng.
6. Mỗi lần chọn đáp án: `PUT /api/attempts/{id}/answers/{questionId}`. Hết bài: `POST .../submit`.

Phản hồi của L01–L03 có header `ETag` và `Cache-Control: private, no-cache`. Gửi lại `If-None-Match` để nhận `304` (không tải lại nội dung). Mọi phản hồi có đo đều kèm `Server-Timing` (xem [TOEIC_Performance_Exam_Loading.md](TOEIC_Performance_Exam_Loading.md)).

Nội dung vào đề **không có** đáp án đúng, giải thích, transcript, bản dịch. Những thứ đó chỉ có ở phản hồi lưu đáp án của Luyện tập/ngân hàng (L08) và ở xem lại (L13).

## 3. Làm bài

### Chế độ làm bài của một đề (L27)

`GET /api/exams/{id}/modes` trả `examId, examCode, title, examSetId, totalQuestions, minTimeLimitSeconds, maxTimeLimitSeconds, parts[]` (`partNo, questionCount, suggestedSeconds`), `examOptions[]` và `practiceOptions[]` (mỗi phần tử: `scope`, `partNos`, `label`, `totalQuestions`, `suggestedSeconds`). Người học chọn:

- **Luyện thi (`EXAM`)**: full 7 Part, riêng phần Nghe, riêng phần Đọc, từng Part, hoặc nhiều Part tự chọn (`scope = PART` + `partNos`). Có đồng hồ (mặc định hoặc `timeLimitSeconds` tự đặt). Chỉ hiện kết quả sau khi nộp.
- **Luyện tập (`PRACTICE`)**: full đề hoặc Part bất kỳ (một hoặc nhiều). Không đồng hồ; chọn xong có đúng/sai và giải thích ngay (L08).
- Đề được nhóm theo **bộ đề gốc**: `GET /api/exam-sets` (bộ đề đã xuất bản) rồi `GET /api/exams?examSetId=`.
- **Làm bài với đề không dùng clip cắt.** Nội dung vào đề (L03/L04), xem lại (L13) và lượt ngân hàng chỉ có audio của nhóm câu hỏi gốc; audio clip cắt chỉ dùng cho Nghe chép (L28–L33).

### L05 — POST /api/attempts

```json
{ "examId": 1, "mode": "EXAM", "scope": "FULL" }
{ "examId": 1, "mode": "EXAM", "scope": "PART", "partNos": [5, 6], "timeLimitSeconds": 1800 }
{ "examId": 1, "mode": "PRACTICE", "scope": "READING" }
```

| Trường | Quy tắc |
|---|---|
| `mode` | `EXAM` (Luyện thi: đồng hồ, không báo đúng/sai khi làm, chấm khi nộp/hết giờ) hoặc `PRACTICE` (Luyện tập: không đồng hồ, chấm và giải thích ngay, mỗi câu chọn một lần) |
| `scope` | `FULL` (Part 1–7), `LISTENING` (1–4), `READING` (5–7), `PART` (theo `partNos`) |
| `partNos` | Bắt buộc và chỉ dùng khi `scope = PART` |
| `timeLimitSeconds` | Chỉ khi `EXAM`, dùng được với mọi `scope` (60–14400 giây). Bỏ trống: FULL = 7200, LISTENING = 2700, READING = 4500; `PART` (một hoặc nhiều Part) máy chủ gợi ý theo số câu × thời gian mỗi câu của Part (`DefaultSecondsPerQuestion`, mặc định nghe 27 giây, đọc 45 giây). `PRACTICE` không có đồng hồ |

Trả `201 AttemptDto`: `attemptId`, `timeLimitSeconds`, `remainingSeconds`, `totalQuestions`, `questions[]` (chỉ `questionId, partNo, questionNo, groupId, selectedOptionId, isCorrect`). Nội dung câu hỏi lấy qua L03. `isCorrect` chỉ có ở Luyện tập.

### Đồng hồ thi (Luyện thi)

Hạn chót = `startedAt + timeLimitSeconds + directionSeconds` theo đồng hồ **máy chủ**; `remainingSeconds` luôn tính từ máy chủ nên FE chỉ dùng để hiển thị. Đáp án đến muộn tối đa 5 giây sau hạn vẫn được nhận. Quá hạn, lượt được **tự nộp ở lần truy cập kế tiếp** (không có tác vụ nền): `submittedAt` ghi đúng hạn chót, `isAutoSubmitted = true`; lưu đáp án trả `409 ATTEMPT_EXPIRED`.

### L08 — PUT /api/attempts/{id}/answers/{questionId}

Body `{ "optionId": 123, "reveal": true }` (`reveal` tùy chọn, mặc định `true`, chỉ có tác dụng ở Luyện tập/ngân hàng; thêm 17/11/2026).

- Luyện thi: lưu lựa chọn, `optionId = null` bỏ chọn, trả `{ questionId, selectedOptionId }`.
- Luyện tập/ngân hàng, `reveal = false` ("Hiện đáp án ngay" tắt ở FE): chỉ lưu lựa chọn, chưa chấm (`IsCorrect` để null), đổi hoặc bỏ chọn được; trả như Luyện thi. Câu chưa hiện đáp án được chấm và ghi tiến độ khi gửi lại với `reveal = true` hoặc khi nộp bài.
- Luyện tập/ngân hàng, `reveal = true`: chấm ngay, ghi tiến độ, khóa câu (lần sau trả `409 ANSWER_LOCKED`) và trả thêm:

```json
{ "questionId": 5, "selectedOptionId": 20,
  "feedback": { "isCorrect": false, "correctOptionId": 21, "explanation": "...", "optionExplanations": "...",
                "transcriptEn": "...", "translationVi": "...", "vocabularies": [ ... ] } }
```

### Chấm điểm (L10/L12)

- Một câu đúng khi `selectedOptionId` là đáp án đúng; câu bỏ trống tính sai.
- Điểm quy đổi TOEIC (`ListeningScaled`, `ReadingScaled`, `TotalScaled`) tra bảng `ScoreConversion`, khi lượt không phải ngân hàng (`EXAM` hoặc `PRACTICE`, cả `FULL/LISTENING/READING/PART`) và kỹ năng đó có đúng 100 câu; `TotalScaled` chỉ có khi cả hai kỹ năng có điểm. Các trường hợp khác là `null`.
- Nộp là thao tác nguyên tử: nộp trùng/hết giờ đồng thời chỉ một bên chốt, bên kia nhận kết quả đã chốt.
- Sau khi nộp: ghi tiến độ từng câu (`UserQuestionProgress`, lấy kết quả mới nhất), cộng `StudyDay` của ngày hôm nay (múi giờ `Learning:UtcOffsetHours`, mặc định UTC+7).
- `GET .../result` luôn có thống kê theo Part và danh sách từng câu `questions[]` (`selectedOptionId`, `isCorrect`, `selectedLabel`, `correctLabel` — nhãn A/B/C/D để hiện bảng đáp án). `includeReview=true` thêm `groups[]` (đáp án, giải thích, transcript, từ vựng).
- **Sửa 17/11/2026 (BR-09):** Luyện thi cũng được xem kết quả từng câu và đáp án chi tiết **sau khi nộp** (`Learning:AllowExamReview` mặc định `true`). Khi đang làm, Luyện thi vẫn không trả đúng/sai. Đặt `Learning:AllowExamReview = false` để quay lại cách cũ (khi đó `questions` là `null`, `includeReview=true` trả `403 REVIEW_NOT_ALLOWED`).

## 4. Ngân hàng câu hỏi (tab Part 1–7)

Các tab Part dùng **câu chuẩn của đề đã xuất bản** (không dùng clip cắt).

`cardKey`:

| Giá trị | Ý nghĩa |
|---|---|
| `level-{n}` | Theo độ khó (Level). Tên và số Level lấy từ bảng `LevelBand` |
| `cat-{categoryId}` | Theo chủ điểm; loại cha gồm cả loại con |
| `all` | Cả Part ("Luyện ngẫu nhiên") |
| `grammar` | Mọi chủ điểm ngữ pháp, chỉ Part 5 |

`GET /api/bank/parts/{partNo}/cards` trả `partNo, totalQuestions, levelCards[], categoryCards[], categories[]` (các lựa chọn cho ô "Tất cả chủ điểm"); mỗi thẻ có `cardKey, kind, name, shortLabel, totalQuestions, practicedCount, correctCount, wrongCount, status, children[]`. Thẻ `all`/`grammar` không nằm trong danh sách, dùng trực tiếp làm `cardKey`. Tham số `categoryId` thu hẹp các thẻ Level; `levelNo` thu hẹp các thẻ chủ điểm.

`POST /api/bank/attempts` — `pick`: `NEW` (câu chưa luyện), `WRONG` (câu sai gần nhất), `ALL` (cả thẻ). `categoryId`/`levelNo` (tùy chọn) thu hẹp thêm trong thẻ. Máy chủ chọn ngẫu nhiên trọn nhóm cho đến khoảng `Learning:BankBatchQuestions` câu (mặc định 20), tạo lượt `PRACTICE` + `BANK` và trả kèm `content` (nội dung nhóm câu hỏi, link media đã ký). Trả lời bằng L08. Mỗi câu ghi tiến độ ngay khi trả lời.

Trạng thái thẻ: `NEW` (chưa luyện), `IN_PROGRESS`, `DONE` (đã luyện hết).

`GET /api/grammar/topics` (tab Ngữ pháp, Part 5): trả `totalQuestions, practicedCount, correctCount, wrongCount, groups[]`; mỗi nhóm (loại cha) có `topics[]` là các chủ điểm ngữ pháp (bảng `GrammarTopic`) với `categoryId`, `cardKey` (dùng cho `POST /api/bank/attempts`), `name`, `summary`, số câu và tiến độ. Tham số `parentCategoryId` chỉ lấy một nhóm; `cardKey = grammar` luyện ngẫu nhiên toàn bộ.

## 4b. Nghe chép (clip cắt)

Chỉ lấy các bộ clip (`ListeningItem`, chưa xóa) thuộc nhóm câu nghe của đề chưa xóa và có ít nhất một clip chưa xóa. Đề DRAFT cũng hiện (đề chỉ có phần Nghe không xuất bản được); đặt `Learning:StudyContentOnlyPublished=true` để chỉ lấy đề PUBLISHED. Không xét cờ `ListeningItem.IsPublished` (Admin không bật cờ này khi nhập đề; đề `PUBLISHED` là điều kiện). Clip chưa có audio vẫn hiện, `audio` rỗng. Luồng giao diện như ảnh tham khảo:

1. L28 chọn bộ đề (Test N) → L29 xem các đề, mỗi đề có thẻ Part 1–4 kèm số clip → L31 với `examId` và `partNo`.
2. "Theo chủ đề": L30 trả loại bài, Level và dạng đặc biệt; chọn rồi gọi L31 với `categoryId`, `levelNo`, `specialTagId`.
3. "Câu cần luyện": L31 với `status = NEEDS_PRACTICE` (độ chính xác lần gần nhất dưới `Learning:DictationNeedsPracticePercent`, mặc định 80).
4. L32 lấy các clip của bộ để nghe chép; client ẩn chữ và tự tính độ chính xác; xong gọi L33.

`status` của bộ clip: `NEW` (chưa luyện), `NEEDS_PRACTICE`, `DONE`. Level của bộ clip = Level của nhóm câu (nếu có), nếu không là Level thấp nhất trong các câu của nhóm. Lượt luyện ghi vào `UserListeningProgress` và cộng `StudyDay.ClipPracticeCount`.

## 4c. Học từ vựng (thuật toán lặp lại ngắt quãng)

**Nguồn từ**: bảng `Vocabulary`; thuộc đề/Part qua `VocabularyContext` (theo `QuestionId` → nhóm câu hỏi, hoặc theo `ClipId` → bộ clip → nhóm). Đề chưa xóa (chỉ PUBLISHED nếu bật `Learning:StudyContentOnlyPublished`). Danh mục (từ + liên kết từ–đề–Part) cache 10 phút trong bộ nhớ; tiến độ của người dùng đọc một lần mỗi request rồi lọc/đếm trong bộ nhớ.

**Chia nhóm**: bộ đề gốc → đề → Part (L35, L36); lọc từ theo bất kỳ cấp nào (L37, L38). `mine = true` giao với bộ từ cá nhân (`UserVocabulary.VocabId`; từ tự thêm không có tiến độ SM-2).

**Thuật toán** (`VocabScheduler`, SM-2 cải biên). Mỗi từ có `Repetitions`, `IntervalDays`, `EaseFactor` (1,3–3,0; khởi đầu 2,5), `Lapses`, `NextReviewAt`:

| Đánh giá | Khoảng ôn kế tiếp | EaseFactor |
|---|---|---|
| 0 Quên | 10 phút; `Repetitions = 0`, `Lapses + 1` | −0,20 |
| 1 Khó | lần đầu 1 ngày; sau đó `max(khoảng + 1, khoảng × 1,2)` | −0,15 |
| 2 Nhớ | lần 1: 1 ngày, lần 2: 3 ngày, sau đó `khoảng × EaseFactor` | giữ nguyên |
| 3 Dễ | lần 1: 4 ngày, lần 2: 7 ngày, sau đó `khoảng × EaseFactor × 1,3` | +0,15 |

Khoảng tối đa 365 ngày. Khoảng ≥ 21 ngày = `MASTERED`, ngược lại `LEARNING`; chưa có dòng = `NEW`. Từ "đến hạn" là `NextReviewAt ≤ bây giờ`. Phiên học (L38) lấy từ đến hạn (cũ nhất trước) rồi từ mới (theo `VocabId`), mỗi thẻ có `previewMinutes[4]` để hiện thời gian ôn trên 4 nút. Mỗi lượt ôn cộng `StudyDay.VocabReviewCount`.

## 4d. Luyện thi liền mạch (phía giao diện, không đổi API)

Luyện thi (EXAM) chạy tuần tự như thi thật: màn **Hướng dẫn** lấy từ `GET /api/exams/{id}/directions` (dùng chung mọi đề khi `ExamId = NULL`; phần Nghe/Đọc rồi từng Part), tự phát audio hướng dẫn, có nút **Bỏ qua phần này**; thời gian xem hướng dẫn gửi qua `POST /api/attempts/{id}/direction-time` nên không tính vào giờ làm bài. Phần Nghe: audio nhóm câu hỏi tự phát, hết audio tự chuyển nhóm kế (mặc định, tắt được trong hộp chọn chế độ). Phần Đọc: nút **Câu tiếp**. Không có nút lùi, không xem lại đáp án đã qua. Part 1–2 chỉ hiện A/B/C/D. Luyện tập Part 1–2 mặc định ẩn câu hỏi/đáp án (có nút hiện chữ). **Hướng dẫn chung phải có dữ liệu** trong `ExamDirection` (`ExamId = NULL`) — nếu chưa có thì bài thi bỏ qua màn hướng dẫn.

## 5. Mã lỗi mới

| Mã | HTTP | Ý nghĩa |
|---|---|---|
| `ATTEMPT_NOT_FOUND` | 404 | Không có lượt này của bạn |
| `ATTEMPT_NOT_IN_PROGRESS` | 409 | Lượt đã nộp/bỏ dở |
| `ATTEMPT_NOT_SUBMITTED` | 409 | Lấy kết quả/xem lại khi chưa nộp |
| `ATTEMPT_IN_PROGRESS` | 409 | Xóa lượt đang làm |
| `ATTEMPT_EXPIRED` | 409 | Hết giờ, bài đã tự nộp |
| `REVIEW_NOT_ALLOWED` | 403 | Luyện thi không xem đáp án chi tiết (chỉ khi đặt `Learning:AllowExamReview = false`) |
| `QUESTION_NOT_IN_ATTEMPT` | 404 | Câu không thuộc lượt |
| `OPTION_NOT_IN_QUESTION` | 400 | Phương án không thuộc câu |
| `ANSWER_LOCKED` | 409 | Luyện tập: câu đã hiện đáp án (đã chấm), không đổi |
| `ANSWER_CLEAR_NOT_ALLOWED` | 400 | Luyện tập: bỏ chọn khi `reveal = true` |
| `SCOPE_PARTS_INVALID` | 400 | `partNos` sai với `scope` |
| `TIME_LIMIT_NOT_ALLOWED` | 400 | Đặt thời gian khi không phải chế độ `EXAM` |
| `SCOPE_EMPTY` | 409 | Đề không có câu trong phạm vi |
| `BANK_CARD_INVALID` | 400 | `cardKey` sai (phải là `level-N`, `cat-N`, `all`, `grammar`) hoặc thẻ không có câu |
| `BANK_EMPTY` | 409 | Không còn câu phù hợp với `pick` |
| `VOCAB_INVALID` / `VOCAB_EXISTS` / `VOCAB_NOT_FOUND` | 400 / 409 / 404 | Bộ từ cá nhân |
| `REPORT_INVALID` / `REPORT_TARGET_NOT_FOUND` / `REPORT_DUPLICATE` / `REPORT_NOT_FOUND` | 400 / 404 / 409 / 404 | Báo lỗi. `REPORT_DUPLICATE`: người học còn báo cáo `NEW`/`IN_PROGRESS` cho cùng câu/từ (không phân biệt loại lỗi, BR-15, `UX_Report_Open`); cả khi hai request gửi đồng thời |
| `REPORT_REOPEN_CONFLICT` | 409 | Admin mở lại (`IN_PROGRESS`) báo cáo đã đóng trong khi người học đã có báo cáo khác đang mở cho cùng nội dung |
| `DICTATION_ITEM_NOT_FOUND` | 404 | Bộ clip Nghe chép không tồn tại hoặc đã xóa |
| `VOCAB_SOURCE_NOT_FOUND` | 404 | Từ vựng hệ thống không tồn tại (L39) |
| `VOCAB_PROGRESS_NOT_FOUND` | 404 | Từ chưa có tiến độ để xóa (L40) |
| `VOCAB_SCHEMA_MISSING` | 503 | Thiếu bảng `UserVocabProgress` hoặc cột `StudyDay.VocabReviewCount`; áp dụng `Docs/DATABASE/01_schema.sql` trên đúng database đích |
| `EXAM_NOT_FOUND` | 404 | Đề không tồn tại hoặc chưa xuất bản (vào đề/làm bài) |

## 6. Giả định và giới hạn

- **Chưa chạy trên SQL Server thật.** Môi trường phát triển lượt này không có SQL Server; các truy vấn EF Core mới chỉ được biên dịch và kiểm bằng máy chủ giả. Cần chạy thử toàn bộ luồng (đặc biệt L05–L13, L15–L16, S01–S04) trên ToeicDb trước khi dùng.
- Bảng mới `UserListeningProgress` và `GrammarTopic` cùng cột `StudyDay.ClipPracticeCount` được ánh xạ theo thiết kế; cần có trong CSDL.
- Số Level lấy từ `LevelBand` (tài liệu thiết kế ghi 4 mức, ảnh tham khảo có 8): cần seed đủ dữ liệu. Thẻ chủ điểm lấy các loại gốc (hoặc loại con nếu chỉ có một gốc); chưa kiểm với cây loại thật.
- Bộ đề Nghe chép sắp theo `ExamSetId` tăng dần.
- Độ chính xác nghe chép do client tính, máy chủ tin giá trị gửi lên (0–100). Nghe chép hiện có 3 tab: Nghe chép (ẩn 30/50/70/100%, `HIDE_SOME`/`HIDE_ALL`), Nghe check (lật từ, `FLIP`), Nghe full (nghe lần lượt các clip, `SHADOW`); audio lấy từ clip cắt của bộ clip, vẫn liên kết về nhóm câu hỏi gốc để chia theo bộ đề/đề/Part.
- Các bảng `Attempt`, `AttemptAnswer`, `UserQuestionProgress`, `StudyDay`, `ScoreConversion`, `UserVocabulary`, `Report` được ánh xạ theo `TOEIC_DatabaseDesign_v1.3.md`. Cần đối chiếu tên cột với `DATABASE/01_schema.sql` thực tế; lệch tên cột sẽ báo lỗi ngay lần gọi đầu.
- Tự nộp khi hết giờ chạy **lười** (ở lần truy cập kế tiếp); nếu người học không quay lại, lượt vẫn `IN_PROGRESS` cho đến khi có truy cập hoặc bỏ dở. Cần job nền nếu muốn chốt ngay.
- Ngày thống kê của Admin theo UTC; ngày học của học viên theo `Learning:UtcOffsetHours`.
- Bảng `UserVocabProgress`, cột `StudyDay.VocabReviewCount`, FK và index đã gộp trong `Docs/DATABASE/01_schema.sql` (A7.2, phần cập nhật tại chỗ, B/C). Áp dụng bộ `01 → 02 → 03` bằng tài khoản triển khai trước khi chạy backend; API không tự chạy DDL lúc khởi động. Xem [hướng dẫn database](TOEIC_Database_Scripts.md).
- Từ vựng chỉ hiện khi có `VocabularyContext` gắn câu hỏi/clip của đề chưa xóa; từ tự thêm trong bộ từ cá nhân không học bằng SM-2.
- Chưa làm: bài viết ngữ pháp (UC-18). Trang HTML quản trị/kiểm thử chưa có nút cho L27–L34 (chỉ làm backend theo yêu cầu).

## 7. Cấu hình mới (tùy chọn, `appsettings`)

| Khóa | Mặc định | Ý nghĩa |
|---|---|---|
| `Learning:UtcOffsetHours` | 7 | Múi giờ tính ngày học |
| `Learning:BankBatchQuestions` | 20 | Số câu mỗi lượt học ngân hàng (5–100) |
| `Learning:AllowExamReview` | true (từ 17/11/2026; trước là false) | Cho xem kết quả từng câu và đáp án chi tiết sau khi nộp Luyện thi; `false` để ẩn |
| `Learning:DictationNeedsPracticePercent` | 80 | Ngưỡng độ chính xác dưới đó bộ clip là "cần luyện" |
| `Learning:VocabNewPerDay` | 10 | Số từ mới mặc định mỗi phiên học từ vựng (1–50) |
| `R2:SignedUrlMinutes` | 10 | Hạn link media (1–60) |


### Thể loại học từ vựng (giao diện)

Giao diện chọn thể loại ở `#/vocab/learn`: Thẻ ghi nhớ; Chọn nghĩa; Chọn từ; Nghe & chọn; Gõ từ; Điền chỗ trống (câu ví dụ); Xếp chữ; trò chơi Ghép cặp, Lật thẻ trí nhớ, Đua 60 giây. Tất cả dùng chung phiên học L38 và đáp án gây nhiễu `pool`. Kết quả mỗi từ được ghi bằng L39 **một lần mỗi phiên và chỉ với từ mới hoặc đã đến hạn** (đúng nhanh = 3 Dễ, đúng = 2 Nhớ, ghép/lật có sai = 1 Khó, sai = 0 Quên), nên luyện tự do (`PRACTICE`) không làm lệch lịch ôn của từ chưa đến hạn. Học theo bài ở `#/vocab/lessons` (L41).
