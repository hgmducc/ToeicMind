namespace ToeicMind.DTOs.Dashboard.Response;

/// <summary>Hoạt động trong một ngày.</summary>
public class ActivityPointDto
{
    public DateOnly Date { get; set; }
    public int NewUsers { get; set; }
    public int Attempts { get; set; }
    public int ActiveLearners { get; set; }
}
