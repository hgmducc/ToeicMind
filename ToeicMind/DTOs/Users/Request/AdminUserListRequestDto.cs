using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Users.Request;

/// <summary>Tham số lọc danh sách người dùng. Role/Status để trống là lấy tất cả.</summary>
public class AdminUserListRequestDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    /// <summary>Tìm theo một phần tên hoặc email.</summary>
    [MaxLength(200)]
    public string? Search { get; set; }

    /// <summary>ADMIN hoặc LEARNER.</summary>
    [RegularExpression("^(ADMIN|LEARNER)$", ErrorMessage = "Role chỉ nhận ADMIN hoặc LEARNER")]
    public string? Role { get; set; }

    /// <summary>ACTIVE hoặc LOCKED.</summary>
    [RegularExpression("^(ACTIVE|LOCKED)$", ErrorMessage = "Status chỉ nhận ACTIVE hoặc LOCKED")]
    public string? Status { get; set; }
}
