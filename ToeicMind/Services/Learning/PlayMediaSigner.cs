using ToeicMind.Repositories.Exams;
using ToeicMind.Services.Diagnostics;
using ToeicMind.Services.Media;

namespace ToeicMind.Services.Learning;

/// <summary>Ký link đọc media (R2) cho người học. Ký xong mới trả về nên link luôn còn hạn; lỗi kho media không làm hỏng cả đề, link lỗi để rỗng.</summary>
public class PlayMediaSigner
{
    private readonly IMediaStorage _storage;
    private readonly IConfiguration _config;
    private readonly ILogger<PlayMediaSigner> _logger;
    private readonly RequestTimings _timings;

    public PlayMediaSigner(IMediaStorage storage, IConfiguration config, ILogger<PlayMediaSigner> logger, RequestTimings timings)
    {
        _storage = storage;
        _config = config;
        _logger = logger;
        _timings = timings;
    }

    public Task<List<PlayMediaDto>> SignAsync(IReadOnlyCollection<PlayMediaSource> media) =>
        media.Count == 0 ? Task.FromResult(new List<PlayMediaDto>()) : _timings.MeasureAsync("sign", async () =>
        {
            var lifetime = TimeSpan.FromMinutes(Math.Clamp(_config.GetValue<int?>("R2:SignedUrlMinutes") ?? 10, 1, 60));
            var signed = await Task.WhenAll(media.Select(m => SignOneAsync(m, lifetime)));
            return signed.ToList();
        });

    private async Task<PlayMediaDto> SignOneAsync(PlayMediaSource source, TimeSpan lifetime)
    {
        var dto = new PlayMediaDto
        {
            MediaId = source.MediaId, ClipId = source.ClipId, MediaType = source.MediaType,
            AltText = source.AltText, SortOrder = source.SortOrder
        };
        try
        {
            (dto.Url, dto.ExpiresAt) = await _storage.SignReadAsync(source.StorageKey, lifetime);
        }
        catch (Exception ex) when (ex is Amazon.Runtime.AmazonClientException or HttpRequestException or InvalidOperationException or IOException or TimeoutException)
        {
            _logger.LogError(ex, "Ký link media {MediaId} thất bại: {ErrorType}", source.MediaId, ex.GetType().Name);
            _timings.Note("sign-failed");
        }
        return dto;
    }
}
