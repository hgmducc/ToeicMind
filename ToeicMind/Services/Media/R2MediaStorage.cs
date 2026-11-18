using System.Text.RegularExpressions;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace ToeicMind.Services.Media;

/// <summary>Lưu và đọc tệp media trên Cloudflare R2 qua giao thức S3 (bucket riêng tư, đọc bằng link ký có hạn).</summary>
public class R2MediaStorage : IMediaStorage, IDisposable
{
    private readonly IConfiguration _config;
    private AmazonS3Client? _client;
    public R2MediaStorage(IConfiguration config) => _config = config;

    private AmazonS3Client Client
    {
        get
        {
            if (_client is not null) return _client;
            var endpoint = _config["R2:Endpoint"] ?? string.Empty;
            var access = _config["R2:AccessKeyId"];
            var secret = _config["R2:SecretAccessKey"];
            if (!Regex.IsMatch(endpoint, @"^https://[a-f0-9]{32}(\.eu|\.fedramp)?\.r2\.cloudflarestorage\.com/?$") ||
                string.IsNullOrWhiteSpace(access) || string.IsNullOrWhiteSpace(secret))
                throw new InvalidOperationException("R2 configuration is missing or invalid.");
            _client = new AmazonS3Client(new BasicAWSCredentials(access, secret), new AmazonS3Config
            {
                ServiceURL = endpoint.TrimEnd('/'), AuthenticationRegion = "auto", ForcePathStyle = true,
                RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED
            });
            return _client;
        }
    }

    private string Bucket => Regex.IsMatch(_config["R2:BucketName"] ?? string.Empty, @"^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$")
        ? _config["R2:BucketName"]! : throw new InvalidOperationException("R2 bucket is missing or invalid.");

    public async Task PutAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default)
    {
        ValidateKey(key);
        await Client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = Bucket, Key = key, InputStream = content, ContentType = contentType,
            AutoCloseStream = false, UseChunkEncoding = false, DisablePayloadSigning = true
        }, cancellationToken);
    }

    public async Task DeleteUncommittedAsync(string key, CancellationToken cancellationToken = default)
    {
        ValidateKey(key);
        await Client.DeleteObjectAsync(new DeleteObjectRequest { BucketName = Bucket, Key = key }, cancellationToken);
    }

    public async Task<(string Url, DateTime ExpiresAt)> SignReadAsync(string key, TimeSpan lifetime)
    {
        ValidateKey(key);
        if (lifetime < TimeSpan.FromMinutes(1) || lifetime > TimeSpan.FromHours(1)) throw new ArgumentOutOfRangeException(nameof(lifetime));
        var expiresAt = DateTime.UtcNow.Add(lifetime);
        var url = await Client.GetPreSignedURLAsync(new GetPreSignedUrlRequest
        { BucketName = Bucket, Key = key, Verb = HttpVerb.GET, Expires = expiresAt, Protocol = Protocol.HTTPS });
        return (url, expiresAt);
    }

    private static void ValidateKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Length > 500 || key.StartsWith('/') || key.Contains("..") ||
            key.Contains('\\') || key.Any(char.IsControl) || key.IndexOfAny([':', '?', '#', '%']) >= 0)
            throw new ArgumentException("Invalid storage key.", nameof(key));
    }

    public void Dispose() => _client?.Dispose();
}
