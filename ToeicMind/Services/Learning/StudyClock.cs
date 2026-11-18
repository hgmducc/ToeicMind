namespace ToeicMind.Services.Learning;

/// <summary>Ngày học theo múi giờ cấu hình (Learning:UtcOffsetHours, mặc định UTC+7) để chuỗi ngày học khớp ngày của người dùng.</summary>
public static class StudyClock
{
    public static double OffsetHours(this IConfiguration config) => config.GetValue<double?>("Learning:UtcOffsetHours") ?? 7;

    public static DateOnly StudyDate(this IConfiguration config, DateTime utc) => DateOnly.FromDateTime(utc.AddHours(config.OffsetHours()));

    public static DateOnly StudyToday(this IConfiguration config) => config.StudyDate(DateTime.UtcNow);
}
