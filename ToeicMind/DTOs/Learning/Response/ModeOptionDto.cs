namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một lựa chọn phạm vi cố định (trọn đề, phần Nghe, phần Đọc) trong hộp "Chọn chế độ".</summary>
public class ModeOptionDto
{
    /// <summary>FULL, LISTENING hoặc READING (dùng làm Scope khi POST /api/attempts).</summary>
    public string Scope { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<byte> PartNos { get; set; } = [];
    public int QuestionCount { get; set; }
    /// <summary>Thời gian mặc định của Luyện thi (giây); Luyện tập không có đồng hồ. Null với lựa chọn chỉ dùng cho Luyện tập.</summary>
    public int? TimeLimitSeconds { get; set; }
}
