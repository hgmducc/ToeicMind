namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một thẻ trong ngân hàng câu hỏi (theo Level hoặc chủ điểm) kèm tiến độ của người học: đã luyện / tổng, đúng, sai gần nhất.</summary>
public class BankCardDto
{
    /// <summary>Khóa thẻ dùng khi bắt đầu học: level-N hoặc cat-N.</summary>
    public string CardKey { get; set; } = string.Empty;
    /// <summary>LEVEL hoặc CATEGORY.</summary>
    public string Kind { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Nhãn ngắn của Level (ví dụ "Dưới 300 điểm"); chủ điểm để trống.</summary>
    public string? ShortLabel { get; set; }
    public int TotalQuestions { get; set; }
    public int PracticedCount { get; set; }
    /// <summary>Số câu lần trả lời gần nhất đúng.</summary>
    public int CorrectCount { get; set; }
    /// <summary>Số câu lần trả lời gần nhất sai.</summary>
    public int WrongCount { get; set; }
    /// <summary>NEW (chưa luyện), IN_PROGRESS, DONE (đã luyện hết).</summary>
    public string Status { get; set; } = string.Empty;
    /// <summary>Số câu của thẻ là nội dung VIP mà người dùng hiện tại chưa mở khóa (khách và người chưa có VIP); 0 nếu đã có VIP. Học thẻ chỉ lấy các câu miễn phí.</summary>
    public int LockedCount { get; set; }
    /// <summary>Tên các chủ điểm con trực tiếp (chỉ thẻ chủ điểm), để hiển thị gợi ý như "Danh · động · tính · trạng · giới từ".</summary>
    public List<string> Children { get; set; } = [];
}
