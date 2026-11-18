namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một mục của ô chọn "Tất cả chủ điểm / dạng tranh (N)": phân loại, độ sâu trong cây và số câu (đã cộng các loại con).</summary>
public class BankCategoryOptionDto
{
    public int CategoryId { get; set; }
    public int? ParentCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Depth { get; set; }
    public bool IsLeaf { get; set; }
    public int QuestionCount { get; set; }
}
