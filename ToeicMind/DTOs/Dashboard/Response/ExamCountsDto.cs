namespace ToeicMind.DTOs.Dashboard.Response;

/// <summary>Số liệu kho đề.</summary>
public class ExamCountsDto
{
    public int Sets { get; set; }
    public int Exams { get; set; }
    public int Published { get; set; }
    public int Draft { get; set; }
}
