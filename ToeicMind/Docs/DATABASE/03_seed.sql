/* =====================================================================
   03_seed.sql — Dữ liệu khởi tạo (sinh tự động từ file Excel/CSV của bạn)
   Chạy sau 02_views_procs_triggers.sql. Có thể chạy lại: mỗi khối chỉ chèn khi bảng còn trống.
   Nguồn: Dict (toeic-da-gop_ai (3).xlsx), toeic_directions.xlsx, toeic_conversion_tables.csv
   ===================================================================== */
USE ToeicDb;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO
BEGIN TRANSACTION;

-- 1. PartSetting (7 Part; thời gian mỗi câu 27/45 giây khớp 45/75 phút của file hướng dẫn)
IF NOT EXISTS (SELECT 1 FROM dbo.PartSetting)
    INSERT dbo.PartSetting (PartNo, PartName, Skill, StandardQuestionCount, OptionCount, DefaultSecondsPerQuestion, AudioPlayLimit)
    VALUES (1, N'Photographs', 'LISTENING', 6, 4, 27, 1),
        (2, N'Question-Response', 'LISTENING', 25, 3, 27, 1),
        (3, N'Conversations', 'LISTENING', 39, 4, 27, 1),
        (4, N'Talks', 'LISTENING', 30, 4, 27, 1),
        (5, N'Incomplete Sentences', 'READING', 30, 4, 45, NULL),
        (6, N'Text Completion', 'READING', 16, 4, 45, NULL),
        (7, N'Reading Comprehension', 'READING', 54, 4, 45, NULL);

-- 2. LevelBand (4 mức độ khó theo điểm mục tiêu)
IF NOT EXISTS (SELECT 1 FROM dbo.LevelBand)
    INSERT dbo.LevelBand (LevelNo, NameVi, ShortLabel)
    VALUES (1, N'Level 1 – Dưới 200', N'Dưới 200'),
        (2, N'Level 2 – 200–300', N'200-300'),
        (3, N'Level 3 – 300–400', N'300-400'),
        (4, N'Level 4 – 400–495', N'400-495');

-- 3. PartOfSpeech: giữ 7 mã. Người dùng duyệt v.phr -> phr.v, n.phr/adv.phr -> phr khi nhập; ghi báo cáo từng dòng.
IF NOT EXISTS (SELECT 1 FROM dbo.PartOfSpeech)
    INSERT dbo.PartOfSpeech (PosCode, NameVi)
    VALUES ('n', N'Danh từ'),
        ('v', N'Động từ'),
        ('adj', N'Tính từ'),
        ('adv', N'Trạng từ'),
        ('prep', N'Giới từ'),
        ('phr', N'Cụm từ'),
        ('phr.v', N'Cụm động từ');

-- 4. SpecialTag (cờ đặc biệt Part 3, 4)
IF NOT EXISTS (SELECT 1 FROM dbo.SpecialTag)
    INSERT dbo.SpecialTag (PartNo, Code, NameVi)
    VALUES (3, 'chart_or_table', N'Có hình hoặc bảng biểu'),
        (3, 'three_speakers', N'Ba người nói'),
        (3, 'implied_question', N'Câu hỏi hàm ý'),
        (4, 'chart_or_table', N'Có hình hoặc bảng biểu'),
        (4, 'implied_question', N'Câu hỏi hàm ý');

-- 5. QuestionCategory (10 nhóm cha + 109 loại; tên 10 nhóm cha là đề xuất, sửa được; ISSUE-020)
IF NOT EXISTS (SELECT 1 FROM dbo.QuestionCategory)
BEGIN
    INSERT dbo.QuestionCategory (PartNo, ParentCategoryId, Code, NameVi, NameEn, SortOrder)
    SELECT v.PartNo, NULL, v.Code, v.NameVi, v.NameEn, v.SortOrder
    FROM (VALUES
            (2, 'wh_question', N'Câu hỏi Wh-', NULL, 1),
            (2, 'yes_no_question', N'Câu hỏi Yes/No', NULL, 2),
            (2, 'choice_tag_question', N'Câu hỏi lựa chọn và câu hỏi đuôi', NULL, 3),
            (5, 'part_of_speech', N'Từ loại', NULL, 1),
            (5, 'verb', N'Động từ', NULL, 2),
            (5, 'other_grammar', N'Ngữ pháp khác', NULL, 3),
            (5, 'vocabulary', N'Từ vựng', NULL, 4),
            (7, 'single_passage', N'Một đoạn văn', NULL, 1),
            (7, 'double_passage', N'Hai đoạn văn', NULL, 2),
            (7, 'triple_passage', N'Ba đoạn văn', NULL, 3)
         ) AS v (PartNo, Code, NameVi, NameEn, SortOrder);

    INSERT dbo.QuestionCategory (PartNo, ParentCategoryId, Code, NameVi, NameEn, SortOrder)
    SELECT v.PartNo, p.CategoryId, v.Code, v.NameVi, v.NameEn, v.SortOrder
    FROM (VALUES
            (1, NULL, 'single_person', N'Tranh một người', NULL, 1),
            (1, NULL, 'multiple_people', N'Tranh nhiều người', NULL, 2),
            (1, NULL, 'scene', N'Tranh tả cảnh', NULL, 3),
            (1, NULL, 'object', N'Tranh tả vật', NULL, 4),
            (2, 'wh_question', 'who', N'Who', NULL, 1),
            (2, 'wh_question', 'when', N'When', NULL, 2),
            (2, 'wh_question', 'where', N'Where', NULL, 3),
            (2, 'wh_question', 'why', N'Why', NULL, 4),
            (2, 'wh_question', 'what', N'What', NULL, 5),
            (2, 'wh_question', 'which', N'Which', NULL, 6),
            (2, 'wh_question', 'how', N'How', NULL, 7),
            (2, 'yes_no_question', 'be_do_have', N'Be – Do – Have', NULL, 1),
            (2, 'yes_no_question', 'modal', N'Modal', NULL, 2),
            (2, 'yes_no_question', 'negative_question', N'Phủ định', NULL, 3),
            (2, 'choice_tag_question', 'choice_question', N'Lựa chọn', NULL, 1),
            (2, 'choice_tag_question', 'tag_question', N'Câu hỏi đuôi', NULL, 2),
            (2, NULL, 'statement', N'Câu trần thuật (statement)', NULL, 4),
            (3, NULL, 'appointments', N'Lịch hẹn, cuộc họp và tiến độ', NULL, 1),
            (3, NULL, 'orders', N'Đơn hàng, kho bãi và giao nhận', NULL, 2),
            (3, NULL, 'shopping', N'Mua sắm, cửa hàng và đổi trả', NULL, 3),
            (3, NULL, 'restaurants', N'Nhà hàng và ăn uống', NULL, 4),
            (3, NULL, 'home_services', N'Nhà ở và dịch vụ đời sống', NULL, 5),
            (3, NULL, 'travel', N'Sân bay, khách sạn và du lịch', NULL, 6),
            (3, NULL, 'transportation', N'Tàu xe và đi lại hằng ngày', NULL, 7),
            (3, NULL, 'recruitment', N'Tuyển dụng, lương và phúc lợi', NULL, 8),
            (3, NULL, 'training', N'Đào tạo và nhân viên mới', NULL, 9),
            (3, NULL, 'maintenance', N'Sự cố, bảo trì và xây dựng', NULL, 10),
            (3, NULL, 'marketing', N'Marketing, bán hàng và khách hàng', NULL, 11),
            (3, NULL, 'accounting', N'Kế toán, hóa đơn và ngân sách', NULL, 12),
            (3, NULL, 'technology', N'Công nghệ, IT và website', NULL, 13),
            (3, NULL, 'events', N'Sự kiện, hội thảo và tiệc', NULL, 14),
            (3, NULL, 'public_services', N'Y tế và dịch vụ công', NULL, 15),
            (3, NULL, 'other', N'Chủ đề khác', NULL, 16),
            (4, NULL, 'appointments', N'Lịch hẹn, cuộc họp và tiến độ', NULL, 1),
            (4, NULL, 'orders', N'Đơn hàng, kho bãi và giao nhận', NULL, 2),
            (4, NULL, 'shopping', N'Mua sắm, cửa hàng và đổi trả', NULL, 3),
            (4, NULL, 'restaurants', N'Nhà hàng và ăn uống', NULL, 4),
            (4, NULL, 'travel', N'Sân bay, khách sạn và du lịch', NULL, 5),
            (4, NULL, 'recruitment', N'Tuyển dụng, lương và phúc lợi', NULL, 6),
            (4, NULL, 'training', N'Đào tạo và nhân viên mới', NULL, 7),
            (4, NULL, 'maintenance', N'Sự cố, bảo trì và xây dựng', NULL, 8),
            (4, NULL, 'marketing', N'Marketing, bán hàng và khách hàng', NULL, 9),
            (4, NULL, 'accounting', N'Kế toán, hóa đơn và ngân sách', NULL, 10),
            (4, NULL, 'technology', N'Công nghệ, IT và website', NULL, 11),
            (4, NULL, 'events', N'Sự kiện, hội thảo và tiệc', NULL, 12),
            (4, NULL, 'public_services', N'Y tế và dịch vụ công', NULL, 13),
            (4, NULL, 'news', N'Bản tin, thời tiết và giao thông', NULL, 14),
            (4, NULL, 'tours', N'Tham quan và thông báo tại chỗ', NULL, 15),
            (4, NULL, 'other', N'Chủ đề khác', NULL, 16),
            (5, 'part_of_speech', 'noun', N'Danh từ', NULL, 1),
            (5, 'part_of_speech', 'adjective', N'Tính từ', NULL, 2),
            (5, 'part_of_speech', 'adverb', N'Trạng từ', NULL, 3),
            (5, 'verb', 'tense', N'Thì', NULL, 1),
            (5, 'verb', 'subject_verb_agreement', N'Hòa hợp chủ ngữ, động từ', NULL, 2),
            (5, 'verb', 'active_passive_voice', N'Chủ động – Bị động', NULL, 3),
            (5, 'verb', 'gerund', N'Danh động từ', NULL, 4),
            (5, 'verb', 'imperative', N'Câu mệnh lệnh', NULL, 5),
            (5, 'verb', 'verb_form', N'Dạng động từ', NULL, 6),
            (5, 'other_grammar', 'pronoun', N'Đại từ', NULL, 1),
            (5, 'other_grammar', 'comparison', N'So sánh', NULL, 2),
            (5, 'other_grammar', 'conjunction_preposition', N'Liên từ, giới từ', NULL, 3),
            (5, 'other_grammar', 'relative_clause', N'Mệnh đề quan hệ', NULL, 4),
            (5, 'other_grammar', 'conditional_sentence', N'Câu điều kiện', NULL, 5),
            (5, 'other_grammar', 'adverbial_clause', N'Mệnh đề trạng ngữ', NULL, 6),
            (5, 'vocabulary', 'vocabulary_noun', N'Danh từ', NULL, 1),
            (5, 'vocabulary', 'vocabulary_verb', N'Động từ', NULL, 2),
            (5, 'vocabulary', 'vocabulary_adverb', N'Trạng từ', NULL, 3),
            (5, 'vocabulary', 'vocabulary_adjective', N'Tính từ', NULL, 4),
            (5, 'vocabulary', 'vocabulary_preposition', N'Giới từ', NULL, 5),
            (5, 'vocabulary', 'vocabulary_conjunction', N'Liên từ', NULL, 6),
            (5, 'vocabulary', 'vocabulary_conjunctive_adverb', N'Trạng từ liên kết', NULL, 7),
            (5, 'vocabulary', 'vocabulary_phrasal_verb', N'Cụm động từ', NULL, 8),
            (6, NULL, 'email', N'Email', N'Email', 1),
            (6, NULL, 'article', N'Bài báo', N'Article, press release, newsletter', 2),
            (6, NULL, 'notice_announcement', N'Thông báo', N'Notice, announcement', 3),
            (6, NULL, 'advertisement', N'Quảng cáo', N'Advertisement, flyer, brochure', 4),
            (6, NULL, 'memo', N'Thư nội bộ', N'Memo', 5),
            (6, NULL, 'information_instructions', N'Hướng dẫn và thông tin', N'Information, instructions', 6),
            (6, NULL, 'letter', N'Thư', N'Letter', 7),
            (6, NULL, 'web_page_review', N'Trang web và đánh giá', N'Web page, review, blog', 8),
            (7, 'single_passage', 'email', N'Email', N'E-mail', 1),
            (7, 'single_passage', 'article', N'Bài báo', N'Article, Press release, Newsletter', 2),
            (7, 'single_passage', 'notice_announcement', N'Thông báo', N'Notice, Announcement, Invitation', 3),
            (7, 'single_passage', 'text_message', N'Tin nhắn', N'Text message, Chat', 4),
            (7, 'single_passage', 'online_chat', N'Chat trực tuyến', N'Online chat, Discussion', 5),
            (7, 'single_passage', 'form_schedule_invoice', N'Biểu mẫu, lịch & hóa đơn', N'Form, Schedule, Invoice, Receipt', 6),
            (7, 'single_passage', 'advertisement', N'Quảng cáo', N'Advertisement, Brochure, Coupon', 7),
            (7, 'single_passage', 'web_page_review', N'Trang web & đánh giá', N'Web page, Review, Blog', 8),
            (7, 'single_passage', 'letter', N'Thư', N'Letter', 9),
            (7, 'single_passage', 'memo', N'Thư nội bộ', N'Memo', 10),
            (7, 'single_passage', 'information_instructions', N'Hướng dẫn & thông tin', N'Information, Instructions, Policy', 11),
            (7, 'single_passage', 'job_posting', N'Tuyển dụng', N'Job advertisement, Job posting', 12),
            (7, 'double_passage', 'email_form', N'Email + Bảng biểu/hóa đơn', N'E-mail + form/schedule/invoice', 1),
            (7, 'double_passage', 'email_web_page', N'Email + Trang web/đánh giá', N'E-mail + web page/review', 2),
            (7, 'double_passage', 'email_notice_letter_memo', N'Email + Thông báo/thư/memo', N'E-mail + notice/letter/memo', 3),
            (7, 'double_passage', 'email_article', N'Email + Bài báo', N'E-mail + article', 4),
            (7, 'double_passage', 'email_advertisement_job_posting', N'Email + Quảng cáo/công tác tuyển dụng', N'E-mail + advertisement/job posting', 5),
            (7, 'double_passage', 'email_email', N'Email + Email', N'E-mails', 6),
            (7, 'double_passage', 'web_page_other_text', N'Trang web/đánh giá + văn bản khác', N'Web page/review + other text', 7),
            (7, 'double_passage', 'double_other_combination', N'Kiểu ghép khác', N'Other combinations', 8),
            (7, 'triple_passage', 'two_emails_form', N'2 Email + Bảng biểu/hóa đơn', N'E-mails + form/schedule/invoice', 1),
            (7, 'triple_passage', 'two_emails_web_page', N'2 Email + Trang web/đánh giá', N'E-mails + web page/review', 2),
            (7, 'triple_passage', 'two_emails_other_text', N'2 Email + văn bản khác', N'E-mails + article/notice/...', 3),
            (7, 'triple_passage', 'email_form_web_page', N'Email + Bảng biểu + Trang web', N'E-mail + form + web page', 4),
            (7, 'triple_passage', 'email_form_article', N'Email + Bảng biểu + Bài báo', N'E-mail + form + article', 5),
            (7, 'triple_passage', 'email_form_other_text', N'Email + Bảng biểu + văn bản khác', N'E-mail + form + other text', 6),
            (7, 'triple_passage', 'email_two_other_texts', N'Email + 2 văn bản khác', N'1 E-mail + 2 other texts', 7),
            (7, 'triple_passage', 'web_page_other_texts', N'Trang web/đánh giá + văn bản khác', N'Web page/review + other texts', 8),
            (7, 'triple_passage', 'triple_other_combination', N'Kiểu ghép khác', N'Other combinations', 9)
         ) AS v (PartNo, ParentCode, Code, NameVi, NameEn, SortOrder)
    LEFT JOIN dbo.QuestionCategory p ON p.PartNo = v.PartNo AND p.Code = v.ParentCode;
END;

-- 6. GrammarTopic: 15 chủ điểm = 15 loại ngữ pháp của Part 5 (từ loại, động từ, ngữ pháp khác)
IF NOT EXISTS (SELECT 1 FROM dbo.GrammarTopic)
    INSERT dbo.GrammarTopic (CategoryId, PartNo, SortOrder)
    SELECT c.CategoryId, 5, CAST(ROW_NUMBER() OVER (ORDER BY p.SortOrder, c.SortOrder) AS TINYINT)
    FROM dbo.QuestionCategory c
    JOIN dbo.QuestionCategory p ON p.CategoryId = c.ParentCategoryId AND p.PartNo = 5
    WHERE c.PartNo = 5 AND p.Code IN ('part_of_speech', 'verb', 'other_grammar');

-- 7. ScoreConversion (202 dòng: 101 mức x 2 kỹ năng, từ toeic_conversion_tables.csv)
IF NOT EXISTS (SELECT 1 FROM dbo.ScoreConversion)
    INSERT dbo.ScoreConversion (Skill, CorrectCount, ScaledScore)
    VALUES ('LISTENING', 0, 5), ('READING', 0, 5), ('LISTENING', 1, 5), ('READING', 1, 5),
        ('LISTENING', 2, 5), ('READING', 2, 5), ('LISTENING', 3, 5), ('READING', 3, 5),
        ('LISTENING', 4, 10), ('READING', 4, 10), ('LISTENING', 5, 10), ('READING', 5, 10),
        ('LISTENING', 6, 10), ('READING', 6, 10), ('LISTENING', 7, 10), ('READING', 7, 10),
        ('LISTENING', 8, 10), ('READING', 8, 10), ('LISTENING', 9, 15), ('READING', 9, 15),
        ('LISTENING', 10, 15), ('READING', 10, 15), ('LISTENING', 11, 15), ('READING', 11, 15),
        ('LISTENING', 12, 20), ('READING', 12, 15), ('LISTENING', 13, 20), ('READING', 13, 20),
        ('LISTENING', 14, 20), ('READING', 14, 20), ('LISTENING', 15, 25), ('READING', 15, 20),
        ('LISTENING', 16, 25), ('READING', 16, 25), ('LISTENING', 17, 30), ('READING', 17, 25),
        ('LISTENING', 18, 30), ('READING', 18, 30), ('LISTENING', 19, 35), ('READING', 19, 30),
        ('LISTENING', 20, 35), ('READING', 20, 35), ('LISTENING', 21, 40), ('READING', 21, 35),
        ('LISTENING', 22, 45), ('READING', 22, 40), ('LISTENING', 23, 45), ('READING', 23, 40),
        ('LISTENING', 24, 50), ('READING', 24, 45), ('LISTENING', 25, 55), ('READING', 25, 50),
        ('LISTENING', 26, 60), ('READING', 26, 50), ('LISTENING', 27, 65), ('READING', 27, 55),
        ('LISTENING', 28, 70), ('READING', 28, 60), ('LISTENING', 29, 75), ('READING', 29, 65),
        ('LISTENING', 30, 80), ('READING', 30, 70), ('LISTENING', 31, 85), ('READING', 31, 75),
        ('LISTENING', 32, 95), ('READING', 32, 80), ('LISTENING', 33, 100), ('READING', 33, 85),
        ('LISTENING', 34, 105), ('READING', 34, 90), ('LISTENING', 35, 115), ('READING', 35, 100),
        ('LISTENING', 36, 125), ('READING', 36, 105), ('LISTENING', 37, 130), ('READING', 37, 110),
        ('LISTENING', 38, 140), ('READING', 38, 120), ('LISTENING', 39, 150), ('READING', 39, 125),
        ('LISTENING', 40, 155), ('READING', 40, 135), ('LISTENING', 41, 165), ('READING', 41, 140),
        ('LISTENING', 42, 175), ('READING', 42, 150), ('LISTENING', 43, 185), ('READING', 43, 155),
        ('LISTENING', 44, 195), ('READING', 44, 165), ('LISTENING', 45, 205), ('READING', 45, 175),
        ('LISTENING', 46, 215), ('READING', 46, 185), ('LISTENING', 47, 230), ('READING', 47, 195),
        ('LISTENING', 48, 240), ('READING', 48, 205), ('LISTENING', 49, 250), ('READING', 49, 215),
        ('LISTENING', 50, 260), ('READING', 50, 225), ('LISTENING', 51, 270), ('READING', 51, 230),
        ('LISTENING', 52, 280), ('READING', 52, 240), ('LISTENING', 53, 290), ('READING', 53, 250),
        ('LISTENING', 54, 300), ('READING', 54, 260), ('LISTENING', 55, 310), ('READING', 55, 270),
        ('LISTENING', 56, 320), ('READING', 56, 280), ('LISTENING', 57, 330), ('READING', 57, 290),
        ('LISTENING', 58, 340), ('READING', 58, 300), ('LISTENING', 59, 350), ('READING', 59, 310),
        ('LISTENING', 60, 360), ('READING', 60, 320), ('LISTENING', 61, 370), ('READING', 61, 330),
        ('LISTENING', 62, 375), ('READING', 62, 340), ('LISTENING', 63, 385), ('READING', 63, 345),
        ('LISTENING', 64, 390), ('READING', 64, 355), ('LISTENING', 65, 400), ('READING', 65, 365),
        ('LISTENING', 66, 405), ('READING', 66, 370), ('LISTENING', 67, 410), ('READING', 67, 380),
        ('LISTENING', 68, 420), ('READING', 68, 385), ('LISTENING', 69, 425), ('READING', 69, 395),
        ('LISTENING', 70, 430), ('READING', 70, 400), ('LISTENING', 71, 435), ('READING', 71, 405),
        ('LISTENING', 72, 440), ('READING', 72, 415), ('LISTENING', 73, 445), ('READING', 73, 420),
        ('LISTENING', 74, 450), ('READING', 74, 425), ('LISTENING', 75, 450), ('READING', 75, 430),
        ('LISTENING', 76, 455), ('READING', 76, 435), ('LISTENING', 77, 460), ('READING', 77, 440),
        ('LISTENING', 78, 460), ('READING', 78, 445), ('LISTENING', 79, 465), ('READING', 79, 450),
        ('LISTENING', 80, 470), ('READING', 80, 450), ('LISTENING', 81, 470), ('READING', 81, 455),
        ('LISTENING', 82, 475), ('READING', 82, 460), ('LISTENING', 83, 475), ('READING', 83, 465),
        ('LISTENING', 84, 475), ('READING', 84, 465), ('LISTENING', 85, 480), ('READING', 85, 470),
        ('LISTENING', 86, 480), ('READING', 86, 470), ('LISTENING', 87, 480), ('READING', 87, 475),
        ('LISTENING', 88, 485), ('READING', 88, 475), ('LISTENING', 89, 485), ('READING', 89, 480),
        ('LISTENING', 90, 485), ('READING', 90, 480), ('LISTENING', 91, 490), ('READING', 91, 485),
        ('LISTENING', 92, 490), ('READING', 92, 485), ('LISTENING', 93, 490), ('READING', 93, 485),
        ('LISTENING', 94, 490), ('READING', 94, 490), ('LISTENING', 95, 490), ('READING', 95, 490),
        ('LISTENING', 96, 490), ('READING', 96, 490), ('LISTENING', 97, 495), ('READING', 97, 490),
        ('LISTENING', 98, 495), ('READING', 98, 495), ('LISTENING', 99, 495), ('READING', 99, 495),
        ('LISTENING', 100, 495), ('READING', 100, 495);

-- 8. ExamDirection: 9 hướng dẫn mặc định dùng chung mọi đề (2 phần thi + 7 Part). File audio và hình thêm sau vào Media.
IF NOT EXISTS (SELECT 1 FROM dbo.ExamDirection)
    INSERT dbo.ExamDirection (ExamId, DirectionKind, Skill, PartNo, DirectionsEn, DirectionsVi, ExampleEn, ExampleVi)
    VALUES (NULL, 'SECTION', 'LISTENING', NULL, N'In the Listening test, you will be asked to demonstrate how well you understand spoken English. The entire Listening test will last approximately 45 minutes. There are four parts, and directions are given for each part. You must mark your answers on the separate answer sheet. Do not write your answers in your test book.', N'Trong phần thi Nghe, bạn sẽ được yêu cầu thể hiện mức độ hiểu tiếng Anh nói của mình. Toàn bộ phần thi Nghe kéo dài khoảng 45 phút. Có bốn phần, và hướng dẫn được đưa ra cho từng phần. Bạn phải đánh dấu câu trả lời trên phiếu trả lời riêng. Không viết câu trả lời vào sách đề thi.', NULL, NULL),
        (NULL, 'PART', NULL, 1, N'Directions: For each question in this part, you will hear four statements about a picture in your test book. When you hear the statements, you must select the one statement that best describes what you see in the picture. Then find the number of the question on your answer sheet and mark your answer. The statements will not be printed in your test book and will be spoken only one time.', N'Hướng dẫn: Với mỗi câu hỏi trong phần này, bạn sẽ nghe bốn câu mô tả về một bức tranh trong sách đề thi. Khi nghe các câu, bạn phải chọn câu mô tả đúng nhất những gì bạn thấy trong tranh. Sau đó tìm số câu hỏi trên phiếu trả lời và đánh dấu đáp án. Các câu mô tả sẽ không được in trong sách đề thi và chỉ được đọc một lần.', N'Statement (C), "They''re sitting at a table," is the best description of the picture, so you should select answer (C) and mark it on your answer sheet.', N'Câu (C) "They''re sitting at a table" (Họ đang ngồi ở bàn) mô tả bức tranh đúng nhất, nên bạn chọn đáp án (C) và đánh dấu trên phiếu trả lời.'),
        (NULL, 'PART', NULL, 2, N'Directions: You will hear a question or statement and three responses spoken in English. They will not be printed in your test book and will be spoken only one time. Select the best response to the question or statement and mark the letter (A), (B), or (C) on your answer sheet.', N'Hướng dẫn: Bạn sẽ nghe một câu hỏi hoặc một câu nói và ba phản hồi bằng tiếng Anh. Chúng sẽ không được in trong sách đề thi và chỉ được đọc một lần. Chọn phản hồi phù hợp nhất với câu hỏi hoặc câu nói và đánh dấu chữ cái (A), (B) hoặc (C) trên phiếu trả lời.', NULL, NULL),
        (NULL, 'PART', NULL, 3, N'Directions: You will hear some conversations between two or more people. You will be asked to answer three questions about what the speakers say in each conversation. Select the best response to each question and mark the letter (A), (B), (C), or (D) on your answer sheet. The conversations will not be printed in your test book and will be spoken only one time.', N'Hướng dẫn: Bạn sẽ nghe một số đoạn hội thoại giữa hai người trở lên. Bạn sẽ phải trả lời ba câu hỏi về nội dung người nói trong mỗi đoạn hội thoại. Chọn đáp án phù hợp nhất cho mỗi câu hỏi và đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời. Các đoạn hội thoại sẽ không được in trong sách đề thi và chỉ được đọc một lần.', NULL, NULL),
        (NULL, 'PART', NULL, 4, N'Directions: You will hear some talks given by a single speaker. You will be asked to answer three questions about what the speaker says in each talk. Select the best response to each question and mark the letter (A), (B), (C), or (D) on your answer sheet. The talks will not be printed in your test book and will be spoken only one time.', N'Hướng dẫn: Bạn sẽ nghe một số bài nói do một người nói thực hiện. Bạn sẽ phải trả lời ba câu hỏi về nội dung người nói trong mỗi bài nói. Chọn đáp án phù hợp nhất cho mỗi câu hỏi và đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời. Các bài nói sẽ không được in trong sách đề thi và chỉ được đọc một lần.', NULL, NULL),
        (NULL, 'SECTION', 'READING', NULL, N'In the Reading test, you will read a variety of texts and answer several different types of reading comprehension questions. The entire Reading test will last 75 minutes. There are three parts, and directions are given for each part. You are encouraged to answer as many questions as you can within the time allowed. You must mark your answers on the separate answer sheet. Do not write your answers in your test book.', N'Trong phần thi Đọc, bạn sẽ đọc nhiều loại văn bản và trả lời nhiều dạng câu hỏi đọc hiểu khác nhau. Toàn bộ phần thi Đọc kéo dài 75 phút. Có ba phần, và hướng dẫn được đưa ra cho từng phần. Bạn nên trả lời càng nhiều câu càng tốt trong thời gian cho phép. Bạn phải đánh dấu câu trả lời trên phiếu trả lời riêng. Không viết câu trả lời vào sách đề thi.', NULL, NULL),
        (NULL, 'PART', NULL, 5, N'Directions: A word or phrase is missing in each of the sentences below. Four answer choices are given below each sentence. Select the best answer to complete the sentence. Then mark the letter (A), (B), (C), or (D) on your answer sheet.', N'Hướng dẫn: Mỗi câu dưới đây bị thiếu một từ hoặc cụm từ. Bốn đáp án được cho bên dưới mỗi câu. Chọn đáp án đúng nhất để hoàn thành câu. Sau đó đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời.', NULL, NULL),
        (NULL, 'PART', NULL, 6, N'Directions: Read the texts that follow. A word, phrase, or sentence is missing in parts of each text. Four answer choices for each question are given below the text. Select the best answer to complete the text. Then mark the letter (A), (B), (C), or (D) on your answer sheet.', N'Hướng dẫn: Đọc các đoạn văn sau. Mỗi đoạn văn bị thiếu một từ, cụm từ hoặc câu ở một số chỗ. Bốn đáp án cho mỗi câu hỏi được cho bên dưới đoạn văn. Chọn đáp án đúng nhất để hoàn thành đoạn văn. Sau đó đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời.', NULL, NULL),
        (NULL, 'PART', NULL, 7, N'Directions: In this part you will read a selection of texts, such as magazine and newspaper articles, e-mails, and instant messages. Each text or set of texts is followed by several questions. Select the best answer for each question and mark the letter (A), (B), (C), or (D) on your answer sheet.', N'Hướng dẫn: Trong phần này, bạn sẽ đọc một số văn bản như bài báo, tạp chí, email và tin nhắn nhanh. Mỗi văn bản hoặc nhóm văn bản được theo sau bởi một số câu hỏi. Chọn đáp án đúng nhất cho mỗi câu hỏi và đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời.', NULL, NULL);

COMMIT TRANSACTION;
GO

-- Kiểm tra số dòng sau khi nhập (cột Dat = OK nếu đúng kỳ vọng)
SELECT TableName, ActualRows, ExpectedRows, CASE WHEN ActualRows = ExpectedRows THEN 'OK' ELSE 'SAI' END AS Dat
FROM (
    SELECT 'PartSetting' AS TableName, (SELECT COUNT(*) FROM dbo.PartSetting) AS ActualRows, 7 AS ExpectedRows
    UNION ALL SELECT 'LevelBand', (SELECT COUNT(*) FROM dbo.LevelBand), 4
    UNION ALL SELECT 'PartOfSpeech', (SELECT COUNT(*) FROM dbo.PartOfSpeech), 7
    UNION ALL SELECT 'SpecialTag', (SELECT COUNT(*) FROM dbo.SpecialTag), 5
    UNION ALL SELECT 'QuestionCategory', (SELECT COUNT(*) FROM dbo.QuestionCategory), 119
    UNION ALL SELECT 'GrammarTopic', (SELECT COUNT(*) FROM dbo.GrammarTopic), 15
    UNION ALL SELECT 'ScoreConversion', (SELECT COUNT(*) FROM dbo.ScoreConversion), 202
    UNION ALL SELECT 'ExamDirection (mặc định)', (SELECT COUNT(*) FROM dbo.ExamDirection WHERE ExamId IS NULL), 9
) t;
GO
