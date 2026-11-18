using System.Diagnostics;
using System.Globalization;

namespace ToeicMind.Services.Diagnostics;

/// <summary>Đo thời gian từng bước của một request (truy vấn SQL, ghép dữ liệu, ký URL...) và trả về qua header Server-Timing để biết bước nào chậm. Đăng ký Scoped.</summary>
public class RequestTimings
{
    private readonly List<(string Name, double Ms)> _steps = [];

    public bool Any => _steps.Count > 0;
    public double TotalMs => _steps.Sum(s => s.Ms);

    /// <summary>Chạy một bước bất đồng bộ và ghi lại thời gian.</summary>
    public async Task<T> MeasureAsync<T>(string name, Func<Task<T>> step)
    {
        var start = Stopwatch.GetTimestamp();
        try { return await step(); }
        finally { _steps.Add((name, Stopwatch.GetElapsedTime(start).TotalMilliseconds)); }
    }

    /// <summary>Chạy một bước đồng bộ và ghi lại thời gian.</summary>
    public T Measure<T>(string name, Func<T> step)
    {
        var start = Stopwatch.GetTimestamp();
        try { return step(); }
        finally { _steps.Add((name, Stopwatch.GetElapsedTime(start).TotalMilliseconds)); }
    }

    /// <summary>Ghi một mốc không tốn thời gian (ví dụ "cache-hit") để thấy trong header.</summary>
    public void Note(string name) => _steps.Add((name, 0));

    /// <summary>Giá trị header, ví dụ: groups;dur=12.3, questions;dur=40.1</summary>
    public string ToHeader() => string.Join(", ",
        _steps.Select(s => $"{s.Name};dur={s.Ms.ToString("0.0", CultureInfo.InvariantCulture)}"));
}
