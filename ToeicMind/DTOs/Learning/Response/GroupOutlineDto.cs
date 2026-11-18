namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một nhóm câu hỏi trong dàn ý: số câu và có audio/hình hay không.</summary>
public class GroupOutlineDto
{
    public int GroupId { get; set; }
    public short GroupOrder { get; set; }
    public short FirstQuestionNo { get; set; }
    public int QuestionCount { get; set; }
    public bool HasAudio { get; set; }
    public bool HasImage { get; set; }
}
