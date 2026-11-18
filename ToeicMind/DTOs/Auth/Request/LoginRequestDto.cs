using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Auth.Request;

public class LoginRequestDto
{
    [Required, EmailAddress, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(72)]
    public string Password { get; set; } = string.Empty;
}
