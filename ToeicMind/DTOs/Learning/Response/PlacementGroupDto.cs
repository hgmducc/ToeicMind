namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Một nhóm câu hỏi (ứng viên hoặc đã chọn) của bài kiểm tra đầu vào, đủ để Admin nhận diện: đề gốc, Part, số câu, Level, phân loại, đoạn trích câu hỏi.
/// IsAvailable = false khi nhóm/câu/đề đã bị xóa sau khi chọn (người học sẽ không gặp nhóm này).
/// </summary>
public class PlacementGroupDto
{
    public int GroupId { get; set; }
    public int ExamId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string ExamTitle { get; set; } = string.Empty;
    public byte PartNo { get; set; }
    public short GroupOrder { get; set; }
    public int QuestionCount { get; set; }
    public short? FirstQuestionNo { get; set; }
    public short? LastQuestionNo { get; set; }
    public byte? LevelNo { get; set; }
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? Preview { get; set; }
    public bool HasAudio { get; set; }
    public bool HasImage { get; set; }
    public bool IsAvailable { get; set; } = true;
}
