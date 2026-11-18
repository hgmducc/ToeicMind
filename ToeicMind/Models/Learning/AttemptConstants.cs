namespace ToeicMind.Models.Learning;

/// <summary>Giá trị của cột Attempt.Mode.</summary>
public static class AttemptMode
{
    public const string Exam = "EXAM";
    public const string Practice = "PRACTICE";
}

/// <summary>Giá trị của cột Attempt.Scope.</summary>
public static class AttemptScope
{
    public const string Full = "FULL";
    public const string Listening = "LISTENING";
    public const string Reading = "READING";
    public const string Part = "PART";
    public const string Bank = "BANK";
    /// <summary>Bài kiểm tra đầu vào (CHG-007): luôn là EXAM, không thuộc một đề (ExamId NULL), nội dung là các nhóm câu Admin chọn.</summary>
    public const string Placement = "PLACEMENT";
}

/// <summary>Giá trị của cột Attempt.Status.</summary>
public static class AttemptStatus
{
    public const string InProgress = "IN_PROGRESS";
    public const string Submitted = "SUBMITTED";
    public const string Abandoned = "ABANDONED";
    public const string Error = "ERROR";
}
