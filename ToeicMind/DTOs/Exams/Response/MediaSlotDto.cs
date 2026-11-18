namespace ToeicMind.DTOs.Exams.Response;

// Một vị trí cần tệp media của đề: tên tệp (không đuôi) theo quy tắc, đã có tệp chưa và route upload.
public class MediaSlotDto
{
    public string Slot { get; set; } = string.Empty;
    public byte PartNo { get; set; }
    public int GroupId { get; set; }
    public int? ClipId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public bool Uploaded { get; set; }
    public string UploadPath { get; set; } = string.Empty;
}
