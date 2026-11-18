using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.Services.Learning;

/// <summary>
/// Quy đổi giữa điểm TOEIC từng kỹ năng (5–495) và Level của bảng LevelBand (seed: Level 1 dưới 200, Level 2 200–300, Level 3 300–400, Level 4 400–495).
/// Dùng cho ước tính trình độ (kiểm tra đầu vào, lộ trình cá nhân) và chọn Level nên luyện trong ngân hàng câu hỏi/nghe chép.
/// </summary>
public static class ScoreBands
{
    public const int SkillMax = 495;

    public static byte LevelFor(int skillScaled) => skillScaled switch
    {
        < 200 => 1,
        < 300 => 2,
        < 400 => 3,
        _ => 4
    };

    /// <summary>Số câu đúng quy về thang 100 câu (bảng ScoreConversion chỉ có 0–100 câu mỗi kỹ năng).</summary>
    public static int Per100(int correct, int total) =>
        total <= 0 ? 0 : Math.Clamp((int)Math.Round(100.0 * correct / total, MidpointRounding.AwayFromZero), 0, 100);

    /// <summary>Thông tin Level trong danh mục; null nếu danh mục không có Level đó.</summary>
    public static LevelInfoDto? Info(byte? levelNo, IEnumerable<LevelCatalogDto> levels) =>
        levelNo is not { } no ? null : levels.Where(l => l.LevelNo == no)
            .Select(l => new LevelInfoDto { LevelNo = l.LevelNo, Name = l.NameVi, ShortLabel = l.ShortLabel }).FirstOrDefault();

    /// <summary>Làm tròn lên bội số của 5 (điểm TOEIC luôn là bội số của 5).</summary>
    public static int RoundUp5(double value) => (int)Math.Ceiling(value / 5.0) * 5;
}
