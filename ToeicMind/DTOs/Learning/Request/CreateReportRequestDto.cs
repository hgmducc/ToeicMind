using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>
/// Báo lỗi nội dung (UC-14), gắn đúng một đối tượng: QuestionId khi TargetType = QUESTION, VocabId khi VOCABULARY,
/// ArticleId khi GRAMMAR_ARTICLE, ListeningItemId khi LISTENING_ITEM (bộ clip Nghe chép). Description bắt buộc khi ErrorType = OTHER.
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class CreateReportRequestDto
{
    [Required, RegularExpression("^(QUESTION|VOCABULARY|GRAMMAR_ARTICLE|LISTENING_ITEM)$",
        ErrorMessage = "TargetType chỉ nhận QUESTION, VOCABULARY, GRAMMAR_ARTICLE hoặc LISTENING_ITEM")]
    public string TargetType { get; set; } = string.Empty;
    [Range(1, int.MaxValue)]
    public int? QuestionId { get; set; }
    [Range(1, int.MaxValue)]
    public int? VocabId { get; set; }
    [Range(1, int.MaxValue)]
    public int? ArticleId { get; set; }
    [Range(1, int.MaxValue)]
    public int? ListeningItemId { get; set; }
    [Required, RegularExpression("^(WRONG_ANSWER|WRONG_EXPLANATION|MEDIA_ERROR|TYPO|OTHER)$", ErrorMessage = "ErrorType không hợp lệ")]
    public string ErrorType { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? Description { get; set; }
}
