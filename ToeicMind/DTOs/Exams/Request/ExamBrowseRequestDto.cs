using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Exams.Request;

public class ExamBrowseRequestDto : ExamPageRequestDto
{
    [Range(1, int.MaxValue)]
    public int? ExamSetId { get; set; }
}
