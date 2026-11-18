using ToeicMind.Models.Learning;

namespace ToeicMind.Services.Learning;

/// <summary>
/// Thuật toán lặp lại ngắt quãng cho từ vựng (SM-2 cải biên, thuần tính toán, không truy cập dữ liệu).
/// Mức đánh giá: 0 Quên, 1 Khó, 2 Nhớ, 3 Dễ. Quên đưa từ về đầu chu kỳ và hẹn ôn lại sau 10 phút (trong cùng phiên học).
/// Khoảng cách ôn: lần đầu 1 ngày (Dễ: 4 ngày), lần hai 3 ngày (Dễ: 7 ngày), sau đó nhân hệ số dễ EaseFactor (1,3–3,0).
/// Khoảng cách từ 21 ngày trở lên coi là đã thuộc (MASTERED).
/// </summary>
public static class VocabScheduler
{
    public const decimal DefaultEase = 2.5m;
    public const decimal MinEase = 1.3m;
    public const decimal MaxEase = 3.0m;
    public const int MaxIntervalDays = 365;
    public const int MasteredIntervalDays = 21;
    public const int AgainMinutes = 10;

    /// <summary>Tính trạng thái mới của từ sau một lượt đánh giá. existing = null nghĩa là từ chưa từng học.</summary>
    public static UserVocabProgress Next(UserVocabProgress? existing, int userId, int vocabId, byte grade, DateTime now)
    {
        var reps = existing?.Repetitions ?? 0;
        var interval = existing?.IntervalDays ?? 0;
        var ease = existing?.EaseFactor ?? DefaultEase;
        var lapses = existing?.Lapses ?? 0;
        var next = now;

        switch (grade)
        {
            case 0:
                reps = 0; interval = 0; lapses++;
                ease = Math.Max(MinEase, ease - 0.20m);
                next = now.AddMinutes(AgainMinutes);
                break;
            case 1:
                interval = reps == 0 ? 1 : Math.Max(interval + 1, (int)Math.Round(interval * 1.2));
                reps = (short)Math.Max((int)reps, 1);
                ease = Math.Max(MinEase, ease - 0.15m);
                break;
            case 2:
                interval = reps == 0 ? 1 : reps == 1 ? 3 : Math.Max(interval + 1, (int)Math.Round(interval * (double)ease));
                reps++;
                break;
            default:
                interval = reps == 0 ? 4 : reps == 1 ? 7 : Math.Max(interval + 2, (int)Math.Round(interval * (double)ease * 1.3));
                reps++;
                ease = Math.Min(MaxEase, ease + 0.15m);
                break;
        }
        if (grade != 0)
        {
            interval = Math.Clamp(interval, 1, MaxIntervalDays);
            next = now.AddDays(interval);
        }

        return new UserVocabProgress
        {
            UserId = userId, VocabId = vocabId, Repetitions = reps, IntervalDays = interval, EaseFactor = ease, Lapses = lapses,
            Status = interval >= MasteredIntervalDays ? "MASTERED" : "LEARNING",
            TotalReviews = (existing?.TotalReviews ?? 0) + 1,
            CorrectReviews = (existing?.CorrectReviews ?? 0) + (grade >= 2 ? 1 : 0),
            LastGrade = grade,
            FirstSeenAt = existing?.FirstSeenAt ?? now, LastReviewedAt = now, NextReviewAt = next
        };
    }

    /// <summary>Thời gian (phút) đến lần ôn kế tiếp ứng với 4 mức đánh giá, để hiện trên nút bấm.</summary>
    public static int[] PreviewMinutes(UserVocabProgress? existing, DateTime now)
    {
        var result = new int[4];
        for (byte g = 0; g < 4; g++)
            result[g] = (int)Math.Round((Next(existing, 0, 0, g, now).NextReviewAt - now).TotalMinutes);
        return result;
    }
}
