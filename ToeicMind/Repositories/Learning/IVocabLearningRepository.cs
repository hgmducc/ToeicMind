using ToeicMind.Models.Learning;

namespace ToeicMind.Repositories.Learning;

/// <summary>Hợp đồng truy cập dữ liệu học từ vựng: danh mục từ theo đề/Part (dùng cho cache), ngữ cảnh và tiến độ lặp lại ngắt quãng của người học.</summary>
public interface IVocabLearningRepository
{
    Task<List<VocabWordRow>> GetWordsAsync();
    Task<List<VocabExamRow>> GetLiveExamsAsync();
    Task<List<VocabLinkRow>> GetLinksAsync();
    Task<List<VocabContextRow>> GetContextsAsync(IReadOnlyCollection<int> vocabIds);
    Task<HashSet<int>> GetMineIdsAsync(int userId);
    Task<List<UserVocabProgress>> GetProgressAsync(int userId);
    Task<UserVocabProgress?> GetOneProgressAsync(int userId, int vocabId);
    Task SaveProgressAsync(UserVocabProgress next, bool exists);
    Task<bool> ResetProgressAsync(int userId, int vocabId);
    Task TouchStudyDayAsync(int userId, DateOnly date, int reviews);
    Task<int> GetReviewedOnAsync(int userId, DateOnly date);
}
