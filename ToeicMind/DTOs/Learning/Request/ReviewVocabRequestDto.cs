using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Kết quả tự đánh giá một lượt ôn từ: 0 = Quên (Again), 1 = Khó (Hard), 2 = Nhớ (Good), 3 = Dễ (Easy).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class ReviewVocabRequestDto
{
    [Range(0, 3)]
    public byte Grade { get; set; }
}
