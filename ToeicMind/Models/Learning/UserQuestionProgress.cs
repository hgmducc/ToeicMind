using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Learning;

/// <summary>Kết quả lần trả lời gần nhất của người học cho một câu (chỉ ghi ở Luyện tập và ngân hàng, BR-26). Chưa có dòng nghĩa là chưa luyện.</summary>
[Table("UserQuestionProgress", Schema = "dbo")]
[PrimaryKey(nameof(UserId), nameof(QuestionId))]
public class UserQuestionProgress
{
    public int UserId { get; set; }
    public int QuestionId { get; set; }
    public bool LastIsCorrect { get; set; }
    public DateTime LastAnsweredAt { get; set; }
}
