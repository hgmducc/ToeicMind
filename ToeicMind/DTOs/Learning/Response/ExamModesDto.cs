namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Cấu trúc và chế độ làm bài của một đề (công khai, không có chữ câu hỏi): Parts kèm số câu, thời gian đề xuất và dàn ý nhóm.
/// Luyện thi: ExamOptions (trọn đề, Nghe, Đọc) hoặc Thi theo Part (chọn nhiều Part từ Parts, có thể tự đặt thời gian trong khoảng Min–Max).
/// Luyện tập: PracticeOptions (chọn tất cả Part) hoặc chọn Part bất kỳ từ Parts, không có đồng hồ.
/// </summary>
public class ExamModesDto
{
    public int ExamId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int ExamSetId { get; set; }
    /// <summary>Quyền làm đề: FREE (mọi tài khoản đã đăng nhập) hoặc VIP (cần gói VIP). Khách và người chưa có VIP nhận 402 VIP_REQUIRED khi bắt đầu/tải nội dung đề VIP.</summary>
    public string Access { get; set; } = "FREE";
    public int TotalQuestions { get; set; }
    public int MinTimeLimitSeconds { get; set; }
    public int MaxTimeLimitSeconds { get; set; }
    public List<ModePartDto> Parts { get; set; } = [];
    public List<ModeOptionDto> ExamOptions { get; set; } = [];
    public List<ModeOptionDto> PracticeOptions { get; set; } = [];
}
