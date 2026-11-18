namespace ToeicMind.DTOs.Exams.Response;
public class MediaFileDto
{
    public int MediaId { get; set; }
    public string MediaType { get; set; } = string.Empty;
    public string StorageKey { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public byte SortOrder { get; set; }
}
