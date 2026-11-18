namespace ToeicMind.Services.Auth;

/// <summary>Hợp đồng tạo và băm token (xem JwtService).</summary>
public interface IJwtService
{
    (string Token, DateTime ExpiresAt) GenerateToken(Users user);
    (string Token, string TokenHash, DateTime ExpiresAt) GenerateRefreshToken();
    string HashToken(string token);
}
