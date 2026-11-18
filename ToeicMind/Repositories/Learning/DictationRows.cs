using ToeicMind.Repositories.Exams;

namespace ToeicMind.Repositories.Learning;

/// <summary>
/// Một bộ clip Nghe chép kèm đề, bộ đề, phân loại, Level và tiến độ của người học (một dòng phẳng). VipOnly = bộ đề đặt quyền Nghe là VIP.
/// Bộ clip sưu tầm (UC-28 TH2) không có nhóm/đề/bộ đề: các cột đó null, phân loại và Level lấy từ chính bộ clip, SourceNote là ghi chú nguồn.
/// </summary>
public record DictationItemRow(int ItemId, int? GroupId, int? ExamId, string? ExamCode, string? ExamTitle, int? ExamSetId, string? ExamSetName,
    byte PartNo, short? GroupOrder, short? FirstQuestionNo, int CategoryId, byte? LevelNo, int ClipCount, double? DurationSeconds,
    int PracticeCount, decimal? LastAccuracy, decimal? BestAccuracy, string? LastMode, DateTime? LastPracticedAt, bool VipOnly, string? SourceNote = null);

/// <summary>Điều kiện lọc bộ clip; CategoryIds đã gồm cả các loại con. Source: EXAM (cắt từ đề), STANDALONE (sưu tầm) hoặc null (cả hai).</summary>
public record DictationFilter(int? ItemId = null, int? ExamSetId = null, int? ExamId = null, byte? PartNo = null,
    IReadOnlyCollection<int>? CategoryIds = null, byte? LevelNo = null, int? SpecialTagId = null, string? Source = null);

/// <summary>Một clip để nghe chép kèm khóa media audio chưa ký.</summary>
public record DictationClipRow(int ClipId, short Seq, string Role, string? Speaker, string TranscriptEn, string? TranslationVi,
    double? DurationSeconds, List<PlayMediaSource> Audio);

/// <summary>Tiến độ Nghe chép sau khi ghi.</summary>
public record DictationProgressRow(int PracticeCount, decimal? LastAccuracy, decimal? BestAccuracy, string? LastMode, DateTime LastPracticedAt);
