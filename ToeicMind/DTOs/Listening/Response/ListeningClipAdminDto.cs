namespace ToeicMind.DTOs.Listening.Response;

/// <summary>Một clip của bộ sưu tầm; MediaId là audio hiện hành (nghe thử qua /api/admin/media/{id}/url).</summary>
public class ListeningClipAdminDto
{
    public int ClipId { get; set; }
    public short SeqNo { get; set; }
    public string ClipRole { get; set; } = string.Empty;
    public string? Speaker { get; set; }
    public string TranscriptEn { get; set; } = string.Empty;
    public string? TranslationVi { get; set; }
    public int? MediaId { get; set; }
}
