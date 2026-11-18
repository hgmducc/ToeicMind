using System.Text.Json;
using System.Text.Json.Serialization;

namespace ToeicMind.Services.Json;

/// <summary>
/// Thời điểm lưu trong SQL là UTC nhưng đọc ra có Kind = Unspecified, nên JSON không có hậu tố "Z" và trình duyệt hiểu nhầm là giờ địa phương.
/// Bộ chuyển này ghi mọi giá trị Unspecified như UTC ("2026-11-03T08:00:00Z"); giá trị đã có Kind giữ nguyên.
/// </summary>
public class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) => reader.GetDateTime();

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(value, DateTimeKind.Utc) : value);
}
