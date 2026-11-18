using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Auth.Request;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SetPasswordRequestDto
{
    [Required, MinLength(6), MaxLength(72)]
    public string NewPassword { get; set; } = string.Empty;

    [Required, Compare(nameof(NewPassword))]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}
