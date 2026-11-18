namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Link media đã ký của một Part, nhóm theo nhóm câu hỏi. Dùng để tải audio/hình riêng sau khi đã có chữ, hoặc làm mới link hết hạn.</summary>
public class PartMediaDto
{
    public int ExamId { get; set; }
    public byte PartNo { get; set; }
    public List<GroupMediaDto> Groups { get; set; } = [];
}

/// <summary>Media của một nhóm câu hỏi.</summary>
public class GroupMediaDto
{
    public int GroupId { get; set; }
    public List<PlayMediaDto> Media { get; set; } = [];
}
