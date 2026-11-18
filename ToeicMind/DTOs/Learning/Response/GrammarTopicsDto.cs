namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Tab Ngữ pháp: các nhóm chủ điểm và chủ điểm của Part 5 kèm tiến độ. Nút "Luyện ngẫu nhiên" dùng CardKey = grammar (hoặc cat-{nhóm} khi đang lọc một nhóm).</summary>
public class GrammarTopicsDto
{
    public int TotalQuestions { get; set; }
    public int PracticedCount { get; set; }
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
    public List<GrammarGroupDto> Groups { get; set; } = [];
}
