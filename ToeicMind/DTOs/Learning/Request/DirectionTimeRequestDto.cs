using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Số giây vừa xem hướng dẫn, cộng vào DirectionSeconds (không tính vào đồng hồ thi, BR-27).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class DirectionTimeRequestDto
{
    [Range(1, 3600)]
    public int Seconds { get; set; }
}
