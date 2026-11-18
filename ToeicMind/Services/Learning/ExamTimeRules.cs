namespace ToeicMind.Services.Learning;

/// <summary>
/// Quy tắc thời gian của Luyện thi. Trọn đề 120 phút, phần Nghe 45 phút, phần Đọc 75 phút; thi theo Part thì đề xuất
/// bằng tổng (số câu × giây mỗi câu của Part). Người học được tự đặt thời gian khác trong khoảng cho phép.
/// </summary>
public static class ExamTimeRules
{
    public const int FullSeconds = 7200;
    public const int ListeningSeconds = 2700;
    public const int ReadingSeconds = 4500;
    public const int MinSeconds = 60;
    public const int MaxSeconds = 14400;

    // Giây mặc định mỗi câu khi bảng PartSetting chưa có giá trị: Nghe 27 giây, Đọc 45 giây.
    public static int DefaultSecondsPerQuestion(byte partNo) => partNo <= 4 ? 27 : 45;

    /// <summary>Thời gian mặc định của phạm vi cố định (FULL, LISTENING, READING); null nếu phạm vi là PART (phải tính theo các Part chọn).</summary>
    public static int? DefaultFor(string scope) => scope switch
    {
        AttemptScope.Full => FullSeconds,
        AttemptScope.Listening => ListeningSeconds,
        AttemptScope.Reading => ReadingSeconds,
        _ => null
    };

    /// <summary>Thời gian đề xuất cho một nhóm câu theo từng Part.</summary>
    public static int Suggested(IEnumerable<(byte PartNo, int QuestionCount)> parts, IReadOnlyDictionary<byte, short?> secondsPerQuestion)
    {
        var seconds = parts.Sum(p => p.QuestionCount * (secondsPerQuestion.GetValueOrDefault(p.PartNo) is { } v ? v : DefaultSecondsPerQuestion(p.PartNo)));
        return Math.Clamp(seconds, MinSeconds, MaxSeconds);
    }
}
