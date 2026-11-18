namespace ToeicMind.Services.Learning;

/// <summary>Hợp đồng nghiệp vụ cá nhân hóa (CHG-007): mục tiêu người học và lộ trình gợi ý bài học (xem PersonalizationService).</summary>
public interface IPersonalizationService
{
    Task<LearnerProfileDto> GetProfileAsync(int userId);
    Task<LearnerProfileDto> SaveProfileAsync(int userId, SaveLearnerProfileRequestDto dto);
    Task<LearningPlanDto> GetPlanAsync(int userId);
}
