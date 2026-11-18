namespace ToeicMind.DTOs.Exams.Response;
public class PartCatalogDto
{
    public byte PartNo { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string Skill { get; set; } = string.Empty;
    public short StandardQuestionCount { get; set; }
    public byte OptionCount { get; set; }
    /// <summary>Giây mỗi câu dùng để đề xuất thời gian thi theo Part (Nghe 27, Đọc 45).</summary>
    public short? DefaultSecondsPerQuestion { get; set; }
}
