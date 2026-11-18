namespace ToeicMind.Services.Learning;

/// <summary>Kết quả lấy nội dung vào thi: dữ liệu, mã lỗi nghiệp vụ, ETag và cờ NotModified (client đã có bản mới nhất, trả 304).</summary>
public record PlayResult<T>(T? Value, string? Error, string? ETag = null, bool NotModified = false)
{
    public static PlayResult<T> Fail(string error) => new(default, error);
}
