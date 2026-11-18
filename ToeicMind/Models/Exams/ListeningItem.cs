using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

/// <summary>
/// Bộ clip nghe. TH1: cắt từ nhóm câu của đề gốc (GroupId, phân loại/Level lấy theo nhóm). TH2 (UC-28): clip sưu tầm riêng, GroupId NULL,
/// Admin gán CategoryId/LevelNo (bắt buộc trước khi xuất bản) và bật IsPublished. CK_ListeningItem_NoDuplicateClassification cấm TH1 có phân loại riêng.
/// </summary>
[Table("ListeningItem", Schema = "dbo")]
public class ListeningItem
{
    [Key] public int ItemId { get; set; }
    public byte PartNo { get; set; }
    public int? GroupId { get; set; }
    public int? CategoryId { get; set; }
    public byte? LevelNo { get; set; }
    [MaxLength(200)] public string? SourceNote { get; set; }
    [MaxLength(100)] public string? ExternalKey { get; set; }
    public bool IsPublished { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    [ForeignKey(nameof(GroupId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public QuestionGroup? Group { get; set; }
    public List<ListeningClip> Clips { get; set; } = [];
}
