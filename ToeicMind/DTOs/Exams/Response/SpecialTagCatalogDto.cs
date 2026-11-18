namespace ToeicMind.DTOs.Exams.Response;
public class SpecialTagCatalogDto
{
    public int SpecialTagId { get; set; }
    public byte PartNo { get; set; }
    public string Code { get; set; } = string.Empty;
    public string NameVi { get; set; } = string.Empty;
}
