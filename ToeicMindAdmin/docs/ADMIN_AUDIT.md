# Kiểm tra và hoàn thiện ToeicMindAdmin — 30–31/10/2026

Đối chiếu mã backend `../ToeicMindBE/ToeicMind`, bộ SQL chuẩn `../ToeicMindBE/DATABASE` và hai bộ mẫu trong `Hướng dẫn/Test_1`, `Hướng dẫn/Test_3`. Phạm vi: P03/P05 và phần quản trị nội dung của P10-01. Các chức năng học, chấm điểm, quản lý người dùng, từ điển/chủ đề độc lập và ngữ pháp ngoài phạm vi màn hình Admin hiện có.

Chốt ngày 31/10: sửa lỗi thử lại clip do mất liên kết nhóm nguồn sau lần lưu đầu; xác minh chỉ upload tệp còn thiếu và không tạo trùng đề. Sửa menu đóng vẫn lộ trên mobile, rút gọn header và giữ nhãn truy cập cho các nút. Form quên mật khẩu đưa focus tới ô lỗi sau validation/API, đồng bộ hai frontend.

## Kết quả đối soát Excel

| Dữ liệu | Test_1 | Test_3 |
|---|---:|---:|
| Questions | 200 | 200 |
| Nhóm câu | 103 | 103 |
| Vocab/ngữ cảnh | 1.694 | 1.812 |
| Audio_Segments | 303 | 201 |
| Audio chính liên kết | 54 | 54 |
| Ảnh liên kết theo Questions | 8 | 11 |
| Dict | 118 | 118 |
| Media | 65 | Không có sheet này |
| Lỗi giải thích phương án | 185 | 19 |

Tất cả dòng Vocab và Audio_Segments được gắn đúng câu/nhóm. Test_1 dùng `difficulty`, `meaning_vi`; Test_3 dùng `level`, `meaning_base`, `term_meaning_vi`. Giữ riêng nghĩa gốc và nghĩa trong ngữ cảnh. Chuẩn hóa loại từ theo quyết định đã có: `v.phr → phr.v`, `n.phr/adv.phr → phr`; không tự đặt Level hoặc ID phân loại.

**Hai file nguồn hiện chưa đủ điều kiện nhập theo hợp đồng backend.** Test_1 có nhiều giải thích chỉ là bản dịch hoặc thiếu nhãn Đúng/Sai. Test_3 có 19 câu lặp nhãn hoặc nhãn không đúng quy tắc. Client và API thật cùng phát hiện 185/19 lỗi. Hai lần nhập thử bị từ chối và không ghi dòng đề/câu/từ vựng nào. Không sửa file nguồn, suy đoán lý do hoặc đổi đáp án để vượt validation.

Danh sách 204 lỗi theo file, sheet, dòng Excel và số câu: [excel-errors.csv](../artifacts/admin-audit/excel-errors.csv).

`Dict`/`Media` và mọi sheet bổ sung được lưu nguyên dữ liệu vào `Exam.ImportSourceJson` khi nội dung hợp lệ, có API đọc lại và bảng xem tất cả cột, tìm kiếm, phân trang. Đây là bản đối soát nguồn; nội dung hiện hành được đọc riêng từ API nhóm/câu. Sheet `Media` chứa đường dẫn/URL tham chiếu, không tự tải URL bên ngoài. Tệp không có liên kết được liệt kê rõ và chưa upload.

## Các lỗi đã sửa

- Bỏ tự thay Excel lỗi/thiếu bằng Test_3 mẫu. File không hợp lệ báo lỗi và giữ bản đang soạn.
- Đọc đủ trường của hai bố cục; lấy phân loại lá/cờ từ `/exam-catalogs`; báo lỗi theo sheet, dòng và số câu.
- Lưu toàn bộ nội dung, vocab, metadata clip và sheet nguồn trong một transaction. Sửa lại giữ ID câu/clip, xóa mềm phần bị bỏ. Từ điển duy nhất theo nguyên thể/loại từ; nghĩa gốc mâu thuẫn bị từ chối, không âm thầm đổi nghĩa chung.
- Audio cắt có chủ sở hữu `ListeningClip` riêng; upload/thay clip không thay slot audio chính. Lưu transcript, vai trò, người nói, đường dẫn nguồn và các mốc thời gian.
- Media upload ngoài transaction SQL. Báo tiến độ và từng tệp lỗi; lưu lại chỉ thử các tệp còn thiếu, không tạo thêm đề. Đọc lại từ backend để kiểm tra số liệu sau lưu. Không coi SQL rollback là rollback R2.
- Biên soạn mở đúng đề đã chọn và toàn bộ dữ liệu đã lưu. Cho sửa metadata riêng; backend tiếp tục bảo vệ trạng thái xuất bản và lịch sử làm bài.
- Publish-check và publish đều gọi backend. Không còn thông báo xuất bản giả. Dialog có focus, Escape và khóa thao tác khi đang gửi.
- Quản lý bộ đề/đề có phân trang, tìm kiếm, thùng rác, sửa và khôi phục; chặn request lặp và phản hồi tìm kiếm cũ.
- Hướng dẫn hiệu lực đủ 9 mục; tạo/sửa/xóa bản riêng, trở về mặc định và upload media hướng dẫn.
- Bỏ số liệu dashboard dự phòng và nhãn “Backend kết nối tốt” cố định. Lỗi API hiện thông báo và thao tác tải lại.
- Trình HTML dùng DOMPurify trước khi render/dán; media có URL ký, xử lý lỗi tải/phát và cho mở lại liên kết.
- Responsive 320–1440px, bảng cuộn riêng, editor phân trang, sidebar có backdrop/focus/Escape. Thay đổi chưa lưu có cảnh báo khi rời trang.
- HTTP dùng một luồng refresh, khóa phiên theo đúng ứng dụng và ngăn refresh hoàn tất sau logout khôi phục phiên cũ. Đồng bộ client này và AuthLayout tương ứng sang ToeicMindFE.
- SheetJS tải khi cần, bỏ dữ liệu mẫu khỏi bundle chạy. Nâng bản cũ 0.18.5 lên 0.20.3 từ [nguồn phân phối chính thức](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/). Bundle chính từ khoảng 1,82 MB còn khoảng 0,38 MB, SheetJS tách riêng.

## Bằng chứng kiểm thử

- Admin: `npm test` đạt 56/56; lint và build qua; npm audit không có lỗ hổng được báo.
- FE: `npm test` đạt 35/35; lint và build qua sau đồng bộ phần dùng chung.
- Backend: 86/86 test SQL Server, không skip; `tests/ToeicMind.Tests/TestResults/admin-all.trx`. Có ca nhập một đề nháp tổng hợp đầy đủ 200 câu/103 nhóm/1.812 vocab/201 segments và đọc lại đủ 5 sheet; rollback lô, nghĩa gốc/ngữ cảnh, `phr.v`, giữ ID, ownership, phân quyền, khóa lịch sử và slot media riêng.
- Browser API thật + SQL Server riêng: đọc và đối soát hai bộ Excel; từ chối nguồn sai không ghi dữ liệu; nhập đề nháp tổng hợp hợp lệ, mở lại đủ câu/vocab/clip/sheet; phát audio chính và clip thật, giải mã ảnh từ URL ký R2.
- Browser Google/OTP/onboarding dùng mock SDK/API: `scripts/check-auth-ui.cjs` qua trên cả hai frontend. Không tuyên bố đăng nhập bằng Google thật hoặc gửi email OTP thật.
- Responsive kiểm tra không tràn ngang ở 320/375/760/1024/1440px; ảnh và kết quả JSON trong `artifacts/admin-audit/`. Các kiểm tra lỗi 503/tệp lỗi được ghi rõ là mock trong kết quả.
- 13 nhóm kiểm tra browser qua: gồm CRUD/khôi phục bộ đề và đề, sửa nội dung/metadata, hướng dẫn riêng, phân trang/tìm kiếm, menu bàn phím, lỗi 503 và một clip lỗi rồi thử lại. Đã kiểm tra riêng HTML preview loại script/event và giữ nội dung an toàn ở 375px bằng API mock.
- Quên mật khẩu/OTP/reset: hai frontend qua validation/focus, chặn gửi lặp, INVALID_OTP, OTP_COOLDOWN, đổi email, thành công xóa mật khẩu và không tạo phiên; dùng API mock.
- Đã dọn 6 object R2 của lượt browser cuối và xóa database thử; dữ liệu kiểm thử không được giữ trong database ứng dụng.
- Đối chiếu OpenAPI cuối: 49 thao tác trên 38 đường dẫn, gồm API seed hướng dẫn đã có trong backend. Admin có nút khởi tạo khi thiếu mặc định; test SQL Server xác minh ADMIN-only, chỉ thêm mục thiếu và không ghi đè nội dung đã sửa. Browser kiểm tra nút bằng API mock.

## Chạy lại

1. Build backend bằng `dotnet build --artifacts-path artifacts/admin-audit` tại backend; dừng helper audit trước khi build để tránh khóa DLL.
2. Từ Admin: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-audit-backend.ps1`. Script tạo database `ToeicMind_AdminAudit_<GUID>` và helper 5078; không sử dụng tài khoản thật. Cần SQL Server local Integrated Security, sqlcmd và R2 Development đang cấu hình.
   Cổng 5078 phải trống trước khi chạy helper. Tài khoản tổng hợp chỉ tạo trực tiếp trong database thử; đăng nhập phải thành công với tài khoản này trước mọi request ghi dữ liệu qua proxy, tránh đăng ký nhầm tài khoản vào môi trường khác.
3. Chạy Admin cổng 5174, proxy tới 5078. Chạy `npm run test:ui`; nếu browser cài khác phiên bản, đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` trỏ tới Chromium có sẵn. Script từ chối tên database ngoài namespace audit.
4. Dọn bằng `scripts/stop-audit-backend.ps1`: xóa đúng các object có tên `audit-*` được đăng ký trong database thử, dừng đúng process helper rồi xóa database thử. Không dùng DELETE metadata API để giả định object R2 đã bị xóa vật lý.
5. Muốn chạy hồi quy auth mock: mở cả FE 5173 và Admin 5174 rồi `node scripts/check-auth-ui.cjs` từ Admin.

## Sự cố SQL trong lượt kiểm tra

Lượt đầu của helper kiểm thử đã truyền `-d <database thử>` nhưng không loại `USE ToeicDb` trong script gốc; vì vậy 01/02/03 đã chạy cập nhật tại chỗ trên `ToeicDb`. Đã thông báo ngay trong phiên làm việc và sửa helper: loại lệnh USE, từ chối mọi lệnh chuyển/tạo/xóa database trong nội dung script, xác minh đủ 34 bảng trên đúng database thử trước khi khởi động API.

Kiểm tra sau sự cố: ToeicDb có Users=3, ExamSet=1, Exam=1, Question=0, Vocabulary=0, ListeningClip=0, ExamDirection=9. Không có dữ liệu mẫu hoặc tài khoản audit được nhập vào ToeicDb. Không có snapshot trước lượt chạy để khẳng định mọi giá trị trước/sau; các script 01/03 có guard giữ dữ liệu/seed đã tồn tại, 02 cập nhật view/procedure/trigger. Các cập nhật schema/seed này đã được áp dụng; không mô tả chúng là còn chờ triển khai. Tất cả kiểm thử sau sửa sử dụng database riêng.

## Sửa lỗi khác nghĩa gốc khi nhập đề — 31/10/2026

Backend đã bỏ lỗi chặn VOCAB_MEANING_CONFLICT theo DB-DEC-21/UC-21: dùng lại từ, giữ nghĩa gốc đang lưu, khôi phục từ xóa mềm mà không thay nghĩa; từ mới lặp trong lô dùng nghĩa lần đầu. Nghĩa ngữ cảnh/ví dụ tiếp tục lưu riêng. POST import/PUT content thêm `importWarnings` (VOCAB_MEANING_PRESERVED, số câu, từ/loại từ, nghĩa nhập và nghĩa giữ lại). ExamUploadView hiển thị thông tin này riêng với kết quả lưu/media. Không thay file nguồn hoặc schema.

Admin: 56/56 test, build và lint qua. Browser **API mock** xác nhận lưu thành công có báo cáo giữ nghĩa, gửi riêng meaningBase/termMeaningVi, chỉ một request tạo đề, desktop/375px/320px không tràn ngang và không có lỗi JavaScript. Artifact local: `artifacts/vocab-conflict/ui-result.json`, ảnh desktop/mobile và script `check-ui.mjs`. Chưa chạy lại toàn bộ luồng với API/R2 thật ở lượt sửa này.

Backend dùng ASP.NET Core trong test host và SQL Server/database test riêng: ba ca mới tái hiện 409 trước sửa; hồi quy nội dung sau sửa 24/25 qua. Ca tổng hợp lớn 200 câu chưa qua: lần chạy lại riêng ghi nhận SQL Execution Timeout khi INSERT Exam (trước resolve từ vựng), SQL báo chờ SLEEP_BPOOL_STEAL và thiếu bộ nhớ vật lý. Không ghi nhận ca này đã đạt; không sửa cấu hình SQL hoặc database ứng dụng. Bằng chứng backend: `vocab-before.trx`, `vocab-after.trx`, `vocab-large-retry.trx` trong thư mục TestResults. Khởi động lại backend để áp dụng bản sửa; kiểm tra lại ca lớn khi SQL đủ bộ nhớ.

Xác nhận cuối: **6/6 kiểm thử backend tập trung qua, 0 skip** (`vocab-focused.trx`), sau khi bổ sung kiểm tra response PUT chứa hai nghĩa đối soát và nghĩa ngữ cảnh mới thực sự được lưu. Build backend đi kèm không có cảnh báo. Đây là kiểm thử API trong test host với SQL Server thật; browser phía trên vẫn dùng mock.
