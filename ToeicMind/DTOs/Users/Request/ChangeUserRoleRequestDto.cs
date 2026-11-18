using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Users.Request;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class ChangeUserRoleRequestDto
{
    [Required, RegularExpression("^(ADMIN|LEARNER)$", ErrorMessage = "Role chỉ nhận ADMIN hoặc LEARNER")]
    public string Role { get; set; } = string.Empty;
}
