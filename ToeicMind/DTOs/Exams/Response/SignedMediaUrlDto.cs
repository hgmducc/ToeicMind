namespace ToeicMind.DTOs.Exams.Response;

public class SignedMediaUrlDto
{
    public int MediaId { get; set; }
    public string Url { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
