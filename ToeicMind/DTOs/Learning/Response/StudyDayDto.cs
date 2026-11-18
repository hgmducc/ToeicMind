namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một ngày học và số lần làm bài trong ngày.</summary>
public class StudyDayDto
{
    public DateOnly Date { get; set; }
    public int AttemptCount { get; set; }
}
