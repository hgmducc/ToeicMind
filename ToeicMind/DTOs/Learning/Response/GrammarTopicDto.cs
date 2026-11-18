namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một chủ điểm ngữ pháp (Part 5) kèm tiến độ; học bằng POST /api/bank/attempts với CardKey và PartNo = 5.</summary>
public class GrammarTopicDto
{
    public int CategoryId { get; set; }
    /// <summary>Mã chủ điểm để đọc bài: GET /api/grammar/topics/{GrammarTopicId}/article.</summary>
    public int GrammarTopicId { get; set; }
    /// <summary>Chủ điểm đã có bài học (UC-18); false = "Đang cập nhật".</summary>
    public bool HasArticle { get; set; }
    public string CardKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public int TotalQuestions { get; set; }
    public int PracticedCount { get; set; }
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
    public string Status { get; set; } = string.Empty;
    /// <summary>Số câu của chủ điểm là nội dung VIP mà người dùng chưa mở khóa.</summary>
    public int LockedCount { get; set; }
}
