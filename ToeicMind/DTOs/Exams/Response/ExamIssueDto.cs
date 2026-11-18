namespace ToeicMind.DTOs.Exams.Response;
public class ExamIssueDto
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public byte? PartNo { get; set; }
    public int? GroupId { get; set; }
    public int? QuestionId { get; set; }
}
