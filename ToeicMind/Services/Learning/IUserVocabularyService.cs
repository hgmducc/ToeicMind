namespace ToeicMind.Services.Learning;

/// <summary>Hợp đồng nghiệp vụ bộ từ cá nhân của người học.</summary>
public interface IUserVocabularyService
{
    Task<UserVocabularyPageDto> ListAsync(int userId, UserVocabularyListRequestDto query);
    Task<(UserVocabularyDto? Result, string? Error)> SaveAsync(int userId, SaveUserVocabularyRequestDto dto);
    Task<string?> DeleteAsync(int userId, int userVocabId);
}
