# Dọn API không còn được sử dụng — 13/11/2026

Phạm vi: `G:\ToeicMind\ToeicMind`, đối chiếu hai client tại `../ToeicMindAdmin - Copy/src` và `../LEARNER/js`. Task: P03-01–03, P05-02, CHG-002. Các quyết định trong báo cáo này thay thế hợp đồng cũ của những endpoint được liệt kê dưới đây.

## 1. Endpoint đã gỡ trong đợt này

Đã gỡ **12 cặp HTTP method + route**, không chỉ bỏ chúng khỏi Swagger.

| STT | Method | Route đã gỡ | Lý do / cách thay thế |
| --- | --- | --- | --- |
| 1 | POST | `/api/admin/exams/import-v1` | Trang Nhập JSON đã gỡ; Admin hiện dùng nhập Excel qua `POST /api/admin/exams/import` |
| 2 | PUT | `/api/admin/exams/{examId}/import-v1` | Lưu lại đề qua `PUT /api/admin/exams/{examId}/content` |
| 3 | GET | `/api/exam-sets/{id}` | Không có lời gọi trong hai client hiện tại; danh sách bộ đề đã có metadata cần thiết |
| 4 | GET | `/api/exams/{id}` | Người học dùng danh sách đề, `modes`, `outline`, `directions` và nội dung từng Part |
| 5 | DELETE | `/api/admin/directions/{id}` | Đã bỏ hướng dẫn riêng theo đề; giao diện chỉ sửa bộ hướng dẫn chung |
| 6 | GET | `/api/admin/users/{id}` | Không được UI gọi; thông tin người dùng lấy từ danh sách; service đọc chi tiết vẫn được giữ cho logic nội bộ |
| 7 | GET | `/api/admin/exam-sets/{id}` | Không được UI gọi; metadata lấy từ danh sách và response tạo/sửa/khôi phục |
| 8 | GET | `/api/admin/exams/{examId}/groups/{groupId}` | Trình biên soạn đọc danh sách nhóm của đề |
| 9 | POST | `/api/admin/exams/{examId}/groups` | Trình biên soạn lưu cả gói nội dung qua import/content |
| 10 | PUT | `/api/admin/exams/{examId}/groups/{groupId}` | Như trên |
| 11 | DELETE | `/api/admin/exams/{examId}/groups/{groupId}` | Nhóm bị bỏ được xóa mềm trong transaction lưu cả gói |
| 12 | DELETE | `/api/admin/exams/{examId}/groups/{groupId}/questions/{questionId}` | Câu bị bỏ được xử lý khi lưu aggregate của đề |

`POST /api/admin/users/{id}/reset-password` đã bị gỡ ở đợt trước. Đợt này kiểm tra lại để bảo đảm endpoint đó không xuất hiện trở lại. Tổng số operation bị loại được kiểm chứng trong smoke là **13**, gồm 12 mới và 1 đã gỡ trước.

Không có lời gọi trong hai client được kiểm tra không phải thống kê traffic của các client bên ngoài workspace. Việc gỡ được thực hiện theo yêu cầu dọn API của người dùng.

## 2. Những phần được giữ vì vẫn có người dùng

- `GET /api/exam-sets` và `GET /api/exams`: `../LEARNER/js/pages/tests.js` vẫn gọi để chọn bộ đề/đề.
- API người học `modes`, `outline`, `directions`, `parts/{partNo}`, `parts/{partNo}/media`: tiếp tục phục vụ vào đề/làm bài.
- `POST /api/admin/exams/import`, `PUT /api/admin/exams/{examId}/content`, `GET /api/admin/exams/{examId}/import-source`: tiếp tục phục vụ Excel và trình biên soạn.
- `GET /api/admin/exams/{examId}/groups`, các API upload media nhóm/clip/hướng dẫn và URL ký: giữ nguyên.
- Toàn bộ API đang được Tổng quan, Người dùng, Báo lỗi, Hướng dẫn, Media và xác thực sử dụng được giữ.
- `ExamContentRepository.SaveGroupAsync` và `DeleteGroupAsync`: vẫn được `SavePackageAsync` dùng trong transaction nhập/lưu cả đề.
- `ExamContentRepository.GetGroupAsync`: vẫn được `ExamMediaService` dùng để kiểm tra nhóm trước upload.
- `IAdminUserService.GetAsync`: vẫn phục vụ kiểm tra người dùng trong endpoint thống kê và lịch sử làm bài.
- `IExamService.GetSetAsync`: vẫn phục vụ response tạo/sửa/khôi phục bộ đề; `GetExamAsync` vẫn phục vụ metadata quản trị và nhập nội dung.

## 3. Dọn mã phụ thuộc và tương thích

- Xóa `ExamV1Mapper.cs` và 9 DTO `ImportExamV1*.cs`, vì chỉ phục vụ hai route `import-v1` đã gỡ.
- Gỡ phương thức service/interface chỉ phục vụ CRUD nhóm đơn lẻ, import-v1 và xóa hướng dẫn riêng. Gỡ repository `DeleteQuestionAsync` và `DeleteDirectionAsync` không còn người gọi.
- Gỡ ba overload mapper entity nhóm/câu/clip không còn được gọi sau khi bỏ CRUD nhóm đơn lẻ; giữ mapper media/hướng dẫn đang được upload và bộ hướng dẫn sử dụng. DTO nội dung nhóm/câu/clip tiếp tục được reader dùng và không bị xóa.
- Giữ model/DTO/validator và repository dùng chung cho việc lưu cả đề, media, xuất bản và người học.
- Gỡ các wrapper frontend không còn nơi gọi và nay trỏ tới API đã xóa.
- `POST /api/admin/users` và `POST /api/admin/exam-sets` vẫn trả **201 kèm DTO**. Thay `CreatedAtAction(nameof(Get))` bằng phản hồi 201 trực tiếp để không tạo `Location` tới action đã gỡ.
- Không thay schema, không chạy migration/SQL, không xóa bản ghi hoặc object media.

## 4. Kiểm chứng đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `dotnet build ToeicMind.csproj --no-restore -p:UseAppHost=false -o artifacts/api-cleanup-build` | Đạt, 0 warning / 0 error |
| OpenAPI của binary mới trên tiến trình kiểm thử riêng, cổng 5096 | 98 operation; không còn 13 operation trong danh sách kiểm tra |
| HTTP trực tiếp tới 13 operation đã gỡ | Trả 404 hoặc 405; 405 khi URL vẫn còn method khác đang được giữ |
| 18 operation còn dùng: danh sách/người học, nhập/lưu đề, media, tạo người dùng/bộ đề, thống kê người dùng | Còn trong OpenAPI, có security metadata; request không token trả 401 |
| Frontend `npm run build` | Đạt; còn cảnh báo bundle lớn đã có trước |
| Frontend `npm test` | 59/59 đạt |
| `node scripts/check-admin-navigation.mjs` | Đạt với API mock: dashboard lỗi/thử lại, directions, menu PC, thông báo điện thoại và tài khoản |

Smoke backend dùng content root riêng, JWT kiểm thử và chuỗi kết nối trỏ tới cổng không phục vụ SQL. Chỉ gọi OpenAPI, route đã gỡ và request không token; không đăng nhập, không chạy CRUD và không đọc/ghi database thật. Upload trong smoke chỉ kiểm tra route/quyền truy cập, không upload R2 thật. Tiến trình smoke đã được dừng sau kiểm tra.

Các kiểm tra trên không phải nghiệm thu tích hợp SQL/R2 hoặc kiểm tra nghiệp vụ toàn bộ ứng dụng. Project test backend đã được người dùng gỡ trước đây; không tạo lại project test.

## 5. Sao lưu và áp dụng

Mã nguồn backend trước khi dọn được lưu tại `artifacts/api-cleanup-backup-20261113-180835.zip`. Archive gồm controller, service/repository/DTO phần Exams và tài liệu API trước thay đổi; có thể lấy lại các file đã xóa từ đây. Không khôi phục toàn bộ archive đè lên công việc mới nếu chỉ cần một phần mã.

Backend đang chạy của người dùng không bị dừng/khởi động lại. Cần triển khai binary mới hoặc khởi động lại backend từ source đã sửa để danh sách endpoint mới có hiệu lực trên cổng ứng dụng chính.
