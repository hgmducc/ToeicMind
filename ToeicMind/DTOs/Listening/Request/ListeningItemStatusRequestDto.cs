using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Listening.Request;

/// <summary>Xuất bản (true) hoặc ẩn (false) bộ clip sưu tầm.</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class ListeningItemStatusRequestDto
{
    [Required]
    public bool? IsPublished { get; set; }
}
