using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Bộ lọc thẻ ngân hàng. CategoryId (ô "Tất cả chủ điểm") thu hẹp các thẻ Level; LevelNo thu hẹp các thẻ chủ điểm. Loại cha gồm cả loại con.</summary>
public class BankCardsRequestDto
{
    [Range(1, int.MaxValue)]
    public int? CategoryId { get; set; }
    [Range(1, 255)]
    public byte? LevelNo { get; set; }
}
