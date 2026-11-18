namespace ToeicMind.DTOs.Exams.Response;

public class ExamSetDto
{
    public int ExamSetId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>Quyền theo tính năng (FREE/VIP): làm đề, từ vựng, Nghe, Đọc.</summary>
    public string ExamAccess { get; set; } = "FREE";
    public string VocabAccess { get; set; } = "FREE";
    public string ListeningAccess { get; set; } = "FREE";
    public string ReadingAccess { get; set; } = "FREE";
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int ExamCount { get; set; }
    public int PublishedExamCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
