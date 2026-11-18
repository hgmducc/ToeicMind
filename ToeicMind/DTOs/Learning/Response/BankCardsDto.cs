namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Các thẻ ngân hàng câu hỏi của một Part (Part 1–7). LevelCards: mỗi Level một thẻ (theo bảng LevelBand). CategoryCards: các nhóm chủ điểm
/// ở cấp cao nhất (nếu chỉ có một nút gốc thì lấy các nút con của nó). Categories: toàn bộ cây phân loại cho ô lọc.
/// </summary>
public class BankCardsDto
{
    public byte PartNo { get; set; }
    /// <summary>Tổng số câu của Part (đã áp bộ lọc Level nếu có) — số hiển thị ở mục "Tất cả".</summary>
    public int TotalQuestions { get; set; }
    public List<BankCardDto> LevelCards { get; set; } = [];
    public List<BankCardDto> CategoryCards { get; set; } = [];
    public List<BankCategoryOptionDto> Categories { get; set; } = [];
}
