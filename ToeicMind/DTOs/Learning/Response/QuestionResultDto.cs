namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Kết quả từng câu sau khi nộp (mọi chế độ; Luyện thi chỉ ẩn khi tắt Learning:AllowExamReview, BR-09 sửa 17/11/2026).</summary>
public class QuestionResultDto
{
    public int QuestionId { get; set; }
    public byte PartNo { get; set; }
    public short QuestionNo { get; set; }
    public int? SelectedOptionId { get; set; }
    public bool IsCorrect { get; set; }
    /// <summary>Nhãn phương án đã chọn (null nếu bỏ trống) và nhãn đáp án đúng, để hiện bảng đáp án ngay ở trang kết quả.</summary>
    public string? SelectedLabel { get; set; }
    public string? CorrectLabel { get; set; }
}
