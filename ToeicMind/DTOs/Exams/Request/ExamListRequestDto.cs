using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Exams.Request;

public class ExamListRequestDto : ExamBrowseRequestDto
{
    [RegularExpression("DRAFT|PUBLISHED")]
    public string? Status { get; set; }

    public bool IsDeleted { get; set; }
}
