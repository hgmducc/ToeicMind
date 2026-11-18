using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Bộ lọc lịch sử làm bài.</summary>
public class AttemptListRequestDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
    [RegularExpression("^(EXAM|PRACTICE)$")]
    public string? Mode { get; set; }
    [RegularExpression("^(FULL|LISTENING|READING|PART|BANK|PLACEMENT)$")]
    public string? Scope { get; set; }
    [RegularExpression("^(IN_PROGRESS|SUBMITTED|ABANDONED|ERROR)$")]
    public string? Status { get; set; }
}
