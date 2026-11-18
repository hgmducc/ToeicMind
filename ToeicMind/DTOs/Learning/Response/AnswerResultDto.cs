namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Kết quả lưu một đáp án. Feedback có khi Luyện tập / ngân hàng, không có khi Luyện thi.</summary>
public class AnswerResultDto
{
    public int QuestionId { get; set; }
    public int? SelectedOptionId { get; set; }
    public AnswerFeedbackDto? Feedback { get; set; }
}
