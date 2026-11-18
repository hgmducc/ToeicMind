using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Listening.Request;

/// <summary>Admin tạo/sửa bộ clip sưu tầm (TH2). Loại bài phải là phân loại lá của đúng Part; loại bài và Level bắt buộc trước khi xuất bản.</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveListeningItemRequestDto
{
    [Required, Range(1, 4)]
    public byte? PartNo { get; set; }
    [Range(1, int.MaxValue)]
    public int? CategoryId { get; set; }
    [Range(1, 255)]
    public byte? LevelNo { get; set; }
    [MaxLength(200)]
    public string? SourceNote { get; set; }
}
