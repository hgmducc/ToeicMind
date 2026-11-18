namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Một bài học được gợi ý, trỏ tới nội dung đã chia sẵn trong database (thẻ ngân hàng theo chủ điểm/Level, chủ điểm ngữ pháp, bộ clip nghe chép,
/// phiên ôn từ vựng, đề thi, bài kiểm tra đầu vào). Priority cao hơn đứng trước; IsToday = thuộc kế hoạch hôm nay (cộng dồn EstimatedMinutes tới DailyMinutes).
/// Kind: PLACEMENT, PROFILE, VOCAB_REVIEW, VOCAB_NEW, WEAK_TOPIC, LEVEL_PRACTICE, NEW_PART, DICTATION, MOCK_TEST.
/// </summary>
public class RecommendationDto
{
    public string Key { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public int Priority { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public int EstimatedMinutes { get; set; }
    public bool IsToday { get; set; }
    public RecommendationActionDto Action { get; set; } = new();
}

/// <summary>
/// Cách mở bài học. Type: PLACEMENT (mở /placement), PROFILE (mở hộp mục tiêu), BANK (POST /api/bank/attempts với PartNo, CardKey, Pick, LevelNo),
/// VOCAB (phiên học GET /api/vocab/study với VocabMode, Count), DICTATION (danh sách GET /api/dictation/items với DictationStatus, LevelNo, PartNo), EXAM (danh sách đề).
/// </summary>
public class RecommendationActionDto
{
    public string Type { get; set; } = string.Empty;
    public byte? PartNo { get; set; }
    public string? CardKey { get; set; }
    public string? Pick { get; set; }
    public byte? LevelNo { get; set; }
    public string? VocabMode { get; set; }
    public int? Count { get; set; }
    public string? DictationStatus { get; set; }
    public int? AttemptId { get; set; }
}
