namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Phân tích một kỹ năng (LISTENING Part 1–4, READING Part 5–7): điểm ước tính, điểm mục tiêu của kỹ năng (nửa điểm mục tiêu tổng),
/// khoảng cách còn thiếu, Level hiện tại và Level nên luyện (Level hiện tại, lên một Level khi đã đúng từ 75% câu đã luyện ở Level đó).
/// </summary>
public class SkillInsightDto
{
    public string Skill { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int? EstimatedScaled { get; set; }
    public string? Source { get; set; }
    public int? TargetScaled { get; set; }
    public int? Gap { get; set; }
    public LevelInfoDto? Level { get; set; }
    public LevelInfoDto? PracticeLevel { get; set; }
    public int Answered { get; set; }
    public int Correct { get; set; }
    public double? AccuracyPercent { get; set; }
    /// <summary>Kỹ năng được ưu tiên luyện (khoảng cách tới mục tiêu lớn hơn, hoặc độ chính xác thấp hơn khi chưa có mục tiêu).</summary>
    public bool IsFocus { get; set; }
}
