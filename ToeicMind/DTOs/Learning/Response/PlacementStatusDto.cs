namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Trạng thái kiểm tra đầu vào của người học: có bài đang dùng không (Available, Test), lượt đang làm dở (InProgressAttemptId)
/// và kết quả gần nhất (LastResult, kể cả khi bài đó đã được Admin thay).
/// </summary>
public class PlacementStatusDto
{
    public bool Available { get; set; }
    public PlacementTestInfoDto? Test { get; set; }
    public int? InProgressAttemptId { get; set; }
    public PlacementResultDto? LastResult { get; set; }
}
