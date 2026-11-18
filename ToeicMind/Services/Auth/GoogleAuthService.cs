using Google.Apis.Auth;

namespace ToeicMind.Services.Auth;

/// <summary>Xác minh Google ID token bằng Client ID cấu hình (không cần client secret).</summary>
public class GoogleAuthService : IGoogleAuthService
{
    private readonly IConfiguration _config;
    private readonly ILogger<GoogleAuthService> _logger;

    public GoogleAuthService(IConfiguration config, ILogger<GoogleAuthService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<GoogleJsonWebSignature.Payload?> ValidateTokenAsync(string idToken)
    {
        var clientId = _config["Google:ClientId"]?.Trim();
        if (string.IsNullOrWhiteSpace(clientId) ||
            clientId.StartsWith("YOUR_GOOGLE_CLIENT_ID", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Chưa cấu hình Google Client ID; từ chối đăng nhập Google.");
            return null;
        }

        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] };

            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            return payload;
        }
        catch (Exception)
        {
            _logger.LogWarning("Xác thực Google ID Token không hợp lệ.");
            return null;
        }
    }
}
