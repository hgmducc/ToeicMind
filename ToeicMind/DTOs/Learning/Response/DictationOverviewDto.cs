namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Tổng quan Nghe chép: các bộ đề gốc (tab) và số bộ clip "câu cần luyện" của người học.</summary>
public class DictationOverviewDto
{
    public int TotalItems { get; set; }
    public int TotalClips { get; set; }
    public int PracticedItems { get; set; }
    public int NeedsPracticeItems { get; set; }
    /// <summary>Số bộ clip sưu tầm đã xuất bản (UC-28 TH2), không thuộc bộ đề nào; xem bằng GET /api/dictation/items?source=STANDALONE.</summary>
    public int StandaloneItems { get; set; }
    public List<DictationSetDto> Sets { get; set; } = [];
}
