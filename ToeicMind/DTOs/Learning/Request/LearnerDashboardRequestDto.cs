using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Phạm vi dữ liệu của trang tổng quan học tập: số ngày học gần nhất và số điểm Luyện thi gần nhất.</summary>
public class LearnerDashboardRequestDto
{
    /// <summary>Số ngày gần nhất (tính cả hôm nay) để lấy ngày học, vẽ lịch học.</summary>
    [Range(1, 365)]
    public int Days { get; set; } = 30;

    /// <summary>Số bài Luyện thi có điểm quy đổi gần nhất để vẽ đường điểm.</summary>
    [Range(1, 50)]
    public int ScoreLimit { get; set; } = 20;
}
