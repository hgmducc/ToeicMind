using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ToeicMind.DTOs.Exams.Request;

public class SaveExamContentRequestDto : SaveExamRequestDto
{
    [Required, MinLength(1), MaxLength(200)]
    public List<SaveImportedGroupRequestDto> Groups { get; set; } = [];
    // Giữ nguyên các sheet nguồn để đối soát, không coi Dict/Media là nội dung câu hỏi.
    public Dictionary<string, JsonElement>? SourceSheets { get; set; }
}
