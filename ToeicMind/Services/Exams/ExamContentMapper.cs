using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Models.Exams;

namespace ToeicMind.Services.Exams;

/// <summary>Chuyển entity nội dung đề (nhóm, câu hỏi, hướng dẫn, media) sang DTO trả về cho FE.</summary>
public static class ExamContentMapper
{


    public static MediaFileDto ToDto(MediaFile media) => new()
    {
        MediaId = media.MediaId, MediaType = media.MediaType, StorageKey = media.StorageKey,
        AltText = media.AltText, SortOrder = media.SortOrder
    };


    public static ExamDirectionDto ToDto(ExamDirection direction) => new()
    {
        DirectionId = direction.DirectionId, ExamId = direction.ExamId, DirectionKind = direction.DirectionKind,
        Skill = direction.Skill, PartNo = direction.PartNo, DirectionsEn = direction.DirectionsEn,
        DirectionsVi = direction.DirectionsVi, ExampleEn = direction.ExampleEn, ExampleVi = direction.ExampleVi,
        Media = direction.Media.Where(m => !m.IsDeleted).Select(ToDto).ToList()
    };
}
