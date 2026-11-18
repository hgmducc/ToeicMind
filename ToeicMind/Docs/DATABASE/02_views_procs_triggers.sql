/* =====================================================================
   02_views_procs_triggers.sql — View, thủ tục xuất bản, trigger chặn xóa cứng
   Chạy sau 01_schema.sql. Có thể chạy lại nhiều lần (CREATE OR ALTER).
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

/* ---------- VIEW ---------- */

-- Số nhóm và số câu thực tế của từng Part trong từng đề
CREATE OR ALTER VIEW dbo.vw_ExamPartSummary AS
SELECT g.ExamId,
       g.PartNo,
       COUNT(DISTINCT g.GroupId) AS GroupCount,
       COUNT(q.QuestionId)       AS QuestionCount
FROM dbo.QuestionGroup g
JOIN dbo.Question q ON q.GroupId = g.GroupId AND q.IsDeleted = 0
WHERE g.IsDeleted = 0
GROUP BY g.ExamId, g.PartNo;
GO

-- Kết quả theo Part của từng lần làm bài (thay cho bảng AttemptPartResult đã bỏ)
CREATE OR ALTER VIEW dbo.vw_AttemptPartResult AS
SELECT aa.AttemptId,
       g.PartNo,
       COUNT(*)                                       AS TotalQuestions,
       SUM(CASE WHEN aa.IsCorrect = 1 THEN 1 ELSE 0 END) AS CorrectCount
FROM dbo.AttemptAnswer aa
JOIN dbo.Question q      ON q.QuestionId = aa.QuestionId
JOIN dbo.QuestionGroup g ON g.GroupId = q.GroupId
GROUP BY aa.AttemptId, g.PartNo;
GO

-- Các Part của lần làm bài và việc bài làm có phủ đủ một kỹ năng hay không (dùng cho quy đổi điểm, BR-07)
CREATE OR ALTER VIEW dbo.vw_AttemptSummary AS
SELECT a.AttemptId,
       a.UserId,
       a.ExamId,
       a.Mode,
       a.Scope,
       a.[Status],
       p.Parts,
       ISNULL(p.ListeningAnswered, 0) AS ListeningQuestions,
       ISNULL(p.ReadingAnswered, 0)   AS ReadingQuestions,
       CASE WHEN a.ExamId IS NOT NULL AND ISNULL(p.ListeningAnswered, 0) > 0
             AND ISNULL(p.ListeningAnswered, 0) = ISNULL(e.ListeningTotal, -1) THEN 1 ELSE 0 END AS CoversAllListening,
       CASE WHEN a.ExamId IS NOT NULL AND ISNULL(p.ReadingAnswered, 0) > 0
             AND ISNULL(p.ReadingAnswered, 0) = ISNULL(e.ReadingTotal, -1) THEN 1 ELSE 0 END AS CoversAllReading
FROM dbo.Attempt a
OUTER APPLY (
    SELECT STRING_AGG(CAST(r.PartNo AS VARCHAR(1)), ',') WITHIN GROUP (ORDER BY r.PartNo) AS Parts,
           SUM(CASE WHEN r.PartNo <= 4 THEN r.TotalQuestions ELSE 0 END) AS ListeningAnswered,
           SUM(CASE WHEN r.PartNo >= 5 THEN r.TotalQuestions ELSE 0 END) AS ReadingAnswered
    FROM dbo.vw_AttemptPartResult r
    WHERE r.AttemptId = a.AttemptId
) p
OUTER APPLY (
    SELECT SUM(CASE WHEN s.PartNo <= 4 THEN s.QuestionCount ELSE 0 END) AS ListeningTotal,
           SUM(CASE WHEN s.PartNo >= 5 THEN s.QuestionCount ELSE 0 END) AS ReadingTotal
    FROM dbo.vw_ExamPartSummary s
    WHERE s.ExamId = a.ExamId
) e;
GO

-- Từ vựng xuất hiện ở đề nào (qua câu hỏi hoặc qua clip của nhóm đề gốc)
CREATE OR ALTER VIEW dbo.vw_VocabularyExam AS
SELECT vc.VocabId, q.ExamId
FROM dbo.VocabularyContext vc
JOIN dbo.Question q ON q.QuestionId = vc.QuestionId AND q.IsDeleted = 0
WHERE vc.IsDeleted = 0
UNION
SELECT vc.VocabId, g.ExamId
FROM dbo.VocabularyContext vc
JOIN dbo.ListeningClip c ON c.ClipId = vc.ClipId AND c.IsDeleted = 0
JOIN dbo.ListeningItem i ON i.ItemId = c.ItemId AND i.IsDeleted = 0 AND i.GroupId IS NOT NULL
JOIN dbo.QuestionGroup g ON g.GroupId = i.GroupId
WHERE vc.IsDeleted = 0;
GO

-- Hướng dẫn hiệu lực của từng đề: bản riêng của đề nếu có, không thì bản mặc định
CREATE OR ALTER VIEW dbo.vw_ExamDirectionEffective AS
SELECT e.ExamId,d.DirectionKind,d.Skill,d.PartNo,d.DirectionId,d.DirectionsEn,d.DirectionsVi,d.ExampleEn,d.ExampleVi,
    CONVERT(BIT,CASE WHEN d.ExamId IS NULL THEN 0 ELSE 1 END) AS IsOverridden
FROM dbo.Exam e
CROSS APPLY(VALUES('SECTION','LISTENING',NULL),('SECTION','READING',NULL),
    ('PART',NULL,1),('PART',NULL,2),('PART',NULL,3),('PART',NULL,4),('PART',NULL,5),('PART',NULL,6),('PART',NULL,7)) k(DirectionKind,Skill,PartNo)
CROSS APPLY(SELECT TOP(1) source.* FROM dbo.ExamDirection source
    WHERE source.IsDeleted=0 AND (source.ExamId=e.ExamId OR source.ExamId IS NULL)
        AND source.DirectionKind=k.DirectionKind AND ISNULL(source.Skill,'')=ISNULL(k.Skill,'') AND ISNULL(source.PartNo,0)=ISNULL(k.PartNo,0)
    ORDER BY CASE WHEN source.ExamId=e.ExamId THEN 0 ELSE 1 END) d
WHERE e.IsDeleted=0;
GO

-- Bộ đề: chỉ hiển thị cho người học khi có đề xuất bản đang hoạt động.
CREATE OR ALTER VIEW dbo.vw_ExamSetSummary AS
SELECT s.ExamSetId,s.Name,s.Description,s.IsDeleted,COUNT(e.ExamId) AS ExamCount,
    SUM(CASE WHEN e.Status='PUBLISHED' THEN 1 ELSE 0 END) AS PublishedExamCount,
    CONVERT(BIT,CASE WHEN s.IsDeleted=0 AND SUM(CASE WHEN e.Status='PUBLISHED' THEN 1 ELSE 0 END)>0 THEN 1 ELSE 0 END) AS IsVisible
FROM dbo.ExamSet s LEFT JOIN dbo.Exam e ON e.ExamSetId=s.ExamSetId AND e.IsDeleted=0
GROUP BY s.ExamSetId,s.Name,s.Description,s.IsDeleted;
GO

CREATE OR ALTER FUNCTION dbo.fn_ExamHasHistory(@ExamId INT) RETURNS BIT
AS
BEGIN
    RETURN CASE WHEN EXISTS(SELECT 1 FROM dbo.Attempt WHERE ExamId=@ExamId)
        OR EXISTS(SELECT 1 FROM dbo.AttemptAnswer a JOIN dbo.Question q ON q.QuestionId=a.QuestionId WHERE q.ExamId=@ExamId)
        THEN 1 ELSE 0 END;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ValidateExam @ExamId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @issues TABLE(Code NVARCHAR(80) NOT NULL, Message NVARCHAR(1000) NOT NULL, PartNo TINYINT NULL, GroupId INT NULL, QuestionId INT NULL);
    IF NOT EXISTS(SELECT 1 FROM dbo.Exam e JOIN dbo.ExamSet s ON s.ExamSetId=e.ExamSetId WHERE e.ExamId=@ExamId AND e.IsDeleted=0 AND s.IsDeleted=0)
    BEGIN
        INSERT @issues(Code,Message) VALUES('EXAM_NOT_FOUND',N'Không tìm thấy đề hoặc bộ đề đang hoạt động.');
        SELECT * FROM @issues;
        RETURN;
    END;
    INSERT @issues(Code,Message,PartNo)
    SELECT 'PART_QUESTION_COUNT',CONCAT(N'Part ',p.PartNo,N' cần ',p.StandardQuestionCount,N' câu, hiện có ',COUNT(q.QuestionId),N'.'),p.PartNo
    FROM dbo.PartSetting p
    LEFT JOIN dbo.QuestionGroup g ON g.ExamId=@ExamId AND g.PartNo=p.PartNo AND g.IsDeleted=0
    LEFT JOIN dbo.Question q ON q.GroupId=g.GroupId AND q.IsDeleted=0
    GROUP BY p.PartNo,p.StandardQuestionCount HAVING COUNT(q.QuestionId)<>p.StandardQuestionCount;

    INSERT @issues(Code,Message,PartNo,GroupId)
    SELECT 'GROUP_SIZE_INVALID',N'Số câu trong nhóm chưa đúng cấu trúc Part.',g.PartNo,g.GroupId
    FROM dbo.QuestionGroup g LEFT JOIN dbo.Question q ON q.GroupId=g.GroupId AND q.IsDeleted=0
    WHERE g.ExamId=@ExamId AND g.IsDeleted=0
    GROUP BY g.GroupId,g.PartNo
    HAVING (g.PartNo IN (1,2,5) AND COUNT(q.QuestionId)<>1) OR (g.PartNo IN (3,4) AND COUNT(q.QuestionId)<>3)
        OR (g.PartNo=6 AND COUNT(q.QuestionId)<>4) OR (g.PartNo=7 AND COUNT(q.QuestionId) NOT BETWEEN 2 AND 5);
    INSERT @issues(Code,Message,PartNo,GroupId)
    SELECT 'GROUP_ORDER_INVALID',N'Thứ tự nhóm phải bằng câu nhỏ nhất, các câu trong nhóm phải liên tiếp.',g.PartNo,g.GroupId
    FROM dbo.QuestionGroup g JOIN dbo.Question q ON q.GroupId=g.GroupId AND q.IsDeleted=0
    WHERE g.ExamId=@ExamId AND g.IsDeleted=0 GROUP BY g.GroupId,g.PartNo,g.GroupOrder
    HAVING g.GroupOrder<>MIN(q.QuestionNo) OR MAX(q.QuestionNo)-MIN(q.QuestionNo)+1<>COUNT(q.QuestionId);
    INSERT @issues(Code,Message,PartNo,GroupId)
    SELECT 'CATEGORY_NOT_LEAF',N'Phân loại phải là nút lá đang hoạt động của đúng Part.',g.PartNo,g.GroupId
    FROM dbo.QuestionGroup g JOIN dbo.QuestionCategory c ON c.CategoryId=g.CategoryId
    WHERE g.ExamId=@ExamId AND g.IsDeleted=0 AND (c.IsActive=0 OR c.PartNo<>g.PartNo OR EXISTS(SELECT 1 FROM dbo.QuestionCategory child WHERE child.ParentCategoryId=c.CategoryId));
    INSERT @issues(Code,Message,PartNo,GroupId)
    SELECT 'GROUP_TRANSLATION_REQUIRED',N'Nhóm thiếu bản dịch tiếng Việt.',PartNo,GroupId FROM dbo.QuestionGroup
    WHERE ExamId=@ExamId AND IsDeleted=0 AND NULLIF(LTRIM(RTRIM(TranslationVi)),N'') IS NULL;
    INSERT @issues(Code,Message,PartNo,GroupId)
    SELECT 'TRANSCRIPT_REQUIRED',N'Listening thiếu transcript.',PartNo,GroupId FROM dbo.QuestionGroup
    WHERE ExamId=@ExamId AND IsDeleted=0 AND PartNo BETWEEN 1 AND 4 AND NULLIF(LTRIM(RTRIM(TranscriptEn)),N'') IS NULL;
    INSERT @issues(Code,Message,PartNo,GroupId)
    SELECT 'PASSAGE_REQUIRED',N'Part 6/7 thiếu đoạn văn.',PartNo,GroupId FROM dbo.QuestionGroup
    WHERE ExamId=@ExamId AND IsDeleted=0 AND PartNo IN (6,7) AND NULLIF(LTRIM(RTRIM(PassageHtml)),N'') IS NULL;
    INSERT @issues(Code,Message,PartNo,GroupId)
    SELECT 'GROUP_LEVEL_REQUIRED',N'Nhóm thiếu độ khó.',PartNo,GroupId FROM dbo.QuestionGroup
    WHERE ExamId=@ExamId AND IsDeleted=0 AND PartNo IN (3,4,6,7) AND GroupLevelNo IS NULL;
    INSERT @issues(Code,Message,PartNo,GroupId)
    SELECT 'AUDIO_REQUIRED',N'Nhóm Listening thiếu audio.',g.PartNo,g.GroupId FROM dbo.QuestionGroup g
    WHERE g.ExamId=@ExamId AND g.IsDeleted=0 AND g.PartNo BETWEEN 1 AND 4
        AND NOT EXISTS(SELECT 1 FROM dbo.Media m WHERE m.GroupId=g.GroupId AND m.MediaType='AUDIO' AND m.IsDeleted=0);
    INSERT @issues(Code,Message,PartNo,GroupId)
    SELECT 'IMAGE_REQUIRED',N'Nhóm Part 1 hoặc nhóm có cờ hình/bảng thiếu hình.',g.PartNo,g.GroupId FROM dbo.QuestionGroup g
    WHERE g.ExamId=@ExamId AND g.IsDeleted=0 AND (g.PartNo=1 OR EXISTS(SELECT 1 FROM dbo.QuestionGroupTag gt JOIN dbo.SpecialTag t ON t.SpecialTagId=gt.SpecialTagId WHERE gt.GroupId=g.GroupId AND t.Code='chart_or_table'))
        AND NOT EXISTS(SELECT 1 FROM dbo.Media m WHERE m.GroupId=g.GroupId AND m.MediaType='IMAGE' AND m.IsDeleted=0);

    INSERT @issues(Code,Message,PartNo,GroupId,QuestionId)
    SELECT 'QUESTION_CONTENT_REQUIRED',CONCAT(N'Câu ',q.QuestionNo,N' thiếu độ khó, giải thích hoặc giải thích phương án.'),g.PartNo,g.GroupId,q.QuestionId
    FROM dbo.Question q JOIN dbo.QuestionGroup g ON g.GroupId=q.GroupId
    WHERE g.ExamId=@ExamId AND g.IsDeleted=0 AND q.IsDeleted=0 AND (q.LevelNo IS NULL OR NULLIF(LTRIM(RTRIM(q.Explanation)),N'') IS NULL OR NULLIF(LTRIM(RTRIM(q.OptionExplanations)),N'') IS NULL);
    INSERT @issues(Code,Message,PartNo,GroupId,QuestionId)
    SELECT 'QUESTION_TEXT_REQUIRED',CONCAT(N'Câu ',q.QuestionNo,N' thiếu nội dung.'),g.PartNo,g.GroupId,q.QuestionId
    FROM dbo.Question q JOIN dbo.QuestionGroup g ON g.GroupId=q.GroupId
    WHERE g.ExamId=@ExamId AND g.IsDeleted=0 AND q.IsDeleted=0 AND g.PartNo IN (2,3,4,5,7) AND NULLIF(LTRIM(RTRIM(q.QuestionText)),N'') IS NULL;
    INSERT @issues(Code,Message,PartNo,GroupId,QuestionId)
    SELECT 'QUESTION_NUMBER_INVALID',CONCAT(N'Số câu ',q.QuestionNo,N' không thuộc phạm vi Part.'),g.PartNo,g.GroupId,q.QuestionId
    FROM dbo.Question q JOIN dbo.QuestionGroup g ON g.GroupId=q.GroupId
    WHERE g.ExamId=@ExamId AND g.IsDeleted=0 AND q.IsDeleted=0 AND q.QuestionNo NOT BETWEEN
        CASE g.PartNo WHEN 1 THEN 1 WHEN 2 THEN 7 WHEN 3 THEN 32 WHEN 4 THEN 71 WHEN 5 THEN 101 WHEN 6 THEN 131 ELSE 147 END AND
        CASE g.PartNo WHEN 1 THEN 6 WHEN 2 THEN 31 WHEN 3 THEN 70 WHEN 4 THEN 100 WHEN 5 THEN 130 WHEN 6 THEN 146 ELSE 200 END;
    INSERT @issues(Code,Message,PartNo,GroupId,QuestionId)
    SELECT 'OPTIONS_INVALID',CONCAT(N'Câu ',q.QuestionNo,N' cần đủ phương án có nội dung và đúng một đáp án đúng.'),g.PartNo,g.GroupId,q.QuestionId
    FROM dbo.Question q JOIN dbo.QuestionGroup g ON g.GroupId=q.GroupId JOIN dbo.PartSetting p ON p.PartNo=g.PartNo
    LEFT JOIN dbo.QuestionOption o ON o.QuestionId=q.QuestionId
    WHERE g.ExamId=@ExamId AND g.IsDeleted=0 AND q.IsDeleted=0
    GROUP BY q.QuestionId,q.QuestionNo,g.PartNo,g.GroupId,p.OptionCount
    HAVING COUNT(o.OptionId)<>p.OptionCount OR SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END)<>1
        OR SUM(CASE WHEN o.OptionId IS NOT NULL AND (NULLIF(LTRIM(RTRIM(o.OptionText)),N'') IS NULL OR (g.PartNo=2 AND o.OptionLabel='D')) THEN 1 ELSE 0 END)>0;

    IF (SELECT COUNT(*) FROM (SELECT DirectionKind,Skill,PartNo,DirectionsEn,
        ROW_NUMBER() OVER(PARTITION BY DirectionKind,Skill,PartNo ORDER BY CASE WHEN ExamId=@ExamId THEN 0 ELSE 1 END) AS rn
        FROM dbo.ExamDirection WHERE IsDeleted=0 AND (ExamId=@ExamId OR ExamId IS NULL)) d
        WHERE rn=1 AND NULLIF(LTRIM(RTRIM(DirectionsEn)),N'') IS NOT NULL)<>9
        INSERT @issues(Code,Message) VALUES('DIRECTIONS_INCOMPLETE',N'Đề cần đủ 9 mục hướng dẫn hiệu lực (2 Section và 7 Part).');
    SELECT * FROM @issues ORDER BY PartNo,GroupId,QuestionId,Code;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PublishExam @ExamId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    BEGIN TRANSACTION;
    DECLARE @issues TABLE(Code NVARCHAR(80) NOT NULL, Message NVARCHAR(1000) NOT NULL, PartNo TINYINT NULL, GroupId INT NULL, QuestionId INT NULL);
    INSERT @issues EXEC dbo.sp_ValidateExam @ExamId;
    IF NOT EXISTS(SELECT 1 FROM @issues)
        UPDATE dbo.Exam SET Status='PUBLISHED',UpdatedAt=SYSUTCDATETIME() WHERE ExamId=@ExamId AND IsDeleted=0;
    SELECT * FROM @issues;
    COMMIT;
    IF EXISTS(SELECT 1 FROM @issues) RETURN 1;
    RETURN 0;
END;

GO

/* ---------- TRIGGER CHẶN XÓA CỨNG NỘI DUNG (DB-DEC-02) ----------
   Nội dung do Admin quản lý chỉ được xóa mềm (UPDATE IsDeleted = 1, DeletedAt).
   Khi cần dọn dữ liệu thử trong môi trường phát triển:
       DISABLE TRIGGER dbo.TR_<Bảng>_BlockDelete ON dbo.<Bảng>;   -- sau đó ENABLE lại */

-- Hợp nhất tên trigger của các bản bổ sung trước đây, giữ đúng một trigger DELETE mỗi bảng.
IF OBJECT_ID(N'dbo.TR_ExamSet_BlockDelete',N'TR') IS NULL AND OBJECT_ID(N'dbo.tr_ExamSet_NoDelete',N'TR') IS NOT NULL
    EXEC sys.sp_rename N'dbo.tr_ExamSet_NoDelete',N'TR_ExamSet_BlockDelete',N'OBJECT';
IF OBJECT_ID(N'dbo.TR_Exam_BlockDelete',N'TR') IS NULL AND OBJECT_ID(N'dbo.tr_Exam_NoDelete',N'TR') IS NOT NULL
    EXEC sys.sp_rename N'dbo.tr_Exam_NoDelete',N'TR_Exam_BlockDelete',N'OBJECT';
GO
CREATE OR ALTER TRIGGER dbo.TR_ExamSet_BlockDelete ON dbo.ExamSet
INSTEAD OF DELETE AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010,N'Bảng ExamSet: chỉ được xóa mềm.',1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_Exam_BlockDelete ON dbo.Exam
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng Exam: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_ExamDirection_BlockDelete ON dbo.ExamDirection
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng ExamDirection: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_QuestionGroup_BlockDelete ON dbo.QuestionGroup
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng QuestionGroup: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_Question_BlockDelete ON dbo.Question
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng Question: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_Media_BlockDelete ON dbo.Media
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng Media: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_GrammarArticle_BlockDelete ON dbo.GrammarArticle
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng GrammarArticle: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_ListeningItem_BlockDelete ON dbo.ListeningItem
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng ListeningItem: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_ListeningClip_BlockDelete ON dbo.ListeningClip
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng ListeningClip: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_Vocabulary_BlockDelete ON dbo.Vocabulary
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng Vocabulary: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_VocabularyRelation_BlockDelete ON dbo.VocabularyRelation
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng VocabularyRelation: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_VocabularyContext_BlockDelete ON dbo.VocabularyContext
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng VocabularyContext: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_VocabularyGroup_BlockDelete ON dbo.VocabularyGroup
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, N'Bảng VocabularyGroup: chỉ được xóa mềm (UPDATE IsDeleted = 1), lệnh DELETE bị chặn.', 1;
END;
GO

PRINT N'02_views_procs_triggers.sql: 6 views, 2 procedures, 1 function and 13 delete-blocking triggers ready.';
GO
