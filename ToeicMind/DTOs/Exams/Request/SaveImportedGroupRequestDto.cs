using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Exams.Request;

public class SaveImportedGroupRequestDto : SaveGroupRequestDto
{
    [Range(1, int.MaxValue)] public int? GroupId { get; set; }
}
