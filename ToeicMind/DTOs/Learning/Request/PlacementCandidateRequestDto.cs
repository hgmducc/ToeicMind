using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Bộ lọc nhóm câu hỏi để Admin chọn vào bài kiểm tra đầu vào: chỉ nhóm của đề đã xuất bản, chưa xóa.</summary>
public class PlacementCandidateRequestDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
    [Range(1, 7)]
    public byte? PartNo { get; set; }
    [Range(1, int.MaxValue)]
    public int? ExamId { get; set; }
    [Range(1, 255)]
    public byte? LevelNo { get; set; }
    /// <summary>Phân loại (gồm cả loại con).</summary>
    [Range(1, int.MaxValue)]
    public int? CategoryId { get; set; }
    [MaxLength(100)]
    public string? Search { get; set; }
}
