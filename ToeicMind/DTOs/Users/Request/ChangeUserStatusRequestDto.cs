using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Users.Request;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class ChangeUserStatusRequestDto
{
    [Required, RegularExpression("^(ACTIVE|LOCKED)$", ErrorMessage = "Status chỉ nhận ACTIVE hoặc LOCKED")]
    public string Status { get; set; } = string.Empty;
}
