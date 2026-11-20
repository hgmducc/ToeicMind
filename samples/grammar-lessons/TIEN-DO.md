# Tiến độ bộ bài học ngữ pháp TOEIC

Bài học tương tác cho 15 chủ điểm ngữ pháp Part 5 (`dbo.GrammarTopic`, seed trong `ToeicMind/Docs/DATABASE/03_seed.sql`).
Mỗi file là HTML fragment, dán vào ô "Mã nguồn HTML" của màn Admin "Bài ngữ pháp" cho đúng chủ điểm.
File mẫu gốc `samples/bai-ngu-phap-danh-tu.txt` giữ nguyên; bài Danh từ chuyên sâu nằm trong thư mục này.

| # | Nhóm | Mã category | Chủ điểm | File | Trạng thái |
|---|---|---|---|---|---|
| 1 | Từ loại | noun | Danh từ | bai-ngu-phap-danh-tu.txt | Xong (bản gọn, 16 câu) |
| 2 | Từ loại | adjective | Tính từ | bai-ngu-phap-tinh-tu.txt | Xong (15 câu) |
| 3 | Từ loại | adverb | Trạng từ | bai-ngu-phap-trang-tu.txt | Xong (13 câu) |
| 4 | Động từ | tense | Thì | bai-ngu-phap-thi.txt | Xong (11 câu) |
| 5 | Động từ | subject_verb_agreement | Hòa hợp chủ ngữ, động từ | bai-ngu-phap-hoa-hop-chu-ngu-dong-tu.txt | Xong (12 câu) |
| 6 | Động từ | active_passive_voice | Chủ động – Bị động | bai-ngu-phap-chu-dong-bi-dong.txt | Xong (12 câu) |
| 7 | Động từ | gerund | Danh động từ | bai-ngu-phap-danh-dong-tu.txt | Xong (11 câu) |
| 8 | Động từ | imperative | Câu mệnh lệnh | bai-ngu-phap-cau-menh-lenh.txt | Xong (10 câu) |
| 9 | Động từ | verb_form | Dạng động từ | bai-ngu-phap-dang-dong-tu.txt | Xong (10 câu) |
| 10 | Ngữ pháp khác | pronoun | Đại từ | bai-ngu-phap-dai-tu.txt | Xong (10 câu) |
| 11 | Ngữ pháp khác | comparison | So sánh | bai-ngu-phap-so-sanh.txt | Xong (10 câu) |
| 12 | Ngữ pháp khác | conjunction_preposition | Liên từ, giới từ | bai-ngu-phap-lien-tu-gioi-tu.txt | Xong (10 câu) |
| 13 | Ngữ pháp khác | relative_clause | Mệnh đề quan hệ | bai-ngu-phap-menh-de-quan-he.txt | Xong (9 câu) |
| 14 | Ngữ pháp khác | conditional_sentence | Câu điều kiện | bai-ngu-phap-cau-dieu-kien.txt | Xong (9 câu) |
| 15 | Ngữ pháp khác | adverbial_clause | Mệnh đề trạng ngữ | bai-ngu-phap-menh-de-trang-ngu.txt | Xong (9 câu) |

## Phân chia nội dung giữa các bài (tránh trùng lặp)

- V-ing làm danh từ (sau giới từ, sau động từ như avoid/consider, `to` là giới từ): **Danh động từ**. To V, V nguyên mẫu, phân từ V-ing/V3 làm tính từ hoặc rút gọn mệnh đề, động từ chính hay không: **Dạng động từ**.
- Câu mệnh lệnh, Please + V, câu giả định sau recommend/request/require that: **Câu mệnh lệnh**.
- Phân biệt giới từ – liên từ – trạng từ liên kết, liên từ kết hợp và tương quan: **Liên từ, giới từ**. Mệnh đề trạng ngữ (thời gian, lý do, nhượng bộ, mục đích…), rút gọn mệnh đề trạng ngữ, thì trong mệnh đề thời gian: **Mệnh đề trạng ngữ**. If/unless/đảo ngữ điều kiện: **Câu điều kiện**.
- Chia động từ theo chủ ngữ: **Hòa hợp chủ ngữ, động từ**; các bài khác chỉ nhắc và dẫn chiếu.

## Định dạng nội dung (theo yêu cầu 2026-11-20)

- Lý thuyết dạng **tóm tắt trọng tâm**: bảng, gạch đầu dòng, công thức; không viết dài.
- Mỗi dạng câu hỏi/nhóm kiến thức chỉ **1–2 bài tập**; không có bộ bài tập tổng hợp dài.
- Lời giải gọn: Đáp án đúng · Câu hoàn chỉnh + Dịch · Vì sao đúng · từng phương án sai (1 dòng) · Bẫy + Ghi nhớ.
- Khung bài: đoạn mở đầu ngắn (trước `<h2>` đầu tiên) → các phần kiến thức → Bẫy và ngoại lệ → Ứng dụng Part 6–7 → Mẹo và quy trình → Tổng kết, ôn tập (không có checklist tự đánh giá).
- Tiêu đề `<h2>` ngắn, vừa một dòng (khoảng 24 ký tự): mục lục FE bị cắt chữ khi tiêu đề xuống dòng.

## Quy ước kỹ thuật

- Mỗi phần mở đầu bằng `<h2>` (mục lục bên người học). Phần không có chữ "mẹo / tổng kết / tổng hợp / ôn tập" trong tiêu đề luôn có ít nhất một `grammar-example` và một `grammar-exercise` (khớp `lessonIssues` của Admin).
- Bài tập: `div.grammar-exercise` cấp cao nhất, `ol.grammar-options` đúng 4 `li`, đúng một `li.grammar-correct`, có `div.grammar-explain`.
- Chỉ dùng thẻ HTML thường và 7 class: grammar-structure, grammar-example, grammar-tip, grammar-exercise, grammar-options, grammar-correct, grammar-explain.

## Nhật ký

- 2026-11-20: khảo sát hệ thống, lập danh sách 15 file.
- 2026-11-20: Danh từ – bản đầy đủ (76 câu) được rút gọn theo yêu cầu thành 11 phần, 16 câu (A/B/C/D = 4/4/4/4). Đạt: kiểm tra cấu trúc, `lessonIssues` của Admin, HtmlSanitizer cấu hình như backend, hiển thị Playwright trên FE (mock).
- 2026-11-20: hoàn thành 14 bài còn lại theo mẫu bài Danh từ (tổng 15 bài, 167 câu). Cả 15 bài đạt 4 bước kiểm tra trên; mục lục không bị cắt chữ ở 1280×900 và 1366×768.
