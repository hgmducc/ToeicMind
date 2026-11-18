namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một nhóm chủ điểm ngữ pháp (ví dụ Từ loại, Động từ, Ngữ pháp khác) gồm các chủ điểm con.</summary>
public class GrammarGroupDto
{
    public int CategoryId { get; set; }
    public string CardKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int TopicCount { get; set; }
    public int TotalQuestions { get; set; }
    public int PracticedCount { get; set; }
    public int WrongCount { get; set; }
    public List<GrammarTopicDto> Topics { get; set; } = [];
}
