namespace ToeicMind.DTOs.Exams.Response;
public class CategoryCatalogDto
{
    public int CategoryId { get; set; }
    public byte PartNo { get; set; }
    public int? ParentCategoryId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string NameVi { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public short SortOrder { get; set; }
    public bool IsLeaf { get; set; }
}
