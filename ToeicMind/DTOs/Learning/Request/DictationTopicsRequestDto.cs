using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Bộ lọc "Theo chủ đề" của Nghe chép. Bỏ trống PartNo để lấy cả Part 1–4.</summary>
public class DictationTopicsRequestDto
{
    [Range(1, 4)]
    public byte? PartNo { get; set; }
}
