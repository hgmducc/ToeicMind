using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Listening.Request;

/// <summary>Lọc bộ clip sưu tầm theo Part, trạng thái xuất bản, đã xóa, ghi chú nguồn.</summary>
public class ListeningItemListRequestDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
    [Range(1, 4)]
    public byte? PartNo { get; set; }
    public bool? IsPublished { get; set; }
    public bool IsDeleted { get; set; }
    [MaxLength(200)]
    public string? Search { get; set; }
}
