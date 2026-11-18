using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Auth.Request;

public class GoogleLoginRequestDto
{
    [Required(ErrorMessage = "Google idToken không được để trống")]
    public string IdToken { get; set; } = string.Empty;
}
