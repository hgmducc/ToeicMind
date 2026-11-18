/* =====================================================================
   01_schema.sql — TOEIC Learning System (baseline đã triển khai, cập nhật nghiệp vụ v1.3)
   Hệ quản trị: SQL Server 2017 trở lên (dùng STRING_AGG, CREATE OR ALTER)
   Existing database: 01_schema -> 02_views_procs_triggers -> 03_seed; skip 00_create_database.
   Quy ước: PK_/FK_/UQ_/CK_/DF_/UX_ (unique có điều kiện)/IX_ + tên bảng
   Thời gian lưu giờ UTC. Nội dung do Admin quản lý chỉ xóa mềm (IsDeleted).
   Database có sẵn: cập nhật tại chỗ; không DROP/CREATE database hoặc bảng có sẵn.
   Có thể chạy lại: giữ dữ liệu/ID; chỉ thêm đối tượng còn thiếu và ALTER phần cần đổi.
   Phần A: bảng | Phần B: khóa ngoại | Phần C: index | Phần D: VIP/VNPay | Phần E: cá nhân hóa | Phần F: lịch sử VIP
   Đã gộp: CHG-005 (UserVocabProgress, StudyDay.VocabReviewCount) và CHG-003 (index tải đề/API học tập).
   CHG-006: cột quyền FREE/VIP, VipPlan, PaymentOrder và gói VIP mặc định khi bảng còn trống.
   CHG-007: LearnerProfile, PlacementTest, PlacementTestGroup, PlacementAttempt; Attempt nhận Scope = PLACEMENT.
   CHG-008: VipHistory (mua gói / quản trị viên tặng / thu hồi VIP), bổ sung lịch sử cho các đơn đã thanh toán.
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

-- Đề cũ có dữ liệu phải có mapping bộ/mã được duyệt; không tự tạo mã hay gán bộ.
IF OBJECT_ID(N'dbo.Exam',N'U') IS NOT NULL
   AND (COL_LENGTH(N'dbo.Exam',N'ExamSetId') IS NULL OR COL_LENGTH(N'dbo.Exam',N'ExamCode') IS NULL)
    EXEC(N'IF EXISTS(SELECT 1 FROM dbo.Exam) THROW 51003, N''Đề cũ có dữ liệu: cần mapping ExamSetId/ExamCode trước khi nâng cấp.'', 1;');
GO
BEGIN TRANSACTION;
GO


/* ===================== PHẦN A. BẢNG ===================== */

-- A1. Người dùng
IF OBJECT_ID(N'dbo.Users',N'U') IS NULL
CREATE TABLE dbo.Users (
    UserId        INT IDENTITY(1,1) NOT NULL,
    Username      NVARCHAR(100) NOT NULL,
    Email         NVARCHAR(255) NOT NULL,
    PasswordHash  NVARCHAR(255) NULL, -- tài khoản chỉ đăng nhập Google
    GoogleId      NVARCHAR(100) NULL,
    [Role]        VARCHAR(10)   NOT NULL CONSTRAINT DF_Users_Role DEFAULT ('LEARNER'),
    [Status]      VARCHAR(10)   NOT NULL CONSTRAINT DF_Users_Status DEFAULT ('ACTIVE'),
    CreatedAt     DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_Role CHECK ([Role] IN ('LEARNER','ADMIN')),
    CONSTRAINT CK_Users_Status CHECK ([Status] IN ('ACTIVE','LOCKED'))
);
GO

-- A1.2. Refresh Token
IF OBJECT_ID(N'dbo.RefreshTokens',N'U') IS NULL
CREATE TABLE dbo.RefreshTokens (
    RefreshTokenId BIGINT IDENTITY(1,1) NOT NULL,
    UserId         INT NOT NULL,
    TokenHash      CHAR(64) NOT NULL,

    CreatedAt      DATETIME2 NOT NULL
        CONSTRAINT DF_RefreshTokens_CreatedAt
        DEFAULT (SYSUTCDATETIME()),

    ExpiresAt      DATETIME2 NOT NULL,
    RevokedAt      DATETIME2 NULL,

    CONSTRAINT PK_RefreshTokens
        PRIMARY KEY (RefreshTokenId),

    CONSTRAINT FK_RefreshTokens_Users
        FOREIGN KEY (UserId)
        REFERENCES dbo.Users(UserId)
        ON DELETE CASCADE,

    CONSTRAINT UQ_RefreshTokens_TokenHash
        UNIQUE (TokenHash),

    CONSTRAINT CK_RefreshTokens_ExpiresAt
        CHECK (ExpiresAt > CreatedAt)
);
GO

-- Tăng tốc truy vấn Refresh Token theo người dùng
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.RefreshTokens') AND name=N'IX_RefreshTokens_UserId')
CREATE INDEX IX_RefreshTokens_UserId ON dbo.RefreshTokens(UserId);
GO

-- A1.3. OTP quên mật khẩu (hash HMAC, không lưu OTP gốc)
IF OBJECT_ID(N'dbo.PasswordResetOtps',N'U') IS NULL
CREATE TABLE dbo.PasswordResetOtps (
    OtpId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PasswordResetOtps PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL, OtpHash CHAR(64) NOT NULL, ExpiresAt DATETIME2 NOT NULL,
    AttemptsCount INT NOT NULL CONSTRAINT DF_PasswordResetOtps_Attempts DEFAULT(0),
    IsUsed BIT NOT NULL CONSTRAINT DF_PasswordResetOtps_IsUsed DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PasswordResetOtps_CreatedAt DEFAULT(SYSUTCDATETIME())
);
GO

-- A2. Danh mục và cấu hình (seed)
IF OBJECT_ID(N'dbo.PartSetting',N'U') IS NULL
CREATE TABLE dbo.PartSetting (
    PartNo                    TINYINT       NOT NULL,
    PartName                  NVARCHAR(100) NOT NULL,
    Skill                     VARCHAR(10)   NOT NULL,
    StandardQuestionCount     SMALLINT      NOT NULL,
    OptionCount               TINYINT       NOT NULL,
    DefaultSecondsPerQuestion SMALLINT      NULL,
    AudioPlayLimit            TINYINT       NULL,
    CONSTRAINT PK_PartSetting PRIMARY KEY (PartNo),
    CONSTRAINT CK_PartSetting_PartNo CHECK (PartNo BETWEEN 1 AND 7),
    CONSTRAINT CK_PartSetting_Skill CHECK ((PartNo <= 4 AND Skill = 'LISTENING') OR (PartNo >= 5 AND Skill = 'READING')),
    CONSTRAINT CK_PartSetting_Count CHECK (StandardQuestionCount > 0),
    CONSTRAINT CK_PartSetting_Options CHECK (OptionCount IN (3, 4)),
    CONSTRAINT CK_PartSetting_Seconds CHECK (DefaultSecondsPerQuestion IS NULL OR DefaultSecondsPerQuestion > 0),
    CONSTRAINT CK_PartSetting_AudioLimit CHECK (AudioPlayLimit IS NULL OR AudioPlayLimit > 0)
);
GO

IF OBJECT_ID(N'dbo.LevelBand',N'U') IS NULL
CREATE TABLE dbo.LevelBand (
    LevelNo    TINYINT      NOT NULL,
    NameVi     NVARCHAR(50) NOT NULL,
    ShortLabel NVARCHAR(20) NOT NULL,
    CONSTRAINT PK_LevelBand PRIMARY KEY (LevelNo),
    CONSTRAINT CK_LevelBand_LevelNo CHECK (LevelNo BETWEEN 1 AND 4)
);
GO

IF OBJECT_ID(N'dbo.PartOfSpeech',N'U') IS NULL
CREATE TABLE dbo.PartOfSpeech (
    PosCode VARCHAR(10)  NOT NULL,
    NameVi  NVARCHAR(50) NOT NULL,
    CONSTRAINT PK_PartOfSpeech PRIMARY KEY (PosCode)
);
GO

IF OBJECT_ID(N'dbo.ScoreConversion',N'U') IS NULL
CREATE TABLE dbo.ScoreConversion (
    Skill        VARCHAR(10) NOT NULL,
    CorrectCount SMALLINT    NOT NULL,
    ScaledScore  SMALLINT    NOT NULL,
    CONSTRAINT PK_ScoreConversion PRIMARY KEY (Skill, CorrectCount),
    CONSTRAINT CK_ScoreConversion_Skill CHECK (Skill IN ('LISTENING','READING')),
    CONSTRAINT CK_ScoreConversion_Count CHECK (CorrectCount BETWEEN 0 AND 100),
    CONSTRAINT CK_ScoreConversion_Score CHECK (ScaledScore BETWEEN 5 AND 495)
);
GO

IF OBJECT_ID(N'dbo.QuestionCategory',N'U') IS NULL
CREATE TABLE dbo.QuestionCategory (
    CategoryId       INT IDENTITY(1,1) NOT NULL,
    PartNo           TINYINT       NOT NULL,
    ParentCategoryId INT           NULL,
    Code             VARCHAR(50)   NOT NULL,
    NameVi           NVARCHAR(100) NOT NULL,
    NameEn           NVARCHAR(200) NULL,
    SortOrder        SMALLINT      NOT NULL,
    IsActive         BIT           NOT NULL CONSTRAINT DF_QuestionCategory_IsActive DEFAULT (1),
    CONSTRAINT PK_QuestionCategory PRIMARY KEY (CategoryId),
    CONSTRAINT UQ_QuestionCategory_PartCode UNIQUE (PartNo, Code),
    CONSTRAINT UQ_QuestionCategory_IdPart UNIQUE (CategoryId, PartNo)
);
GO

IF OBJECT_ID(N'dbo.SpecialTag',N'U') IS NULL
CREATE TABLE dbo.SpecialTag (
    SpecialTagId INT IDENTITY(1,1) NOT NULL,
    PartNo       TINYINT       NOT NULL,
    Code         VARCHAR(50)   NOT NULL,
    NameVi       NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_SpecialTag PRIMARY KEY (SpecialTagId),
    CONSTRAINT UQ_SpecialTag_PartCode UNIQUE (PartNo, Code),
    CONSTRAINT UQ_SpecialTag_IdPart UNIQUE (SpecialTagId, PartNo)
);
GO

-- A3. Đề thi và câu hỏi
IF OBJECT_ID(N'dbo.ExamSet',N'U') IS NULL
CREATE TABLE dbo.ExamSet (
    ExamSetId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ExamSet PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL, Description NVARCHAR(1000) NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_ExamSet_IsDeleted DEFAULT(0), DeletedAt DATETIME2 NULL,
    CreatedBy INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamSet_CreatedAt DEFAULT(SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExamSet_UpdatedAt DEFAULT(SYSUTCDATETIME()),
    CONSTRAINT CK_ExamSet_Name CHECK(LEN(LTRIM(RTRIM(Name)))>0),
    CONSTRAINT CK_ExamSet_Deleted CHECK((IsDeleted=0 AND DeletedAt IS NULL) OR (IsDeleted=1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.Exam',N'U') IS NULL
CREATE TABLE dbo.Exam (
    ExamId       INT IDENTITY(1,1) NOT NULL,
    ExamSetId    INT NOT NULL,
    ExamCode     VARCHAR(30) NOT NULL,
    Title        NVARCHAR(200)  NOT NULL,
    [Description] NVARCHAR(1000) NULL,
    [Status]     VARCHAR(10)    NOT NULL CONSTRAINT DF_Exam_Status DEFAULT ('DRAFT'),
    IsPublic     BIT            NOT NULL CONSTRAINT DF_Exam_IsPublic DEFAULT (0),
    IsDeleted     BIT NOT NULL CONSTRAINT DF_Exam_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedBy    INT            NOT NULL,
    CreatedAt     DATETIME2 NOT NULL CONSTRAINT DF_Exam_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2 NOT NULL CONSTRAINT DF_Exam_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Exam PRIMARY KEY (ExamId),
    CONSTRAINT CK_Exam_Status CHECK ([Status] IN ('DRAFT','PUBLISHED')),
    CONSTRAINT CK_Exam_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.ExamDirection',N'U') IS NULL
CREATE TABLE dbo.ExamDirection (
    DirectionId   INT IDENTITY(1,1) NOT NULL,
    ExamId        INT           NULL,          -- NULL = bản mặc định dùng chung mọi đề
    DirectionKind VARCHAR(10)   NOT NULL,
    Skill         VARCHAR(10)   NULL,
    PartNo        TINYINT       NULL,
    DirectionsEn  NVARCHAR(MAX) NOT NULL,
    DirectionsVi  NVARCHAR(MAX) NULL,
    ExampleEn     NVARCHAR(MAX) NULL,
    ExampleVi     NVARCHAR(MAX) NULL,
    IsDeleted     BIT NOT NULL CONSTRAINT DF_ExamDirection_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedAt     DATETIME2 NOT NULL CONSTRAINT DF_ExamDirection_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2 NOT NULL CONSTRAINT DF_ExamDirection_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ExamDirection PRIMARY KEY (DirectionId),
    -- Lưu ý: phải ghi rõ IS NOT NULL, vì CHECK cho kết quả "không xác định" với NULL sẽ vẫn được chấp nhận
    CONSTRAINT CK_ExamDirection_Kind CHECK (
        (DirectionKind = 'SECTION' AND Skill IS NOT NULL AND Skill IN ('LISTENING','READING') AND PartNo IS NULL)
     OR (DirectionKind = 'PART' AND PartNo IS NOT NULL AND PartNo BETWEEN 1 AND 7 AND Skill IS NULL)),
    CONSTRAINT CK_ExamDirection_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.QuestionGroup',N'U') IS NULL
CREATE TABLE dbo.QuestionGroup (
    GroupId       INT IDENTITY(1,1) NOT NULL,
    ExamId        INT           NOT NULL,
    PartNo        TINYINT       NOT NULL,      -- nguồn duy nhất cho Part của câu hỏi
    GroupOrder    SMALLINT      NOT NULL,
    CategoryId    INT           NOT NULL,
    GroupLevelNo  TINYINT       NULL,
    PassageHtml   NVARCHAR(MAX) NULL,
    TranscriptEn  NVARCHAR(MAX) NULL,
    TranslationVi NVARCHAR(MAX) NULL,
    IsDeleted     BIT NOT NULL CONSTRAINT DF_QuestionGroup_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedAt     DATETIME2 NOT NULL CONSTRAINT DF_QuestionGroup_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2 NOT NULL CONSTRAINT DF_QuestionGroup_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_QuestionGroup PRIMARY KEY (GroupId),
    CONSTRAINT UQ_QuestionGroup_IdPart UNIQUE (GroupId, PartNo),
    CONSTRAINT UQ_QuestionGroup_IdExam UNIQUE (GroupId, ExamId),
    CONSTRAINT CK_QuestionGroup_Order CHECK (GroupOrder > 0),
    CONSTRAINT CK_QuestionGroup_Level CHECK (GroupLevelNo IS NULL OR PartNo IN (3,4,6,7)),
    CONSTRAINT CK_QuestionGroup_Passage CHECK (PassageHtml IS NULL OR PartNo IN (6,7)),
    CONSTRAINT CK_QuestionGroup_Transcript CHECK (TranscriptEn IS NULL OR PartNo BETWEEN 1 AND 4),
    CONSTRAINT CK_QuestionGroup_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.QuestionGroupTag',N'U') IS NULL
CREATE TABLE dbo.QuestionGroupTag (
    GroupId      INT     NOT NULL,
    SpecialTagId INT     NOT NULL,
    PartNo       TINYINT NOT NULL,             -- cột "bắt cầu": cờ và nhóm cùng Part
    CONSTRAINT PK_QuestionGroupTag PRIMARY KEY (GroupId, SpecialTagId)
);
GO

IF OBJECT_ID(N'dbo.Media',N'U') IS NULL
CREATE TABLE dbo.Media (
    MediaId         INT IDENTITY(1,1) NOT NULL,
    GroupId         INT           NULL,
    PartNo          TINYINT       NULL,        -- cột "bắt cầu", chỉ có khi GroupId có giá trị
    ClipId          INT           NULL,
    DirectionId     INT           NULL,
    MediaType       VARCHAR(10)   NOT NULL,
    StorageKey      NVARCHAR(500) NOT NULL,    -- khóa lưu trữ tương đối, ví dụ audio/job-xxx.mp3
    MimeType        VARCHAR(100)  NULL, -- legacy, API v1.3 chỉ lưu StorageKey
    FileSizeBytes   BIGINT        NULL, -- legacy, giữ dữ liệu cũ
    DurationSeconds DECIMAL(7,2)  NULL,
    AltText         NVARCHAR(300) NULL,
    SortOrder       TINYINT       NOT NULL CONSTRAINT DF_Media_SortOrder DEFAULT (1),
    IsDeleted     BIT NOT NULL CONSTRAINT DF_Media_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedAt       DATETIME2     NOT NULL CONSTRAINT DF_Media_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Media PRIMARY KEY (MediaId),
    CONSTRAINT UQ_Media_StorageKey UNIQUE (StorageKey),
    CONSTRAINT CK_Media_Type CHECK (MediaType IN ('AUDIO','IMAGE')),
    CONSTRAINT CK_Media_Size CHECK (FileSizeBytes >= 0),
    CONSTRAINT CK_Media_OneOwner CHECK (
        (CASE WHEN GroupId IS NULL THEN 0 ELSE 1 END
       + CASE WHEN ClipId IS NULL THEN 0 ELSE 1 END
       + CASE WHEN DirectionId IS NULL THEN 0 ELSE 1 END) = 1),
    CONSTRAINT CK_Media_PartWithGroup CHECK ((GroupId IS NULL AND PartNo IS NULL) OR (GroupId IS NOT NULL AND PartNo IS NOT NULL)),
    CONSTRAINT CK_Media_ClipAudio CHECK (ClipId IS NULL OR MediaType = 'AUDIO'),
    CONSTRAINT CK_Media_GroupAudioListening CHECK (GroupId IS NULL OR MediaType = 'IMAGE' OR PartNo BETWEEN 1 AND 4),
    CONSTRAINT CK_Media_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.Question',N'U') IS NULL
CREATE TABLE dbo.Question (
    QuestionId     INT IDENTITY(1,1) NOT NULL,
    GroupId        INT           NOT NULL,
    ExamId         INT           NOT NULL,     -- cột "bắt cầu": câu luôn cùng đề với nhóm
    QuestionNo     SMALLINT      NOT NULL,
    LevelNo        TINYINT       NULL,
    QuestionText   NVARCHAR(MAX) NULL,
    QuestionTextVi NVARCHAR(MAX) NULL,
    Explanation    NVARCHAR(MAX) NULL,
    OptionExplanations NVARCHAR(MAX) NULL,         -- bắt buộc khi xuất bản (sp_PublishExam)
    IsDeleted     BIT NOT NULL CONSTRAINT DF_Question_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedAt     DATETIME2 NOT NULL CONSTRAINT DF_Question_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2 NOT NULL CONSTRAINT DF_Question_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Question PRIMARY KEY (QuestionId),
    CONSTRAINT CK_Question_No CHECK (QuestionNo > 0),
    CONSTRAINT CK_Question_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.QuestionOption',N'U') IS NULL
CREATE TABLE dbo.QuestionOption (
    OptionId      INT IDENTITY(1,1) NOT NULL,
    QuestionId    INT            NOT NULL,
    OptionLabel   CHAR(1)        NOT NULL,
    OptionText    NVARCHAR(1000) NOT NULL,
    OptionNoteVi  NVARCHAR(500)  NULL,
    IsCorrect     BIT            NOT NULL CONSTRAINT DF_QuestionOption_IsCorrect DEFAULT (0),
    CONSTRAINT PK_QuestionOption PRIMARY KEY (OptionId),
    CONSTRAINT UQ_QuestionOption_QuestionLabel UNIQUE (QuestionId, OptionLabel),
    CONSTRAINT UQ_QuestionOption_IdQuestion UNIQUE (OptionId, QuestionId),
    CONSTRAINT CK_QuestionOption_Label CHECK (OptionLabel IN ('A','B','C','D'))
);
GO

-- A4. Ngữ pháp
IF OBJECT_ID(N'dbo.GrammarTopic',N'U') IS NULL
CREATE TABLE dbo.GrammarTopic (
    GrammarTopicId INT IDENTITY(1,1) NOT NULL,
    CategoryId     INT           NOT NULL,
    PartNo         TINYINT       NOT NULL CONSTRAINT DF_GrammarTopic_PartNo DEFAULT (5),
    SortOrder      TINYINT       NOT NULL,
    Summary        NVARCHAR(500) NULL,
    CONSTRAINT PK_GrammarTopic PRIMARY KEY (GrammarTopicId),
    CONSTRAINT UQ_GrammarTopic_Category UNIQUE (CategoryId),
    CONSTRAINT CK_GrammarTopic_Part5 CHECK (PartNo = 5)
);
GO

IF OBJECT_ID(N'dbo.GrammarArticle',N'U') IS NULL
CREATE TABLE dbo.GrammarArticle (
    ArticleId      INT IDENTITY(1,1) NOT NULL,
    GrammarTopicId INT           NOT NULL,
    Title          NVARCHAR(200) NOT NULL,
    Content        NVARCHAR(MAX) NOT NULL,
    SortOrder      SMALLINT      NOT NULL CONSTRAINT DF_GrammarArticle_SortOrder DEFAULT (1),
    IsDeleted     BIT NOT NULL CONSTRAINT DF_GrammarArticle_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedAt     DATETIME2 NOT NULL CONSTRAINT DF_GrammarArticle_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2 NOT NULL CONSTRAINT DF_GrammarArticle_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_GrammarArticle PRIMARY KEY (ArticleId),
    CONSTRAINT CK_GrammarArticle_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

-- A5. Luyện nghe clip
IF OBJECT_ID(N'dbo.ListeningItem',N'U') IS NULL
CREATE TABLE dbo.ListeningItem (
    ItemId       INT IDENTITY(1,1) NOT NULL,
    PartNo       TINYINT       NOT NULL,
    GroupId      INT           NULL,           -- TH1: nhóm của đề gốc; TH2: NULL
    CategoryId   INT           NULL,           -- chỉ TH2
    LevelNo      TINYINT       NULL,           -- chỉ TH2
    SourceNote   NVARCHAR(200) NULL,
    ExternalKey  NVARCHAR(100) NULL,
    IsPublished  BIT           NOT NULL CONSTRAINT DF_ListeningItem_IsPublished DEFAULT (0),
    IsDeleted     BIT NOT NULL CONSTRAINT DF_ListeningItem_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedAt     DATETIME2 NOT NULL CONSTRAINT DF_ListeningItem_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2 NOT NULL CONSTRAINT DF_ListeningItem_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    SourceKind   AS (CASE WHEN GroupId IS NULL THEN 'STANDALONE' ELSE 'EXAM' END),
    CONSTRAINT PK_ListeningItem PRIMARY KEY (ItemId),
    CONSTRAINT UQ_ListeningItem_IdPart UNIQUE (ItemId, PartNo),
    CONSTRAINT CK_ListeningItem_Part CHECK (PartNo BETWEEN 1 AND 4),
    CONSTRAINT CK_ListeningItem_NoDuplicateClassification CHECK (GroupId IS NULL OR (CategoryId IS NULL AND LevelNo IS NULL)),
    CONSTRAINT CK_ListeningItem_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.ListeningClip',N'U') IS NULL
CREATE TABLE dbo.ListeningClip (
    ClipId        INT IDENTITY(1,1) NOT NULL,
    ItemId        INT              NOT NULL,
    PartNo        TINYINT          NOT NULL,   -- cột "bắt cầu"
    SeqNo         SMALLINT         NOT NULL,
    ClipRole      VARCHAR(10)      NOT NULL,
    TranscriptEn  NVARCHAR(1000)   NOT NULL,
    TranslationVi NVARCHAR(1000)   NULL,
    ExternalId    UNIQUEIDENTIFIER NULL,
    IsDeleted     BIT NOT NULL CONSTRAINT DF_ListeningClip_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedAt     DATETIME2        NOT NULL CONSTRAINT DF_ListeningClip_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ListeningClip PRIMARY KEY (ClipId),
    CONSTRAINT CK_ListeningClip_Seq CHECK (SeqNo > 0),
    CONSTRAINT CK_ListeningClip_RolePart CHECK (
        (PartNo = 1 AND ClipRole IN ('OPTION_A','OPTION_B','OPTION_C','OPTION_D'))
     OR (PartNo = 2 AND ClipRole IN ('QUESTION','OPTION_A','OPTION_B','OPTION_C'))
     OR (PartNo IN (3,4) AND ClipRole = 'SENTENCE')),
    CONSTRAINT CK_ListeningClip_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.UserListeningProgress',N'U') IS NULL
CREATE TABLE dbo.UserListeningProgress (
    UserId           INT          NOT NULL,
    ItemId           INT          NOT NULL,
    PracticeCount    INT          NOT NULL CONSTRAINT DF_ULP_PracticeCount DEFAULT (0),
    FirstPracticedAt DATETIME2    NOT NULL CONSTRAINT DF_ULP_First DEFAULT (SYSUTCDATETIME()),
    LastPracticedAt  DATETIME2    NOT NULL CONSTRAINT DF_ULP_Last DEFAULT (SYSUTCDATETIME()),
    LastMode         VARCHAR(20)  NULL,
    LastAccuracy     DECIMAL(5,2) NULL,
    BestAccuracy     DECIMAL(5,2) NULL,
    CONSTRAINT PK_UserListeningProgress PRIMARY KEY (UserId, ItemId),
    CONSTRAINT CK_ULP_Count CHECK (PracticeCount >= 0),
    CONSTRAINT CK_ULP_Accuracy CHECK ((LastAccuracy IS NULL OR LastAccuracy BETWEEN 0 AND 100) AND (BestAccuracy IS NULL OR BestAccuracy BETWEEN 0 AND 100))
);
GO

-- A6. Làm bài và tiến độ
IF OBJECT_ID(N'dbo.Attempt',N'U') IS NULL
CREATE TABLE dbo.Attempt (
    AttemptId        INT IDENTITY(1,1) NOT NULL,
    UserId           INT         NOT NULL,
    ExamId           INT         NULL,         -- NULL khi Scope = BANK
    Mode             VARCHAR(10) NOT NULL,     -- EXAM (Luyện thi) | PRACTICE (Luyện tập)
    Scope            VARCHAR(10) NOT NULL,     -- FULL | LISTENING | READING | PART | BANK
    [Status]         VARCHAR(12) NOT NULL CONSTRAINT DF_Attempt_Status DEFAULT ('IN_PROGRESS'),
    TimeLimitSeconds INT         NULL,
    StartedAt        DATETIME2   NOT NULL CONSTRAINT DF_Attempt_StartedAt DEFAULT (SYSUTCDATETIME()),
    SubmittedAt      DATETIME2   NULL,
    IsAutoSubmitted  BIT         NOT NULL CONSTRAINT DF_Attempt_IsAutoSubmitted DEFAULT (0),
    DirectionSeconds INT         NOT NULL CONSTRAINT DF_Attempt_DirectionSeconds DEFAULT (0),
    DurationSeconds  INT         NULL,
    TotalQuestions   SMALLINT    NOT NULL,
    CorrectCount     SMALLINT    NULL,
    ListeningScaled  SMALLINT    NULL,
    ReadingScaled    SMALLINT    NULL,
    TotalScaled      SMALLINT    NULL,
    IsDeleted     BIT NOT NULL CONSTRAINT DF_Attempt_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CONSTRAINT PK_Attempt PRIMARY KEY (AttemptId),
    CONSTRAINT CK_Attempt_Mode CHECK (Mode IN ('EXAM','PRACTICE')),
    CONSTRAINT CK_Attempt_Scope CHECK (Scope IN ('FULL','LISTENING','READING','PART','BANK')),
    CONSTRAINT CK_Attempt_Status CHECK ([Status] IN ('IN_PROGRESS','SUBMITTED','ABANDONED','ERROR')),
    CONSTRAINT CK_Attempt_ExamScope CHECK ((Scope = 'BANK' AND ExamId IS NULL) OR (Scope <> 'BANK' AND ExamId IS NOT NULL)),
    CONSTRAINT CK_Attempt_BankPractice CHECK (Scope <> 'BANK' OR Mode = 'PRACTICE'),
    CONSTRAINT CK_Attempt_ExamTime CHECK (Mode <> 'EXAM' OR TimeLimitSeconds IS NOT NULL),
    CONSTRAINT CK_Attempt_TimeLimit CHECK (TimeLimitSeconds IS NULL OR TimeLimitSeconds > 0),
    CONSTRAINT CK_Attempt_Direction CHECK (DirectionSeconds >= 0),
    CONSTRAINT CK_Attempt_Submitted CHECK ([Status] <> 'SUBMITTED' OR SubmittedAt IS NOT NULL),
    CONSTRAINT CK_Attempt_Counts CHECK (TotalQuestions >= 0 AND (CorrectCount IS NULL OR CorrectCount BETWEEN 0 AND TotalQuestions)),
    CONSTRAINT CK_Attempt_ScaledOnlySubmitted CHECK ([Status] = 'SUBMITTED' OR (ListeningScaled IS NULL AND ReadingScaled IS NULL AND TotalScaled IS NULL)),
    CONSTRAINT CK_Attempt_ScaledRange CHECK (
        (ListeningScaled IS NULL OR ListeningScaled BETWEEN 5 AND 495)
    AND (ReadingScaled IS NULL OR ReadingScaled BETWEEN 5 AND 495)),
    CONSTRAINT CK_Attempt_TotalScaled CHECK (TotalScaled IS NULL OR (ListeningScaled IS NOT NULL AND ReadingScaled IS NOT NULL AND TotalScaled = ListeningScaled + ReadingScaled)),
    CONSTRAINT CK_Attempt_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.AttemptAnswer',N'U') IS NULL
CREATE TABLE dbo.AttemptAnswer (
    AttemptAnswerId  BIGINT IDENTITY(1,1) NOT NULL,
    AttemptId        INT       NOT NULL,
    QuestionId       INT       NOT NULL,
    SelectedOptionId INT       NULL,           -- NULL = chưa trả lời
    IsCorrect        BIT       NULL,
    DisplayedAt      DATETIME2 NULL,
    AnsweredAt       DATETIME2 NULL,
    CONSTRAINT PK_AttemptAnswer PRIMARY KEY (AttemptAnswerId),
    CONSTRAINT UQ_AttemptAnswer_AttemptQuestion UNIQUE (AttemptId, QuestionId),
    CONSTRAINT CK_AttemptAnswer_Unanswered CHECK (SelectedOptionId IS NOT NULL OR IsCorrect IS NULL OR IsCorrect = 0)
);
GO

IF OBJECT_ID(N'dbo.UserQuestionProgress',N'U') IS NULL
CREATE TABLE dbo.UserQuestionProgress (
    UserId         INT       NOT NULL,
    QuestionId     INT       NOT NULL,
    LastIsCorrect  BIT       NOT NULL,
    LastAnsweredAt DATETIME2 NOT NULL CONSTRAINT DF_UQP_LastAnsweredAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_UserQuestionProgress PRIMARY KEY (UserId, QuestionId)
);
GO

-- A7. Từ vựng
IF OBJECT_ID(N'dbo.VocabTopic',N'U') IS NULL
CREATE TABLE dbo.VocabTopic (
    VocabTopicId INT IDENTITY(1,1) NOT NULL,
    Name         NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(300) NULL,
    CONSTRAINT PK_VocabTopic PRIMARY KEY (VocabTopicId),
    CONSTRAINT UQ_VocabTopic_Name UNIQUE (Name)
);
GO

IF OBJECT_ID(N'dbo.Vocabulary',N'U') IS NULL
CREATE TABLE dbo.Vocabulary (
    VocabId      INT IDENTITY(1,1) NOT NULL,
    Lemma        NVARCHAR(100)  NOT NULL,
    PosCode      VARCHAR(10)    NOT NULL,
    IpaUs        NVARCHAR(100)  NULL,
    IpaUk        NVARCHAR(100)  NULL,
    CefrLevel    CHAR(2)        NOT NULL,
    MeaningVi    NVARCHAR(500)  NOT NULL,
    DefinitionEn NVARCHAR(1000) NULL,
    VocabTopicId INT            NULL,          -- bắt buộc sau khi chốt danh sách chủ đề
    IsDeleted     BIT NOT NULL CONSTRAINT DF_Vocabulary_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedAt     DATETIME2 NOT NULL CONSTRAINT DF_Vocabulary_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2 NOT NULL CONSTRAINT DF_Vocabulary_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Vocabulary PRIMARY KEY (VocabId),
    CONSTRAINT UQ_Vocabulary_LemmaPos UNIQUE (Lemma, PosCode),   -- một từ chỉ một lần, không lọc xóa mềm
    CONSTRAINT CK_Vocabulary_Cefr CHECK (CefrLevel IN ('A1','A2','B1','B2','C1','C2')),
    CONSTRAINT CK_Vocabulary_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.VocabularyRelation',N'U') IS NULL
CREATE TABLE dbo.VocabularyRelation (
    RelationId       INT IDENTITY(1,1) NOT NULL,
    VocabId          INT           NOT NULL,
    RelationType     VARCHAR(12)   NOT NULL,
    RelatedText      NVARCHAR(200) NOT NULL,
    RelatedMeaningVi NVARCHAR(300) NULL,
    SortOrder        TINYINT       NOT NULL CONSTRAINT DF_VocabularyRelation_SortOrder DEFAULT (1),
    IsDeleted     BIT NOT NULL CONSTRAINT DF_VocabularyRelation_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CONSTRAINT PK_VocabularyRelation PRIMARY KEY (RelationId),
    CONSTRAINT CK_VocabularyRelation_Type CHECK (RelationType IN ('COLLOCATION','SYNONYM','ANTONYM','WORD_FAMILY')),
    CONSTRAINT CK_VocabularyRelation_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.VocabularyContext',N'U') IS NULL
CREATE TABLE dbo.VocabularyContext (
    ContextId   INT IDENTITY(1,1) NOT NULL,
    VocabId     INT            NOT NULL,
    QuestionId  INT            NULL,
    ClipId      INT            NULL,
    SurfaceForm NVARCHAR(100)  NULL,
    ContextMeaningVi NVARCHAR(500) NULL, -- nghĩa theo ngữ cảnh; MeaningVi ở Vocabulary là nghĩa gốc
    ExampleEn   NVARCHAR(1000) NULL,
    ExampleVi   NVARCHAR(1000) NULL,
    IsDeleted     BIT NOT NULL CONSTRAINT DF_VocabularyContext_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CONSTRAINT PK_VocabularyContext PRIMARY KEY (ContextId),
    CONSTRAINT CK_VocabularyContext_OneSource CHECK (QuestionId IS NULL OR ClipId IS NULL),
    CONSTRAINT CK_VocabularyContext_Surface CHECK (SurfaceForm IS NOT NULL OR (QuestionId IS NULL AND ClipId IS NULL)),
    CONSTRAINT CK_VocabularyContext_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.VocabularyGroup',N'U') IS NULL
CREATE TABLE dbo.VocabularyGroup (
    VocabGroupId INT IDENTITY(1,1) NOT NULL,
    Name         NVARCHAR(150) NOT NULL,
    VocabTopicId INT           NULL,
    [Description] NVARCHAR(500) NULL,
    IsPublished  BIT           NOT NULL CONSTRAINT DF_VocabularyGroup_IsPublished DEFAULT (0),
    IsDeleted     BIT NOT NULL CONSTRAINT DF_VocabularyGroup_IsDeleted DEFAULT (0),
    DeletedAt     DATETIME2 NULL,
    CreatedAt     DATETIME2 NOT NULL CONSTRAINT DF_VocabularyGroup_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt     DATETIME2 NOT NULL CONSTRAINT DF_VocabularyGroup_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_VocabularyGroup PRIMARY KEY (VocabGroupId),
    CONSTRAINT CK_VocabularyGroup_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL))
);
GO

IF OBJECT_ID(N'dbo.VocabularyGroupItem',N'U') IS NULL
CREATE TABLE dbo.VocabularyGroupItem (
    VocabGroupId INT      NOT NULL,
    VocabId      INT      NOT NULL,
    SortOrder    SMALLINT NOT NULL CONSTRAINT DF_VocabularyGroupItem_SortOrder DEFAULT (1),
    CONSTRAINT PK_VocabularyGroupItem PRIMARY KEY (VocabGroupId, VocabId)
);
GO

IF OBJECT_ID(N'dbo.UserVocabulary',N'U') IS NULL
CREATE TABLE dbo.UserVocabulary (
    UserVocabId        INT IDENTITY(1,1) NOT NULL,
    UserId             INT            NOT NULL,
    VocabId            INT            NULL,    -- từ có trong từ điển
    CustomWord         NVARCHAR(100)  NULL,    -- từ người học tự thêm
    CustomMeaning      NVARCHAR(500)  NULL,
    CustomExample      NVARCHAR(1000) NULL,
    SourceQuestionId   INT            NULL,
    SourceClipId       INT            NULL,
    SourceVocabGroupId INT            NULL,
    CreatedAt          DATETIME2      NOT NULL CONSTRAINT DF_UserVocabulary_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_UserVocabulary PRIMARY KEY (UserVocabId),
    CONSTRAINT CK_UserVocabulary_WordOrCustom CHECK (
        (VocabId IS NOT NULL AND CustomWord IS NULL AND CustomMeaning IS NULL AND CustomExample IS NULL)
     OR (VocabId IS NULL AND CustomWord IS NOT NULL AND CustomMeaning IS NOT NULL)),
    CONSTRAINT CK_UserVocabulary_OneSource CHECK (
        (CASE WHEN SourceQuestionId IS NULL THEN 0 ELSE 1 END
       + CASE WHEN SourceClipId IS NULL THEN 0 ELSE 1 END
       + CASE WHEN SourceVocabGroupId IS NULL THEN 0 ELSE 1 END) <= 1)
);
GO

-- A7.2. Tiến độ học từ vựng theo thuật toán lặp lại ngắt quãng (CHG-005, SM-2 cải biên)
IF OBJECT_ID(N'dbo.UserVocabProgress',N'U') IS NULL
CREATE TABLE dbo.UserVocabProgress (
    UserId         INT          NOT NULL,
    VocabId        INT          NOT NULL,
    [Status]       VARCHAR(10)  NOT NULL CONSTRAINT DF_UserVocabProgress_Status DEFAULT ('LEARNING'),  -- LEARNING | MASTERED (khoảng cách >= 21 ngày)
    Repetitions    SMALLINT     NOT NULL CONSTRAINT DF_UserVocabProgress_Reps DEFAULT (0),
    IntervalDays   INT          NOT NULL CONSTRAINT DF_UserVocabProgress_Interval DEFAULT (0),
    EaseFactor     DECIMAL(4,2) NOT NULL CONSTRAINT DF_UserVocabProgress_Ease DEFAULT (2.50),          -- 1.30 - 3.00
    Lapses         SMALLINT     NOT NULL CONSTRAINT DF_UserVocabProgress_Lapses DEFAULT (0),
    TotalReviews   INT          NOT NULL CONSTRAINT DF_UserVocabProgress_Total DEFAULT (0),
    CorrectReviews INT          NOT NULL CONSTRAINT DF_UserVocabProgress_Correct DEFAULT (0),
    LastGrade      TINYINT      NOT NULL CONSTRAINT DF_UserVocabProgress_Grade DEFAULT (0),           -- 0 Quên, 1 Khó, 2 Nhớ, 3 Dễ
    FirstSeenAt    DATETIME2    NOT NULL,
    LastReviewedAt DATETIME2    NOT NULL,
    NextReviewAt   DATETIME2    NOT NULL,
    CONSTRAINT PK_UserVocabProgress PRIMARY KEY (UserId, VocabId),
    CONSTRAINT CK_UserVocabProgress_Status CHECK ([Status] IN ('LEARNING','MASTERED')),
    CONSTRAINT CK_UserVocabProgress_Grade CHECK (LastGrade BETWEEN 0 AND 3)
);
GO

-- A8. Báo cáo và ngày học
IF OBJECT_ID(N'dbo.Report',N'U') IS NULL
CREATE TABLE dbo.Report (
    ReportId        INT IDENTITY(1,1) NOT NULL,
    ReporterId      INT            NULL,
    TargetType      VARCHAR(20)    NOT NULL,
    QuestionId      INT            NULL,
    VocabId         INT            NULL,
    ArticleId       INT            NULL,
    ListeningItemId INT            NULL,
    ErrorType       VARCHAR(20)    NOT NULL,
    [Description]   NVARCHAR(1000) NULL,
    [Status]        VARCHAR(12)    NOT NULL CONSTRAINT DF_Report_Status DEFAULT ('NEW'),
    AdminNote       NVARCHAR(1000) NULL,
    HandledBy       INT            NULL,
    CreatedAt       DATETIME2      NOT NULL CONSTRAINT DF_Report_CreatedAt DEFAULT (SYSUTCDATETIME()),
    HandledAt       DATETIME2      NULL,
    CONSTRAINT PK_Report PRIMARY KEY (ReportId),
    CONSTRAINT CK_Report_TargetType CHECK (TargetType IN ('QUESTION','VOCABULARY','GRAMMAR_ARTICLE','LISTENING_ITEM')),
    CONSTRAINT CK_Report_ErrorType CHECK (ErrorType IN ('WRONG_ANSWER','WRONG_EXPLANATION','MEDIA_ERROR','TYPO','OTHER')),
    CONSTRAINT CK_Report_Status CHECK ([Status] IN ('NEW','IN_PROGRESS','RESOLVED','REJECTED')),
    CONSTRAINT CK_Report_OtherNeedsDescription CHECK (ErrorType <> 'OTHER' OR [Description] IS NOT NULL),
    CONSTRAINT CK_Report_Target CHECK (
        (TargetType = 'QUESTION'        AND QuestionId IS NOT NULL AND VocabId IS NULL AND ArticleId IS NULL AND ListeningItemId IS NULL)
     OR (TargetType = 'VOCABULARY'      AND VocabId IS NOT NULL AND QuestionId IS NULL AND ArticleId IS NULL AND ListeningItemId IS NULL)
     OR (TargetType = 'GRAMMAR_ARTICLE' AND ArticleId IS NOT NULL AND QuestionId IS NULL AND VocabId IS NULL AND ListeningItemId IS NULL)
     OR (TargetType = 'LISTENING_ITEM'  AND ListeningItemId IS NOT NULL AND QuestionId IS NULL AND VocabId IS NULL AND ArticleId IS NULL))
);
GO

IF OBJECT_ID(N'dbo.StudyDay',N'U') IS NULL
CREATE TABLE dbo.StudyDay (
    UserId            INT      NOT NULL,
    StudyDate         DATE     NOT NULL,       -- theo múi giờ người học (giả định Asia/Ho_Chi_Minh)
    AttemptCount      SMALLINT NOT NULL CONSTRAINT DF_StudyDay_AttemptCount DEFAULT (0),
    ClipPracticeCount SMALLINT NOT NULL CONSTRAINT DF_StudyDay_ClipCount DEFAULT (0),
    VocabReviewCount  INT      NOT NULL CONSTRAINT DF_StudyDay_VocabReviewCount DEFAULT (0),
    CONSTRAINT PK_StudyDay PRIMARY KEY (UserId, StudyDate),
    CONSTRAINT CK_StudyDay_Counts CHECK (AttemptCount >= 0 AND ClipPracticeCount >= 0)
);
GO

/* ---------- CẬP NHẬT TẠI CHỖ TỪ BASELINE ĐÃ CHẠY ----------
   Không xóa cột legacy hoặc chuyển dữ liệu ngầm. */
IF COL_LENGTH(N'dbo.Users',N'GoogleId') IS NULL ALTER TABLE dbo.Users ADD GoogleId NVARCHAR(100) NULL;
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Users') AND name=N'PasswordHash' AND is_nullable=0)
    ALTER TABLE dbo.Users ALTER COLUMN PasswordHash NVARCHAR(255) NULL;
IF COL_LENGTH(N'dbo.Exam',N'ExamSetId') IS NULL ALTER TABLE dbo.Exam ADD ExamSetId INT NOT NULL;
IF COL_LENGTH(N'dbo.Exam',N'ExamCode') IS NULL ALTER TABLE dbo.Exam ADD ExamCode VARCHAR(30) NOT NULL;
IF COL_LENGTH(N'dbo.Question',N'OptionExplanations') IS NULL ALTER TABLE dbo.Question ADD OptionExplanations NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.StudyDay',N'VocabReviewCount') IS NULL ALTER TABLE dbo.StudyDay ADD VocabReviewCount INT NOT NULL CONSTRAINT DF_StudyDay_VocabReviewCount DEFAULT (0);
IF COL_LENGTH(N'dbo.VocabularyContext',N'ContextMeaningVi') IS NULL ALTER TABLE dbo.VocabularyContext ADD ContextMeaningVi NVARCHAR(500) NULL;
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Media') AND name=N'MimeType' AND is_nullable=0)
    ALTER TABLE dbo.Media ALTER COLUMN MimeType VARCHAR(100) NULL;
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Media') AND name=N'FileSizeBytes' AND is_nullable=0)
    ALTER TABLE dbo.Media ALTER COLUMN FileSizeBytes BIGINT NULL;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'CK_QuestionGroup_Transcript')
    ALTER TABLE dbo.QuestionGroup DROP CONSTRAINT CK_QuestionGroup_Transcript;
ALTER TABLE dbo.QuestionGroup WITH CHECK ADD CONSTRAINT CK_QuestionGroup_Transcript CHECK(TranscriptEn IS NULL OR PartNo BETWEEN 1 AND 4);
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'CK_QuestionGroup_Translation')
    ALTER TABLE dbo.QuestionGroup DROP CONSTRAINT CK_QuestionGroup_Translation;
GO

/* ===================== PHẦN B. KHÓA NGOẠI ===================== */
-- Mặc định NO ACTION; CASCADE chỉ cho dữ liệu của người học (phục vụ xóa dữ liệu cá nhân ở Version 2).

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.ExamSet') AND name=N'FK_ExamSet_Users')
ALTER TABLE dbo.ExamSet ADD CONSTRAINT FK_ExamSet_Users FOREIGN KEY(CreatedBy) REFERENCES dbo.Users(UserId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Exam') AND name=N'FK_Exam_ExamSet')
ALTER TABLE dbo.Exam ADD CONSTRAINT FK_Exam_ExamSet FOREIGN KEY(ExamSetId) REFERENCES dbo.ExamSet(ExamSetId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Exam') AND name=N'FK_Exam_CreatedBy')
ALTER TABLE dbo.Exam ADD CONSTRAINT FK_Exam_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users (UserId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.ExamDirection') AND name=N'FK_ExamDirection_Exam')
ALTER TABLE dbo.ExamDirection ADD CONSTRAINT FK_ExamDirection_Exam FOREIGN KEY (ExamId) REFERENCES dbo.Exam (ExamId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.ExamDirection') AND name=N'FK_ExamDirection_Part')
ALTER TABLE dbo.ExamDirection ADD CONSTRAINT FK_ExamDirection_Part FOREIGN KEY (PartNo) REFERENCES dbo.PartSetting (PartNo);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionCategory') AND name=N'FK_QuestionCategory_Part')
ALTER TABLE dbo.QuestionCategory ADD CONSTRAINT FK_QuestionCategory_Part FOREIGN KEY (PartNo) REFERENCES dbo.PartSetting (PartNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionCategory') AND name=N'FK_QuestionCategory_Parent')
ALTER TABLE dbo.QuestionCategory ADD CONSTRAINT FK_QuestionCategory_Parent FOREIGN KEY (ParentCategoryId, PartNo) REFERENCES dbo.QuestionCategory (CategoryId, PartNo);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.SpecialTag') AND name=N'FK_SpecialTag_Part')
ALTER TABLE dbo.SpecialTag ADD CONSTRAINT FK_SpecialTag_Part FOREIGN KEY (PartNo) REFERENCES dbo.PartSetting (PartNo);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'FK_QuestionGroup_Exam')
ALTER TABLE dbo.QuestionGroup ADD CONSTRAINT FK_QuestionGroup_Exam FOREIGN KEY (ExamId) REFERENCES dbo.Exam (ExamId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'FK_QuestionGroup_Part')
ALTER TABLE dbo.QuestionGroup ADD CONSTRAINT FK_QuestionGroup_Part FOREIGN KEY (PartNo) REFERENCES dbo.PartSetting (PartNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'FK_QuestionGroup_Category')
ALTER TABLE dbo.QuestionGroup ADD CONSTRAINT FK_QuestionGroup_Category FOREIGN KEY (CategoryId, PartNo) REFERENCES dbo.QuestionCategory (CategoryId, PartNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'FK_QuestionGroup_Level')
ALTER TABLE dbo.QuestionGroup ADD CONSTRAINT FK_QuestionGroup_Level FOREIGN KEY (GroupLevelNo) REFERENCES dbo.LevelBand (LevelNo);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionGroupTag') AND name=N'FK_QuestionGroupTag_Group')
ALTER TABLE dbo.QuestionGroupTag ADD CONSTRAINT FK_QuestionGroupTag_Group FOREIGN KEY (GroupId, PartNo) REFERENCES dbo.QuestionGroup (GroupId, PartNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionGroupTag') AND name=N'FK_QuestionGroupTag_Tag')
ALTER TABLE dbo.QuestionGroupTag ADD CONSTRAINT FK_QuestionGroupTag_Tag FOREIGN KEY (SpecialTagId, PartNo) REFERENCES dbo.SpecialTag (SpecialTagId, PartNo);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Media') AND name=N'FK_Media_Group')
ALTER TABLE dbo.Media ADD CONSTRAINT FK_Media_Group FOREIGN KEY (GroupId, PartNo) REFERENCES dbo.QuestionGroup (GroupId, PartNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Media') AND name=N'FK_Media_Clip')
ALTER TABLE dbo.Media ADD CONSTRAINT FK_Media_Clip FOREIGN KEY (ClipId) REFERENCES dbo.ListeningClip (ClipId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Media') AND name=N'FK_Media_Direction')
ALTER TABLE dbo.Media ADD CONSTRAINT FK_Media_Direction FOREIGN KEY (DirectionId) REFERENCES dbo.ExamDirection (DirectionId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Question') AND name=N'FK_Question_Group')
ALTER TABLE dbo.Question ADD CONSTRAINT FK_Question_Group FOREIGN KEY (GroupId, ExamId) REFERENCES dbo.QuestionGroup (GroupId, ExamId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Question') AND name=N'FK_Question_Exam')
ALTER TABLE dbo.Question ADD CONSTRAINT FK_Question_Exam FOREIGN KEY (ExamId) REFERENCES dbo.Exam (ExamId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Question') AND name=N'FK_Question_Level')
ALTER TABLE dbo.Question ADD CONSTRAINT FK_Question_Level FOREIGN KEY (LevelNo) REFERENCES dbo.LevelBand (LevelNo);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.QuestionOption') AND name=N'FK_QuestionOption_Question')
ALTER TABLE dbo.QuestionOption ADD CONSTRAINT FK_QuestionOption_Question FOREIGN KEY (QuestionId) REFERENCES dbo.Question (QuestionId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.GrammarTopic') AND name=N'FK_GrammarTopic_Category')
ALTER TABLE dbo.GrammarTopic ADD CONSTRAINT FK_GrammarTopic_Category FOREIGN KEY (CategoryId, PartNo) REFERENCES dbo.QuestionCategory (CategoryId, PartNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.GrammarArticle') AND name=N'FK_GrammarArticle_Topic')
ALTER TABLE dbo.GrammarArticle ADD CONSTRAINT FK_GrammarArticle_Topic FOREIGN KEY (GrammarTopicId) REFERENCES dbo.GrammarTopic (GrammarTopicId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.ListeningItem') AND name=N'FK_ListeningItem_Part')
ALTER TABLE dbo.ListeningItem ADD CONSTRAINT FK_ListeningItem_Part FOREIGN KEY (PartNo) REFERENCES dbo.PartSetting (PartNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.ListeningItem') AND name=N'FK_ListeningItem_Group')
ALTER TABLE dbo.ListeningItem ADD CONSTRAINT FK_ListeningItem_Group FOREIGN KEY (GroupId, PartNo) REFERENCES dbo.QuestionGroup (GroupId, PartNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.ListeningItem') AND name=N'FK_ListeningItem_Category')
ALTER TABLE dbo.ListeningItem ADD CONSTRAINT FK_ListeningItem_Category FOREIGN KEY (CategoryId, PartNo) REFERENCES dbo.QuestionCategory (CategoryId, PartNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.ListeningItem') AND name=N'FK_ListeningItem_Level')
ALTER TABLE dbo.ListeningItem ADD CONSTRAINT FK_ListeningItem_Level FOREIGN KEY (LevelNo) REFERENCES dbo.LevelBand (LevelNo);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.ListeningClip') AND name=N'FK_ListeningClip_Item')
ALTER TABLE dbo.ListeningClip ADD CONSTRAINT FK_ListeningClip_Item FOREIGN KEY (ItemId, PartNo) REFERENCES dbo.ListeningItem (ItemId, PartNo);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserListeningProgress') AND name=N'FK_ULP_User')
ALTER TABLE dbo.UserListeningProgress ADD CONSTRAINT FK_ULP_User FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId) ON DELETE CASCADE;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserListeningProgress') AND name=N'FK_ULP_Item')
ALTER TABLE dbo.UserListeningProgress ADD CONSTRAINT FK_ULP_Item FOREIGN KEY (ItemId) REFERENCES dbo.ListeningItem (ItemId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'FK_Attempt_User')
ALTER TABLE dbo.Attempt ADD CONSTRAINT FK_Attempt_User FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId) ON DELETE CASCADE;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'FK_Attempt_Exam')
ALTER TABLE dbo.Attempt ADD CONSTRAINT FK_Attempt_Exam FOREIGN KEY (ExamId) REFERENCES dbo.Exam (ExamId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.AttemptAnswer') AND name=N'FK_AttemptAnswer_Attempt')
ALTER TABLE dbo.AttemptAnswer ADD CONSTRAINT FK_AttemptAnswer_Attempt FOREIGN KEY (AttemptId) REFERENCES dbo.Attempt (AttemptId) ON DELETE CASCADE;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.AttemptAnswer') AND name=N'FK_AttemptAnswer_Question')
ALTER TABLE dbo.AttemptAnswer ADD CONSTRAINT FK_AttemptAnswer_Question FOREIGN KEY (QuestionId) REFERENCES dbo.Question (QuestionId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.AttemptAnswer') AND name=N'FK_AttemptAnswer_Option')
ALTER TABLE dbo.AttemptAnswer ADD CONSTRAINT FK_AttemptAnswer_Option FOREIGN KEY (SelectedOptionId, QuestionId) REFERENCES dbo.QuestionOption (OptionId, QuestionId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserQuestionProgress') AND name=N'FK_UQP_User')
ALTER TABLE dbo.UserQuestionProgress ADD CONSTRAINT FK_UQP_User FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId) ON DELETE CASCADE;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserQuestionProgress') AND name=N'FK_UQP_Question')
ALTER TABLE dbo.UserQuestionProgress ADD CONSTRAINT FK_UQP_Question FOREIGN KEY (QuestionId) REFERENCES dbo.Question (QuestionId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Vocabulary') AND name=N'FK_Vocabulary_Pos')
ALTER TABLE dbo.Vocabulary ADD CONSTRAINT FK_Vocabulary_Pos FOREIGN KEY (PosCode) REFERENCES dbo.PartOfSpeech (PosCode);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Vocabulary') AND name=N'FK_Vocabulary_Topic')
ALTER TABLE dbo.Vocabulary ADD CONSTRAINT FK_Vocabulary_Topic FOREIGN KEY (VocabTopicId) REFERENCES dbo.VocabTopic (VocabTopicId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.VocabularyRelation') AND name=N'FK_VocabularyRelation_Vocab')
ALTER TABLE dbo.VocabularyRelation ADD CONSTRAINT FK_VocabularyRelation_Vocab FOREIGN KEY (VocabId) REFERENCES dbo.Vocabulary (VocabId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'FK_VocabularyContext_Vocab')
ALTER TABLE dbo.VocabularyContext ADD CONSTRAINT FK_VocabularyContext_Vocab FOREIGN KEY (VocabId) REFERENCES dbo.Vocabulary (VocabId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'FK_VocabularyContext_Question')
ALTER TABLE dbo.VocabularyContext ADD CONSTRAINT FK_VocabularyContext_Question FOREIGN KEY (QuestionId) REFERENCES dbo.Question (QuestionId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'FK_VocabularyContext_Clip')
ALTER TABLE dbo.VocabularyContext ADD CONSTRAINT FK_VocabularyContext_Clip FOREIGN KEY (ClipId) REFERENCES dbo.ListeningClip (ClipId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.VocabularyGroup') AND name=N'FK_VocabularyGroup_Topic')
ALTER TABLE dbo.VocabularyGroup ADD CONSTRAINT FK_VocabularyGroup_Topic FOREIGN KEY (VocabTopicId) REFERENCES dbo.VocabTopic (VocabTopicId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.VocabularyGroupItem') AND name=N'FK_VGI_Group')
ALTER TABLE dbo.VocabularyGroupItem ADD CONSTRAINT FK_VGI_Group FOREIGN KEY (VocabGroupId) REFERENCES dbo.VocabularyGroup (VocabGroupId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.VocabularyGroupItem') AND name=N'FK_VGI_Vocab')
ALTER TABLE dbo.VocabularyGroupItem ADD CONSTRAINT FK_VGI_Vocab FOREIGN KEY (VocabId) REFERENCES dbo.Vocabulary (VocabId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserVocabulary') AND name=N'FK_UserVocabulary_User')
ALTER TABLE dbo.UserVocabulary ADD CONSTRAINT FK_UserVocabulary_User FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId) ON DELETE CASCADE;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserVocabulary') AND name=N'FK_UserVocabulary_Vocab')
ALTER TABLE dbo.UserVocabulary ADD CONSTRAINT FK_UserVocabulary_Vocab FOREIGN KEY (VocabId) REFERENCES dbo.Vocabulary (VocabId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserVocabulary') AND name=N'FK_UserVocabulary_SrcQuestion')
ALTER TABLE dbo.UserVocabulary ADD CONSTRAINT FK_UserVocabulary_SrcQuestion FOREIGN KEY (SourceQuestionId) REFERENCES dbo.Question (QuestionId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserVocabulary') AND name=N'FK_UserVocabulary_SrcClip')
ALTER TABLE dbo.UserVocabulary ADD CONSTRAINT FK_UserVocabulary_SrcClip FOREIGN KEY (SourceClipId) REFERENCES dbo.ListeningClip (ClipId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserVocabulary') AND name=N'FK_UserVocabulary_SrcGroup')
ALTER TABLE dbo.UserVocabulary ADD CONSTRAINT FK_UserVocabulary_SrcGroup FOREIGN KEY (SourceVocabGroupId) REFERENCES dbo.VocabularyGroup (VocabGroupId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserVocabProgress') AND name=N'FK_UserVocabProgress_User')
ALTER TABLE dbo.UserVocabProgress ADD CONSTRAINT FK_UserVocabProgress_User FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.UserVocabProgress') AND name=N'FK_UserVocabProgress_Vocab')
ALTER TABLE dbo.UserVocabProgress ADD CONSTRAINT FK_UserVocabProgress_Vocab FOREIGN KEY (VocabId) REFERENCES dbo.Vocabulary (VocabId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Report') AND name=N'FK_Report_Reporter')
ALTER TABLE dbo.Report ADD CONSTRAINT FK_Report_Reporter FOREIGN KEY (ReporterId) REFERENCES dbo.Users (UserId) ON DELETE SET NULL;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Report') AND name=N'FK_Report_Handler')
ALTER TABLE dbo.Report ADD CONSTRAINT FK_Report_Handler FOREIGN KEY (HandledBy) REFERENCES dbo.Users (UserId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Report') AND name=N'FK_Report_Question')
ALTER TABLE dbo.Report ADD CONSTRAINT FK_Report_Question FOREIGN KEY (QuestionId) REFERENCES dbo.Question (QuestionId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Report') AND name=N'FK_Report_Vocab')
ALTER TABLE dbo.Report ADD CONSTRAINT FK_Report_Vocab FOREIGN KEY (VocabId) REFERENCES dbo.Vocabulary (VocabId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Report') AND name=N'FK_Report_Article')
ALTER TABLE dbo.Report ADD CONSTRAINT FK_Report_Article FOREIGN KEY (ArticleId) REFERENCES dbo.GrammarArticle (ArticleId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Report') AND name=N'FK_Report_ListeningItem')
ALTER TABLE dbo.Report ADD CONSTRAINT FK_Report_ListeningItem FOREIGN KEY (ListeningItemId) REFERENCES dbo.ListeningItem (ItemId);

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.StudyDay') AND name=N'FK_StudyDay_User')
ALTER TABLE dbo.StudyDay ADD CONSTRAINT FK_StudyDay_User FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId) ON DELETE CASCADE;
GO

/* ===================== PHẦN C. INDEX ===================== */
-- C1. Unique có điều kiện (giữ toàn vẹn khi có xóa mềm)
-- Thay index tên đề toàn cục bằng unique trong bộ theo quyết định đã chốt.
IF EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Exam') AND name=N'UX_Exam_Title')
    DROP INDEX UX_Exam_Title ON dbo.Exam;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ExamSet') AND name=N'UX_ExamSet_Name')
CREATE UNIQUE INDEX UX_ExamSet_Name ON dbo.ExamSet(Name) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Exam') AND name=N'UX_Exam_Set_Code')
CREATE UNIQUE INDEX UX_Exam_Set_Code ON dbo.Exam(ExamSetId,ExamCode) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Exam') AND name=N'UX_Exam_Set_Title')
CREATE UNIQUE INDEX UX_Exam_Set_Title ON dbo.Exam(ExamSetId,Title) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Exam') AND name=N'IX_Exam_Set_Status')
CREATE INDEX IX_Exam_Set_Status ON dbo.Exam(ExamSetId,IsDeleted,Status);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Users') AND name=N'UX_Users_GoogleId')
CREATE UNIQUE INDEX UX_Users_GoogleId ON dbo.Users(GoogleId) WHERE GoogleId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.PasswordResetOtps') AND name=N'IX_PasswordResetOtps_Email_Active')
CREATE INDEX IX_PasswordResetOtps_Email_Active ON dbo.PasswordResetOtps(Email,ExpiresAt,IsUsed);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'IX_Attempt_Exam_ContentLock')
CREATE INDEX IX_Attempt_Exam_ContentLock ON dbo.Attempt(ExamId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ExamDirection') AND name=N'UX_ExamDirection_Target')
CREATE UNIQUE INDEX UX_ExamDirection_Target ON dbo.ExamDirection (ExamId, DirectionKind, Skill, PartNo) WHERE IsDeleted = 0;  -- NULL được coi là bằng nhau: mỗi mục chỉ một bản mặc định
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'UX_QuestionGroup_ExamOrder')
CREATE UNIQUE INDEX UX_QuestionGroup_ExamOrder ON dbo.QuestionGroup (ExamId, GroupOrder) WHERE IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Question') AND name=N'UX_Question_ExamNo')
CREATE UNIQUE INDEX UX_Question_ExamNo ON dbo.Question (ExamId, QuestionNo) WHERE IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.QuestionOption') AND name=N'UX_QuestionOption_Correct')
CREATE UNIQUE INDEX UX_QuestionOption_Correct ON dbo.QuestionOption (QuestionId) WHERE IsCorrect = 1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Media') AND name=N'UX_Media_GroupAudio')
CREATE UNIQUE INDEX UX_Media_GroupAudio ON dbo.Media (GroupId) WHERE MediaType = 'AUDIO' AND GroupId IS NOT NULL AND IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Media') AND name=N'UX_Media_ClipAudio')
CREATE UNIQUE INDEX UX_Media_ClipAudio ON dbo.Media (ClipId) WHERE ClipId IS NOT NULL AND IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Media') AND name=N'UX_Media_Direction')
CREATE UNIQUE INDEX UX_Media_Direction ON dbo.Media (DirectionId, MediaType) WHERE DirectionId IS NOT NULL AND IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ListeningItem') AND name=N'UX_ListeningItem_Group')
CREATE UNIQUE INDEX UX_ListeningItem_Group ON dbo.ListeningItem (GroupId) WHERE GroupId IS NOT NULL AND IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ListeningItem') AND name=N'UX_ListeningItem_ExternalKey')
CREATE UNIQUE INDEX UX_ListeningItem_ExternalKey ON dbo.ListeningItem (ExternalKey) WHERE ExternalKey IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ListeningClip') AND name=N'UX_ListeningClip_Seq')
CREATE UNIQUE INDEX UX_ListeningClip_Seq ON dbo.ListeningClip (ItemId, SeqNo) WHERE IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ListeningClip') AND name=N'UX_ListeningClip_Role')
CREATE UNIQUE INDEX UX_ListeningClip_Role ON dbo.ListeningClip (ItemId, ClipRole) WHERE ClipRole <> 'SENTENCE' AND IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ListeningClip') AND name=N'UX_ListeningClip_ExternalId')
CREATE UNIQUE INDEX UX_ListeningClip_ExternalId ON dbo.ListeningClip (ExternalId) WHERE ExternalId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyRelation') AND name=N'UX_VocabularyRelation_Item')
CREATE UNIQUE INDEX UX_VocabularyRelation_Item ON dbo.VocabularyRelation (VocabId, RelationType, RelatedText) WHERE IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'UX_VocabularyContext_Question')
CREATE UNIQUE INDEX UX_VocabularyContext_Question ON dbo.VocabularyContext (QuestionId, VocabId, SurfaceForm) WHERE QuestionId IS NOT NULL AND IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'UX_VocabularyContext_Clip')
CREATE UNIQUE INDEX UX_VocabularyContext_Clip ON dbo.VocabularyContext (ClipId, VocabId, SurfaceForm) WHERE ClipId IS NOT NULL AND IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyGroup') AND name=N'UX_VocabularyGroup_Name')
CREATE UNIQUE INDEX UX_VocabularyGroup_Name ON dbo.VocabularyGroup (Name) WHERE IsDeleted = 0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UserVocabulary') AND name=N'UX_UserVocabulary_Vocab')
CREATE UNIQUE INDEX UX_UserVocabulary_Vocab ON dbo.UserVocabulary (UserId, VocabId) WHERE VocabId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UserVocabulary') AND name=N'UX_UserVocabulary_Custom')
CREATE UNIQUE INDEX UX_UserVocabulary_Custom ON dbo.UserVocabulary (UserId, CustomWord) WHERE CustomWord IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Report') AND name=N'UX_Report_Open')
CREATE UNIQUE INDEX UX_Report_Open ON dbo.Report (ReporterId, QuestionId, VocabId, ArticleId, ListeningItemId) WHERE [Status] <> 'RESOLVED' AND [Status] <> 'REJECTED';
-- CHG-009 (18/11/2026): mỗi chủ điểm ngữ pháp chỉ có một bài chưa xóa (ISSUE-012 chốt: một bài/chủ điểm).
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.GrammarArticle') AND name=N'UX_GrammarArticle_Topic')
CREATE UNIQUE INDEX UX_GrammarArticle_Topic ON dbo.GrammarArticle (GrammarTopicId) WHERE IsDeleted = 0;
GO

-- C2. Index phục vụ truy vấn
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Exam') AND name=N'IX_Exam_Status')
CREATE INDEX IX_Exam_Status ON dbo.Exam ([Status], IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'IX_QuestionGroup_ExamPart')
CREATE INDEX IX_QuestionGroup_ExamPart ON dbo.QuestionGroup (ExamId, PartNo, GroupOrder);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'IX_QuestionGroup_PartCategory')
CREATE INDEX IX_QuestionGroup_PartCategory ON dbo.QuestionGroup (PartNo, CategoryId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Question') AND name=N'IX_Question_GroupNo')
CREATE INDEX IX_Question_GroupNo ON dbo.Question (GroupId, QuestionNo);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Question') AND name=N'IX_Question_Level')
CREATE INDEX IX_Question_Level ON dbo.Question (LevelNo);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'IX_Attempt_UserStarted')
CREATE INDEX IX_Attempt_UserStarted ON dbo.Attempt (UserId, StartedAt DESC);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.AttemptAnswer') AND name=N'IX_AttemptAnswer_Question')
CREATE INDEX IX_AttemptAnswer_Question ON dbo.AttemptAnswer (QuestionId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ListeningItem') AND name=N'IX_ListeningItem_PartPublished')
CREATE INDEX IX_ListeningItem_PartPublished ON dbo.ListeningItem (PartNo, IsPublished);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Vocabulary') AND name=N'IX_Vocabulary_TopicCefr')
CREATE INDEX IX_Vocabulary_TopicCefr ON dbo.Vocabulary (VocabTopicId, CefrLevel);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'IX_VocabularyContext_Vocab')
CREATE INDEX IX_VocabularyContext_Vocab ON dbo.VocabularyContext (VocabId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'IX_VocabularyContext_Question')
CREATE INDEX IX_VocabularyContext_Question ON dbo.VocabularyContext (QuestionId) WHERE QuestionId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'IX_VocabularyContext_Clip')
CREATE INDEX IX_VocabularyContext_Clip ON dbo.VocabularyContext (ClipId) WHERE ClipId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Report') AND name=N'IX_Report_StatusCreated')
CREATE INDEX IX_Report_StatusCreated ON dbo.Report ([Status], CreatedAt);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UserQuestionProgress') AND name=N'IX_UQP_UserLast')
CREATE INDEX IX_UQP_UserLast ON dbo.UserQuestionProgress (UserId, LastIsCorrect);
GO

-- C3. Index tải đề và API học tập (CHG-003, CHG-005), hợp nhất từ các script rời.
-- Cùng cột đầu chưa đủ tương đương: giữ các index khác INCLUDE, bộ lọc hoặc thứ tự khóa.
-- QuestionGroupTag đã có PK clustered (GroupId, SpecialTagId), bao phủ đủ truy vấn;
-- không tạo thêm IX_QuestionGroupTag_GroupId trùng chức năng. Index cũ được giữ nguyên.
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.QuestionGroup') AND name=N'IX_QuestionGroup_ExamId_Part')
CREATE INDEX IX_QuestionGroup_ExamId_Part ON dbo.QuestionGroup (ExamId, PartNo, GroupOrder) INCLUDE (IsDeleted, CategoryId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Question') AND name=N'IX_Question_GroupId')
CREATE INDEX IX_Question_GroupId ON dbo.Question (GroupId) INCLUDE (ExamId, QuestionNo, LevelNo, IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Question') AND name=N'IX_Question_ExamId')
CREATE INDEX IX_Question_ExamId ON dbo.Question (ExamId) INCLUDE (GroupId, QuestionNo, IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.QuestionOption') AND name=N'IX_QuestionOption_QuestionId')
CREATE INDEX IX_QuestionOption_QuestionId ON dbo.QuestionOption (QuestionId) INCLUDE (OptionLabel, IsCorrect);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Media') AND name=N'IX_Media_GroupId')
CREATE INDEX IX_Media_GroupId ON dbo.Media (GroupId) INCLUDE (ClipId, IsDeleted, MediaType, SortOrder);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Media') AND name=N'IX_Media_ClipId')
CREATE INDEX IX_Media_ClipId ON dbo.Media (ClipId) INCLUDE (GroupId, IsDeleted, MediaType, SortOrder);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Media') AND name=N'IX_Media_DirectionId')
CREATE INDEX IX_Media_DirectionId ON dbo.Media (DirectionId) INCLUDE (IsDeleted, MediaType, SortOrder);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ListeningItem') AND name=N'IX_ListeningItem_GroupId')
CREATE INDEX IX_ListeningItem_GroupId ON dbo.ListeningItem (GroupId) INCLUDE (IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ListeningClip') AND name=N'IX_ListeningClip_ItemId')
CREATE INDEX IX_ListeningClip_ItemId ON dbo.ListeningClip (ItemId) INCLUDE (SeqNo, IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'IX_VocabularyContext_QuestionId')
CREATE INDEX IX_VocabularyContext_QuestionId ON dbo.VocabularyContext (QuestionId) INCLUDE (VocabId, IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'IX_VocabularyContext_ClipId')
CREATE INDEX IX_VocabularyContext_ClipId ON dbo.VocabularyContext (ClipId) INCLUDE (VocabId, IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VocabularyContext') AND name=N'IX_VocabularyContext_VocabId')
CREATE INDEX IX_VocabularyContext_VocabId ON dbo.VocabularyContext (VocabId) INCLUDE (IsDeleted, ExampleEn);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'IX_Attempt_User_Started')
CREATE INDEX IX_Attempt_User_Started ON dbo.Attempt (UserId, StartedAt DESC) INCLUDE (Status, Mode, Scope, ExamId, IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'IX_Attempt_ExamId')
CREATE INDEX IX_Attempt_ExamId ON dbo.Attempt (ExamId) INCLUDE (Status, IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.AttemptAnswer') AND name=N'IX_AttemptAnswer_Attempt')
CREATE INDEX IX_AttemptAnswer_Attempt ON dbo.AttemptAnswer (AttemptId, QuestionId) INCLUDE (SelectedOptionId, IsCorrect);
-- IX_AttemptAnswer_Question được quản lý tại C2; giữ guard theo tên của script gốc.
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Report') AND name=N'IX_Report_Status')
CREATE INDEX IX_Report_Status ON dbo.Report (Status, ReportId DESC);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UserVocabulary') AND name=N'IX_UserVocabulary_User')
CREATE INDEX IX_UserVocabulary_User ON dbo.UserVocabulary (UserId, UserVocabId DESC);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UserVocabProgress') AND name=N'IX_UserVocabProgress_User_Next')
CREATE INDEX IX_UserVocabProgress_User_Next ON dbo.UserVocabProgress (UserId, NextReviewAt) INCLUDE ([Status]);
GO

-- P05: lưu nguồn Excel và metadata clip, không thay đổi dữ liệu/khóa hiện có.
IF COL_LENGTH(N'dbo.Exam',N'ImportSourceJson') IS NULL ALTER TABLE dbo.Exam ADD ImportSourceJson NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.ListeningClip',N'ClipKey') IS NULL ALTER TABLE dbo.ListeningClip ADD ClipKey NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.ListeningClip',N'Speaker') IS NULL ALTER TABLE dbo.ListeningClip ADD Speaker NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.ListeningClip',N'SourceAudio') IS NULL ALTER TABLE dbo.ListeningClip ADD SourceAudio NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.ListeningClip',N'ClipAudio') IS NULL ALTER TABLE dbo.ListeningClip ADD ClipAudio NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.ListeningClip',N'TextSource') IS NULL ALTER TABLE dbo.ListeningClip ADD TextSource NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.ListeningClip',N'StartSec') IS NULL ALTER TABLE dbo.ListeningClip ADD StartSec FLOAT NULL;
IF COL_LENGTH(N'dbo.ListeningClip',N'EndSec') IS NULL ALTER TABLE dbo.ListeningClip ADD EndSec FLOAT NULL;
IF COL_LENGTH(N'dbo.ListeningClip',N'DurationSec') IS NULL ALTER TABLE dbo.ListeningClip ADD DurationSec FLOAT NULL;
GO

/* ===================== PHẦN D. VIP/VNPAY (CHG-006) ===================== */
-- Phải áp dụng trước backend CHG-006. Mặc định giữ quyền FREE cho nội dung hiện có.
-- D1. Thời hạn VIP của người dùng (NULL hoặc đã qua = chưa có VIP; ADMIN luôn có toàn quyền).
IF COL_LENGTH('dbo.Users', 'VipExpiresAt') IS NULL
    ALTER TABLE dbo.Users ADD VipExpiresAt DATETIME2 NULL;
GO

-- D2. Quyền riêng từng tính năng: làm đề, từ vựng, Nghe, Đọc.
IF COL_LENGTH('dbo.ExamSet', 'ExamAccess') IS NULL
    ALTER TABLE dbo.ExamSet ADD ExamAccess VARCHAR(10) NOT NULL CONSTRAINT DF_ExamSet_ExamAccess DEFAULT 'FREE'
        CONSTRAINT CK_ExamSet_ExamAccess CHECK (ExamAccess IN ('FREE', 'VIP'));
IF COL_LENGTH('dbo.ExamSet', 'VocabAccess') IS NULL
    ALTER TABLE dbo.ExamSet ADD VocabAccess VARCHAR(10) NOT NULL CONSTRAINT DF_ExamSet_VocabAccess DEFAULT 'FREE'
        CONSTRAINT CK_ExamSet_VocabAccess CHECK (VocabAccess IN ('FREE', 'VIP'));
IF COL_LENGTH('dbo.ExamSet', 'ListeningAccess') IS NULL
    ALTER TABLE dbo.ExamSet ADD ListeningAccess VARCHAR(10) NOT NULL CONSTRAINT DF_ExamSet_ListeningAccess DEFAULT 'FREE'
        CONSTRAINT CK_ExamSet_ListeningAccess CHECK (ListeningAccess IN ('FREE', 'VIP'));
IF COL_LENGTH('dbo.ExamSet', 'ReadingAccess') IS NULL
    ALTER TABLE dbo.ExamSet ADD ReadingAccess VARCHAR(10) NOT NULL CONSTRAINT DF_ExamSet_ReadingAccess DEFAULT 'FREE'
        CONSTRAINT CK_ExamSet_ReadingAccess CHECK (ReadingAccess IN ('FREE', 'VIP'));
GO

-- D3. Ghi đè quyền làm đề (NULL = theo ExamAccess của bộ đề).
IF COL_LENGTH('dbo.Exam', 'AccessLevel') IS NULL
    ALTER TABLE dbo.Exam ADD AccessLevel VARCHAR(10) NULL CONSTRAINT CK_Exam_AccessLevel CHECK (AccessLevel IN ('FREE', 'VIP'));
GO

-- D4. Gói VIP bán cho người học.
IF OBJECT_ID('dbo.VipPlan', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VipPlan
    (
        PlanId       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VipPlan PRIMARY KEY,
        Code         VARCHAR(30)   NOT NULL,
        Name         NVARCHAR(100) NOT NULL,
        Description  NVARCHAR(500) NULL,
        DurationDays INT           NOT NULL,
        PriceVnd     INT           NOT NULL,
        IsActive     BIT           NOT NULL CONSTRAINT DF_VipPlan_IsActive DEFAULT 1,
        SortOrder    SMALLINT      NOT NULL CONSTRAINT DF_VipPlan_SortOrder DEFAULT 0,
        CreatedAt    DATETIME2     NOT NULL CONSTRAINT DF_VipPlan_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt    DATETIME2     NOT NULL CONSTRAINT DF_VipPlan_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_VipPlan_Code UNIQUE (Code),
        CONSTRAINT CK_VipPlan_Duration CHECK (DurationDays BETWEEN 1 AND 3660),
        CONSTRAINT CK_VipPlan_Price CHECK (PriceVnd BETWEEN 5000 AND 100000000)
    );
END;
GO

-- D5. Đơn thanh toán: chụp lại gói lúc mua, TxnRef duy nhất gửi sang VNPay.
IF OBJECT_ID('dbo.PaymentOrder', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentOrder
    (
        OrderId       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PaymentOrder PRIMARY KEY,
        UserId        INT           NOT NULL,
        PlanId        INT           NOT NULL,
        PlanCode      VARCHAR(30)   NOT NULL,
        PlanName      NVARCHAR(100) NOT NULL,
        DurationDays  INT           NOT NULL,
        Amount        INT           NOT NULL,
        Provider      VARCHAR(10)   NOT NULL CONSTRAINT DF_PaymentOrder_Provider DEFAULT 'VNPAY',
        TxnRef        VARCHAR(40)   NOT NULL,
        [Status]      VARCHAR(10)   NOT NULL CONSTRAINT DF_PaymentOrder_Status DEFAULT 'PENDING',
        ResponseCode  VARCHAR(5)    NULL,
        TransactionNo VARCHAR(30)   NULL,
        BankCode      VARCHAR(20)   NULL,
        CardType      VARCHAR(20)   NULL,
        IpAddress     VARCHAR(45)   NULL,
        CreatedAt     DATETIME2     NOT NULL CONSTRAINT DF_PaymentOrder_CreatedAt DEFAULT SYSUTCDATETIME(),
        ExpiresAt     DATETIME2     NOT NULL,
        PaidAt        DATETIME2     NULL,
        UpdatedAt     DATETIME2     NOT NULL CONSTRAINT DF_PaymentOrder_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_PaymentOrder_TxnRef UNIQUE (TxnRef),
        CONSTRAINT FK_PaymentOrder_User FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT FK_PaymentOrder_Plan FOREIGN KEY (PlanId) REFERENCES dbo.VipPlan (PlanId),
        CONSTRAINT CK_PaymentOrder_Status CHECK ([Status] IN ('PENDING', 'PAID', 'FAILED'))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.PaymentOrder') AND name = 'IX_PaymentOrder_User_Created')
    CREATE INDEX IX_PaymentOrder_User_Created ON dbo.PaymentOrder (UserId, CreatedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.PaymentOrder') AND name = 'IX_PaymentOrder_Status_Created')
    CREATE INDEX IX_PaymentOrder_Status_Created ON dbo.PaymentOrder ([Status], CreatedAt DESC);
GO

-- D6. Giữ cùng phần CHG-006 trong file này; chỉ thêm gói mặc định khi bảng trống, không ghi đè giá Admin sửa.
IF NOT EXISTS (SELECT 1 FROM dbo.VipPlan)
    INSERT INTO dbo.VipPlan (Code, Name, Description, DurationDays, PriceVnd, SortOrder) VALUES
        ('VIP_1M',  N'VIP 1 tháng',  N'Mở khóa đề, từ vựng, Nghe, Đọc thuộc nội dung VIP trong 30 ngày.',  30,  99000, 1),
        ('VIP_3M',  N'VIP 3 tháng',  N'Tiết kiệm 16% so với mua theo tháng.',                              90, 249000, 2),
        ('VIP_12M', N'VIP 12 tháng', N'Tiết kiệm 33% so với mua theo tháng, phù hợp ôn thi dài hạn.',     365, 799000, 3);
GO

/* ===================== PHẦN E. CÁ NHÂN HÓA VÀ KIỂM TRA ĐẦU VÀO (CHG-007) ===================== */
-- Phải áp dụng trước backend CHG-007. Chỉ thêm bảng mới và nới CHECK của Attempt; không đổi dữ liệu đã có.
-- E1. Hồ sơ mục tiêu của người học (một dòng mỗi người, tạo khi người học lưu mục tiêu lần đầu).
IF OBJECT_ID(N'dbo.LearnerProfile',N'U') IS NULL
CREATE TABLE dbo.LearnerProfile (
    UserId       INT       NOT NULL,
    TargetScore  SMALLINT  NULL,
    ExamDate     DATE      NULL,
    DailyMinutes SMALLINT  NULL,
    CreatedAt    DATETIME2 NOT NULL CONSTRAINT DF_LearnerProfile_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2 NOT NULL CONSTRAINT DF_LearnerProfile_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_LearnerProfile PRIMARY KEY (UserId),
    CONSTRAINT FK_LearnerProfile_User FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId) ON DELETE CASCADE,
    CONSTRAINT CK_LearnerProfile_Target CHECK (TargetScore IS NULL OR (TargetScore BETWEEN 10 AND 990 AND TargetScore % 5 = 0)),
    CONSTRAINT CK_LearnerProfile_Daily CHECK (DailyMinutes IS NULL OR DailyMinutes BETWEEN 5 AND 600)
);
GO

-- E2. Bài kiểm tra đầu vào: Admin ghép từ các nhóm câu của đề đã có (đề thường phải đủ 200 câu mới xuất bản được).
-- Tối đa một bài đang dùng (UX_PlacementTest_Active); xóa mềm thì phải tắt trước.
IF OBJECT_ID(N'dbo.PlacementTest',N'U') IS NULL
CREATE TABLE dbo.PlacementTest (
    PlacementTestId  INT IDENTITY(1,1) NOT NULL,
    Title            NVARCHAR(150)  NOT NULL,
    Description      NVARCHAR(1000) NULL,
    TimeLimitSeconds INT            NOT NULL,
    IsActive         BIT            NOT NULL CONSTRAINT DF_PlacementTest_IsActive DEFAULT 0,
    IsDeleted        BIT            NOT NULL CONSTRAINT DF_PlacementTest_IsDeleted DEFAULT 0,
    DeletedAt        DATETIME2      NULL,
    CreatedBy        INT            NOT NULL,
    CreatedAt        DATETIME2      NOT NULL CONSTRAINT DF_PlacementTest_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2      NOT NULL CONSTRAINT DF_PlacementTest_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_PlacementTest PRIMARY KEY (PlacementTestId),
    CONSTRAINT FK_PlacementTest_Creator FOREIGN KEY (CreatedBy) REFERENCES dbo.Users (UserId),
    CONSTRAINT CK_PlacementTest_Time CHECK (TimeLimitSeconds BETWEEN 60 AND 14400),
    CONSTRAINT CK_PlacementTest_SoftDelete CHECK ((IsDeleted = 0 AND DeletedAt IS NULL) OR (IsDeleted = 1 AND DeletedAt IS NOT NULL AND IsActive = 0))
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.PlacementTest') AND name=N'UX_PlacementTest_Active')
CREATE UNIQUE INDEX UX_PlacementTest_Active ON dbo.PlacementTest (IsActive) WHERE IsActive = 1;
GO

IF OBJECT_ID(N'dbo.PlacementTestGroup',N'U') IS NULL
CREATE TABLE dbo.PlacementTestGroup (
    PlacementTestId INT      NOT NULL,
    GroupId         INT      NOT NULL,
    SortOrder       SMALLINT NOT NULL,
    CONSTRAINT PK_PlacementTestGroup PRIMARY KEY (PlacementTestId, GroupId),
    CONSTRAINT FK_PlacementTestGroup_Test FOREIGN KEY (PlacementTestId) REFERENCES dbo.PlacementTest (PlacementTestId),
    CONSTRAINT FK_PlacementTestGroup_Group FOREIGN KEY (GroupId) REFERENCES dbo.QuestionGroup (GroupId),
    CONSTRAINT CK_PlacementTestGroup_Sort CHECK (SortOrder >= 0)
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.PlacementTestGroup') AND name=N'IX_PlacementTestGroup_Group')
CREATE INDEX IX_PlacementTestGroup_Group ON dbo.PlacementTestGroup (GroupId);
GO

-- E3. Lượt làm bài kiểm tra đầu vào: Attempt (Scope = PLACEMENT) gắn với bài đã dùng. Điểm ước tính lưu ở cột *Scaled của Attempt.
IF OBJECT_ID(N'dbo.PlacementAttempt',N'U') IS NULL
CREATE TABLE dbo.PlacementAttempt (
    AttemptId       INT NOT NULL,
    PlacementTestId INT NOT NULL,
    CONSTRAINT PK_PlacementAttempt PRIMARY KEY (AttemptId),
    CONSTRAINT FK_PlacementAttempt_Attempt FOREIGN KEY (AttemptId) REFERENCES dbo.Attempt (AttemptId) ON DELETE CASCADE,
    CONSTRAINT FK_PlacementAttempt_Test FOREIGN KEY (PlacementTestId) REFERENCES dbo.PlacementTest (PlacementTestId)
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.PlacementAttempt') AND name=N'IX_PlacementAttempt_Test')
CREATE INDEX IX_PlacementAttempt_Test ON dbo.PlacementAttempt (PlacementTestId);
GO

-- E4. Attempt nhận phạm vi PLACEMENT: Luyện thi có giờ, không thuộc một đề (giống BANK về ExamId).
-- Chỉ thay ràng buộc khi định nghĩa cũ chưa có PLACEMENT; dữ liệu cũ vẫn thỏa ràng buộc mới.
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'CK_Attempt_Scope' AND definition NOT LIKE N'%PLACEMENT%')
    ALTER TABLE dbo.Attempt DROP CONSTRAINT CK_Attempt_Scope;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'CK_Attempt_Scope')
    ALTER TABLE dbo.Attempt ADD CONSTRAINT CK_Attempt_Scope CHECK (Scope IN ('FULL','LISTENING','READING','PART','BANK','PLACEMENT'));
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'CK_Attempt_ExamScope' AND definition NOT LIKE N'%PLACEMENT%')
    ALTER TABLE dbo.Attempt DROP CONSTRAINT CK_Attempt_ExamScope;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'CK_Attempt_ExamScope')
    ALTER TABLE dbo.Attempt ADD CONSTRAINT CK_Attempt_ExamScope CHECK ((Scope IN ('BANK','PLACEMENT') AND ExamId IS NULL) OR (Scope NOT IN ('BANK','PLACEMENT') AND ExamId IS NOT NULL));
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.Attempt') AND name=N'CK_Attempt_PlacementExam')
    ALTER TABLE dbo.Attempt ADD CONSTRAINT CK_Attempt_PlacementExam CHECK (Scope <> 'PLACEMENT' OR Mode = 'EXAM');
GO

/* ===================== PHẦN F. LỊCH SỬ VIP (CHG-008) ===================== */
-- Nhật ký mọi thay đổi thời hạn VIP. VIP do quản trị viên cấp KHÔNG ghi vào PaymentOrder (không có giao dịch tiền).
-- Nên chạy trước backend CHG-008: thiếu bảng thì API cấp/lịch sử VIP trả 503, còn thanh toán VNPay vẫn chạy (chỉ bỏ ghi nhật ký).
-- F1. Bảng lịch sử: PURCHASE gắn đơn; ADMIN_GRANT/ADMIN_REVOKE bắt buộc có người thực hiện và lý do.
IF OBJECT_ID(N'dbo.VipHistory',N'U') IS NULL
CREATE TABLE dbo.VipHistory (
    HistoryId         BIGINT IDENTITY(1,1) NOT NULL,
    UserId            INT           NOT NULL,
    Kind              VARCHAR(20)   NOT NULL,
    Days              INT           NULL,
    PreviousExpiresAt DATETIME2     NULL,
    NewExpiresAt      DATETIME2     NULL,
    OrderId           INT           NULL,
    ActorUserId       INT           NULL,
    Reason            NVARCHAR(300) NULL,
    CreatedAt         DATETIME2     NOT NULL CONSTRAINT DF_VipHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_VipHistory PRIMARY KEY (HistoryId),
    CONSTRAINT FK_VipHistory_User FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
    CONSTRAINT FK_VipHistory_Order FOREIGN KEY (OrderId) REFERENCES dbo.PaymentOrder (OrderId),
    CONSTRAINT FK_VipHistory_Actor FOREIGN KEY (ActorUserId) REFERENCES dbo.Users (UserId),
    CONSTRAINT CK_VipHistory_Kind CHECK (Kind IN ('PURCHASE', 'ADMIN_GRANT', 'ADMIN_REVOKE')),
    CONSTRAINT CK_VipHistory_Days CHECK (Days IS NULL OR Days BETWEEN 1 AND 3660),
    CONSTRAINT CK_VipHistory_Shape CHECK (
        (Kind = 'PURCHASE' AND OrderId IS NOT NULL AND ActorUserId IS NULL)
     OR (Kind = 'ADMIN_GRANT' AND OrderId IS NULL AND ActorUserId IS NOT NULL AND Days IS NOT NULL AND Reason IS NOT NULL AND LEN(Reason) > 0)
     OR (Kind = 'ADMIN_REVOKE' AND OrderId IS NULL AND ActorUserId IS NOT NULL AND Days IS NULL AND NewExpiresAt IS NULL AND Reason IS NOT NULL AND LEN(Reason) > 0))
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VipHistory') AND name=N'IX_VipHistory_User_Created')
CREATE INDEX IX_VipHistory_User_Created ON dbo.VipHistory (UserId, CreatedAt DESC);
-- Mỗi đơn chỉ có tối đa một dòng PURCHASE (chặn ghi trùng khi IPN và return URL về cùng lúc).
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.VipHistory') AND name=N'UX_VipHistory_Order')
CREATE UNIQUE INDEX UX_VipHistory_Order ON dbo.VipHistory (OrderId) WHERE OrderId IS NOT NULL;
GO
-- F2. Bổ sung lịch sử cho các đơn đã thanh toán trước CHG-008 (không biết hạn trước/sau nên để NULL). Chạy lại không tạo trùng.
INSERT INTO dbo.VipHistory (UserId, Kind, Days, OrderId, CreatedAt)
SELECT o.UserId, 'PURCHASE', o.DurationDays, o.OrderId, COALESCE(o.PaidAt, o.UpdatedAt)
FROM dbo.PaymentOrder o
WHERE o.[Status] = 'PAID' AND o.DurationDays BETWEEN 1 AND 3660
  AND NOT EXISTS (SELECT 1 FROM dbo.VipHistory h WHERE h.OrderId = o.OrderId);
GO

COMMIT;
GO
PRINT N'01_schema.sql: baseline 38 bảng, gồm CHG-006 VIP/VNPay, CHG-007 (4 bảng cá nhân hóa/kiểm tra đầu vào) và CHG-008 (VipHistory); cập nhật tại chỗ, giữ nguyên dữ liệu/ID đã có.';
GO
