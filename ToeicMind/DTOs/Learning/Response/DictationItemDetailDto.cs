namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Chi tiết một bộ clip Nghe chép: thông tin bộ clip và danh sách clip theo thứ tự.</summary>
public class DictationItemDetailDto
{
    public DictationItemDto Item { get; set; } = new();
    public List<DictationClipDto> Clips { get; set; } = [];
    /// <summary>Bản dịch cả nhóm (Admin nhập ở mức nhóm). Client hiển thị khi clip không có bản dịch riêng (Part 3, 4).</summary>
    public string? GroupTranslationVi { get; set; }
}
