using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Dashboard.Request;

/// <summary>Tham số của trang tổng quan Admin: số ngày của biểu đồ hoạt động, độ dài hai danh sách xếp hạng và số lượt trả lời tối thiểu để một câu được xét.</summary>
public class AdminDashboardRequestDto
{
    [Range(1, 90)]
    public int Days { get; set; } = 30;

    [Range(1, 50)]
    public int Limit { get; set; } = 5;

    [Range(1, 100000)]
    public int MinAnswers { get; set; } = 5;
}
