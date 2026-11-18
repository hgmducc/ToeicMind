namespace ToeicMind.Repositories.Learning;

/// <summary>Hợp đồng truy cập bộ từ cá nhân của người học (xem UserVocabularyRepository).</summary>
public interface IUserVocabularyRepository
{
    Task<(List<UserVocabularyDto> Items, int TotalCount)> ListAsync(int userId, UserVocabularyListRequestDto query);
    Task<bool> SystemVocabularyExistsAsync(int vocabId);
    Task<bool> QuestionExistsAsync(int questionId);
    Task<bool> ExistsAsync(int userId, int? vocabId, string? customWord);
    Task<UserVocabularyDto> AddAsync(UserVocabulary entity);
    Task<bool> DeleteAsync(int userId, int userVocabId);
}
