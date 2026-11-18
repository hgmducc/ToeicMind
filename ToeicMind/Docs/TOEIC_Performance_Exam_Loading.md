# ToeicMind — Tối ưu tải đề thi

| Thuộc tính | Giá trị |
|---|---|
| Ngày | 03/11/2026 (CHG-003) |
| Vấn đề báo cáo | `GET /api/admin/exams/1/groups` mất 70–76 giây cho đề 103 nhóm, 200 câu, 1694 từ vựng |
| Trạng thái | Đã thay cách đọc và thêm API vào đề theo Part; **chưa đo được trên SQL Server thật** — số liệu cải thiện chưa được xác nhận |

## 1. Nguyên nhân khả dĩ nhất

API cũ nạp cả đồ thị entity bằng một chuỗi `Include` rất sâu (nhóm → câu → đáp án → từ vựng → ngữ cảnh từ → clip → media…). Với đề 200 câu × 4 đáp án × nhiều từ vựng, SQL Server trả về tích Descartes hàng triệu dòng (hoặc EF chia thành rất nhiều truy vấn lồng nhau), rồi EF phải dựng lại từng entity và theo dõi thay đổi. Chi phí tăng theo cấp số nhân với số bảng con, nên một đề lớn chậm hàng chục giây. Nhật ký EF ở mức `Information` còn in cả câu SQL và tham số của từng truy vấn, làm chậm thêm.

Chưa có hồ sơ truy vấn (query plan) của database thật nên đây là suy luận từ cấu trúc code, không phải kết luận đã chứng minh. Header `Server-Timing` (mục 4) dùng để xác nhận.

## 2. Những gì đã đổi

| Thay đổi | Tác dụng |
|---|---|
| `ExamContentReader`: mỗi bảng **một truy vấn phẳng** theo danh sách ID (nhóm, tag, câu, đáp án, từ vựng, clip, media), chỉ chọn cột cần, `AsNoTracking`, ghép trong bộ nhớ | Bỏ tích Descartes và việc theo dõi entity; 8 truy vấn nhỏ thay cho 1 truy vấn khổng lồ. Dùng cho `GET /api/admin/exams/{id}/groups` (E18/E19), phản hồi giữ nguyên hình dạng |
| Vào đề tách nhỏ: `outline` → `parts/{n}` → `media` (L01–L04) | Người học thấy Part đầu ngay, không chờ cả đề; chữ và media tách riêng |
| Bản "vào thi" tối giản (`ReadPlayAsync`): 4 truy vấn, **không** tải giải thích, transcript, bản dịch, từ vựng, đáp án đúng | Dữ liệu nhỏ hơn nhiều; cũng không lộ đáp án |
| Cache RAM theo `(đề, UpdatedAt của đề)` | Mọi thay đổi nội dung đều đổi `Exam.UpdatedAt` nên cache **tự hết hiệu lực**, kể cả khi chạy nhiều máy chủ. Lần đầu mới chạm SQL, các lần sau trả từ RAM. Chống dồn cục: nhiều request cùng lúc chờ chung một lần dựng |
| ETag + `If-None-Match` → 304 cho outline và Part không kèm media | Trình duyệt không tải lại khi đề không đổi |
| Link media ký **khi trả lời**, không cache link | Link luôn còn hạn; ký là tính toán cục bộ (không gọi mạng đến R2) |
| `appsettings.json`: `Microsoft.EntityFrameworkCore.Database.Command` = `Warning` | Không in SQL mỗi truy vấn |
| `Docs/DATABASE/01_schema.sql`, C2/C3 | Index cho các cột khóa ngoại mà truy vấn phẳng lọc theo; gồm các cột INCLUDE và thứ tự khóa cần thiết |

Phạm vi cache: bộ nhớ từng tiến trình. Chạy nhiều máy chủ thì mỗi máy tự nạp lần đầu (vẫn đúng nhờ khóa theo `UpdatedAt`). Hướng dẫn mặc định (ExamId = NULL) có thể đổi mà không đổi `UpdatedAt` của đề nên cache hướng dẫn chỉ sống 5 phút.

## 3. Việc cần làm

1. Dùng bộ SQL chuẩn theo [hướng dẫn database](TOEIC_Database_Scripts.md): index đã gộp vào `Docs/DATABASE/01_schema.sql`, phần C2/C3. Chạy trên đúng database đích, tiếp theo `02 → 03`, bỏ `00` với database đã có. Script kiểm tra tồn tại và giữ index hiện có. `QuestionGroupTag` dùng PK clustered `(GroupId, SpecialTagId)` để tránh tạo thêm index trùng chức năng.
2. Chạy lại `GET /api/admin/exams/1/groups` và gọi `GET /api/exams/1/parts/1?media=false` hai lần liên tiếp; đối chiếu `Server-Timing`.

Cập nhật 13/11/2026: phần hợp nhất CHG-003/CHG-005 đã qua 67 kiểm tra SQL Server trên database tạm, gồm tạo mới/nâng cấp/chạy lại và so sánh metadata index. Đây là kiểm chứng tính đúng của script; chưa phải số đo cải thiện thời gian tải đề.

## 4. Đo đạc bằng Server-Timing

Mọi phản hồi có đo kèm header `Server-Timing`. Ví dụ:

```
Server-Timing: exam;dur=2.1, cache-miss;dur=0.0, groups;dur=6.3, questions;dur=14.8, options;dur=9.5, media;dur=3.1, clip-media;dur=2.0, assemble;dur=1.2, sign;dur=4.4
```

- `exam`: truy vấn kiểm tra đề đã xuất bản.
- `cache-hit` / `cache-miss`: có dùng cache RAM hay không.
- `groups, tags, questions, options, vocabulary, clips, media, clip-media, assemble`: từng bước đọc DB / ghép.
- `sign`: ký link media.

Quy tắc đọc: nếu một bước SQL chiếm gần hết thời gian (ví dụ `questions` hàng chục giây) thì vấn đề nằm ở index hoặc đường truyền tới SQL Server, không phải ở code. Nếu mọi bước đều nhỏ mà tổng request vẫn lớn thì chậm ở mạng/tuần tự hóa JSON. Trang `lam_de.html` hiển thị header này.

## 5. Nếu vẫn chậm

- Kiểm tra SQL Server ở máy khác/OneDrive/đường truyền chậm: mỗi truy vấn tốn một vòng mạng.
- Kiểm tra `Server-Timing` bước nào chậm rồi xem query plan của đúng bước đó (SSMS → Include Actual Execution Plan).
- Cột `PassageHtml`, `ImportSourceJson` rất lớn: API vào đề không đọc `ImportSourceJson` và chỉ đọc `PassageHtml` của Part được yêu cầu.
- Bật nén phản hồi (`UseResponseCompression`) nếu JSON lớn qua mạng chậm — chưa bật trong đợt này.
