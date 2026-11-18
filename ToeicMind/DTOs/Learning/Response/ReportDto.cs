namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một báo cáo lỗi nội dung. ReporterEmail chỉ dành cho Admin.</summary>
public class ReportDto
{
    public int ReportId { get; set; }
    public string TargetType { get; set; } = string.Empty;
    public int? QuestionId { get; set; }
    public int? VocabId { get; set; }
    public int? ArticleId { get; set; }
    public int? ListeningItemId { get; set; }
    /// <summary>Tên dễ đọc của nội dung bị báo: "Mã đề · Câu n", từ vựng, tiêu đề bài ngữ pháp, ghi chú bộ clip.</summary>
    public string? TargetTitle { get; set; }
    /// <summary>Đề chứa câu hỏi (để Admin mở màn sửa đề), hoặc đề của bộ clip cắt từ đề.</summary>
    public int? ExamId { get; set; }
    /// <summary>Nội dung đã bị xóa mềm hoặc không còn (UC-26 E1: đóng báo cáo kèm ghi chú).</summary>
    public bool TargetDeleted { get; set; }
    public string ErrorType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? AdminNote { get; set; }
    public string? ReporterEmail { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? HandledAt { get; set; }
}
