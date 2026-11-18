namespace ToeicMind.Services.Media;

/// <summary>Hợp đồng kho lưu tệp media (hiện dùng Cloudflare R2).</summary>
public interface IMediaStorage
{
    Task PutAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default);
    Task DeleteUncommittedAsync(string key, CancellationToken cancellationToken = default);
    Task<(string Url, DateTime ExpiresAt)> SignReadAsync(string key, TimeSpan lifetime);
}
