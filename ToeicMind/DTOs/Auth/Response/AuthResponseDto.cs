namespace ToeicMind.DTOs.Auth.Response;

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime RefreshExpiresAt { get; set; }

    public UserDto User { get; set; } = new();
}
