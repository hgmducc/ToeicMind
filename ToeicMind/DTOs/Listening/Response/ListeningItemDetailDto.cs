namespace ToeicMind.DTOs.Listening.Response;

/// <summary>Chi tiết bộ clip sưu tầm và các clip theo thứ tự.</summary>
public class ListeningItemDetailDto
{
    public ListeningItemSummaryDto Item { get; set; } = new();
    public List<ListeningClipAdminDto> Clips { get; set; } = [];
}
