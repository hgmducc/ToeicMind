namespace ToeicMind.Services.Media;

/// <summary>Kiểm tra nội dung tệp media thật sự khớp định dạng khai báo (MP3, WAV, PNG, JPEG, WebP).</summary>
public static class MediaFileValidator
{
    public static (string? Type, string? ContentType) Detect(ReadOnlySpan<byte> bytes, string extension)
    {
        if (extension == ".mp3" && bytes.Length >= 3 &&
            (bytes[..3].SequenceEqual("ID3"u8) || bytes[0] == 0xff && (bytes[1] & 0xe0) == 0xe0)) return ("AUDIO", "audio/mpeg");
        if (extension == ".wav" && bytes.Length >= 44 && bytes[..4].SequenceEqual("RIFF"u8) && bytes.Slice(8,4).SequenceEqual("WAVE"u8)) return ("AUDIO", "audio/wav");
        if (extension == ".png" && bytes.Length >= 24 && bytes[..8].SequenceEqual(new byte[] { 137,80,78,71,13,10,26,10 })) return ("IMAGE", "image/png");
        if (extension is ".jpg" or ".jpeg" && bytes.Length >= 4 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff
            && ContainsJpegEoi(bytes)) return ("IMAGE", "image/jpeg");
        // WebP: RIFF????WEBP — chấp nhận mọi extension ảnh (.webp, .jpg, .jpeg, .png)
        if (extension is ".webp" or ".jpg" or ".jpeg" or ".png"
            && bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes.Slice(8,4).SequenceEqual("WEBP"u8))
            return ("IMAGE", "image/webp");
        return (null, null);
    }

    // Tìm marker kết thúc FF D9 trong tối đa 64 byte cuối file.
    // Một số encoder/tool thêm padding sau marker; kiểm tra exact-last-2 sẽ từ chối file hợp lệ.
    private static bool ContainsJpegEoi(ReadOnlySpan<byte> bytes)
    {
        var tail = bytes[^Math.Min(64, bytes.Length)..];
        for (var i = 0; i < tail.Length - 1; i++)
            if (tail[i] == 0xff && tail[i + 1] == 0xd9) return true;
        return false;
    }
}
