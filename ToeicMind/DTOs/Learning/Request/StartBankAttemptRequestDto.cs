using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>
/// Bắt đầu lượt học theo ngân hàng câu hỏi từ một thẻ. CardKey: level-N (Level), cat-N (chủ điểm, gồm cả loại con),
/// all (cả Part, luyện ngẫu nhiên) hoặc grammar (mọi chủ điểm ngữ pháp, chỉ Part 5). Pick: NEW (câu chưa luyện), WRONG (câu sai gần nhất), ALL (làm lại cả thẻ).
/// CategoryId/LevelNo (tùy chọn) thu hẹp thêm trong thẻ, ví dụ thẻ Level 3 chỉ trong một chủ điểm.
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class StartBankAttemptRequestDto
{
    [Range(1, 7)]
    public byte PartNo { get; set; }
    [Required, RegularExpression("^((level|cat)-[0-9]{1,9}|all|grammar)$", ErrorMessage = "CardKey có dạng level-N, cat-N, all hoặc grammar")]
    public string CardKey { get; set; } = string.Empty;
    [Required, RegularExpression("^(NEW|WRONG|ALL)$", ErrorMessage = "Pick chỉ nhận NEW, WRONG hoặc ALL")]
    public string Pick { get; set; } = string.Empty;
    [Range(1, int.MaxValue)]
    public int? CategoryId { get; set; }
    [Range(1, 255)]
    public byte? LevelNo { get; set; }
}
