using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Ghi nhận một lượt Nghe chép xong một bộ clip. Mode: HIDE_SOME (ẩn một số từ), HIDE_ALL (ẩn toàn bộ), FLIP (lật từ), SHADOW (nghe và đọc theo). AccuracyPercent do client tính (0–100), bỏ trống với SHADOW.</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveDictationProgressRequestDto
{
    [Required, RegularExpression("^(HIDE_SOME|HIDE_ALL|FLIP|SHADOW)$", ErrorMessage = "Mode chỉ nhận HIDE_SOME, HIDE_ALL, FLIP hoặc SHADOW")]
    public string Mode { get; set; } = string.Empty;
    [Range(0, 100)]
    public decimal? AccuracyPercent { get; set; }
}
