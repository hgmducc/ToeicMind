namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một Part của đề: số câu, thời gian đề xuất khi thi riêng Part này và dàn ý các nhóm câu hỏi.</summary>
public class ModePartDto
{
    public byte PartNo { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string Skill { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    /// <summary>Thời gian đề xuất (giây) = số câu × giây mỗi câu của Part. Thi nhiều Part thì cộng các Part đã chọn.</summary>
    public int SuggestedSeconds { get; set; }
    /// <summary>Dàn ý các nhóm câu hỏi (không có chữ) để dựng thanh điều hướng; nội dung từng Part lấy ở GET /api/exams/{id}/parts/{partNo}.</summary>
    public List<GroupOutlineDto> Groups { get; set; } = [];
}
