using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Exams.Request;

public class ExamPageRequestDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    [MaxLength(200)]
    public string? Search { get; set; }
}
