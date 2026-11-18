using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Auth.Request;

public class RefreshRequestDto
{
    [Required, MaxLength(512)]
    public string RefreshToken { get; set; } = string.Empty;
}
