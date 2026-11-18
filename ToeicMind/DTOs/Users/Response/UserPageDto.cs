namespace ToeicMind.DTOs.Users.Response;

public class UserPageDto
{
    public IReadOnlyList<AdminUserDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
