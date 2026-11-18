using Google.Apis.Auth;

namespace ToeicMind.Services.Auth;

/// <summary>Hợp đồng xác minh Google ID token.</summary>
public interface IGoogleAuthService
{
    Task<GoogleJsonWebSignature.Payload?> ValidateTokenAsync(string idToken);
}
