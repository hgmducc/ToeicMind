using ToeicMind.Repositories.Learning;

namespace ToeicMind.Services.Learning;

/// <summary>Nghiệp vụ bộ từ cá nhân: lưu từ hệ thống (VocabId) hoặc từ tự thêm, chống trùng, xóa.</summary>
public class UserVocabularyService : IUserVocabularyService
{
    private readonly IUserVocabularyRepository _repo;
    public UserVocabularyService(IUserVocabularyRepository repo) => _repo = repo;

    public async Task<UserVocabularyPageDto> ListAsync(int userId, UserVocabularyListRequestDto query)
    {
        var (items, total) = await _repo.ListAsync(userId, query);
        return new UserVocabularyPageDto { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<(UserVocabularyDto? Result, string? Error)> SaveAsync(int userId, SaveUserVocabularyRequestDto dto)
    {
        var word = dto.CustomWord?.Trim();
        var meaning = dto.CustomMeaning?.Trim();
        var system = dto.VocabId.HasValue && string.IsNullOrEmpty(word) && string.IsNullOrEmpty(meaning);
        var custom = !dto.VocabId.HasValue && !string.IsNullOrEmpty(word) && !string.IsNullOrEmpty(meaning);
        if (!system && !custom) return (null, "VOCAB_INVALID");
        if (system && !await _repo.SystemVocabularyExistsAsync(dto.VocabId!.Value)) return (null, "VOCAB_SOURCE_NOT_FOUND");
        if (dto.SourceQuestionId.HasValue && !await _repo.QuestionExistsAsync(dto.SourceQuestionId.Value)) return (null, "SOURCE_QUESTION_NOT_FOUND");
        if (await _repo.ExistsAsync(userId, system ? dto.VocabId : null, system ? null : word)) return (null, "VOCAB_EXISTS");
        var saved = await _repo.AddAsync(new UserVocabulary
        {
            UserId = userId, VocabId = system ? dto.VocabId : null, CustomWord = system ? null : word, CustomMeaning = system ? null : meaning,
            CustomExample = system || string.IsNullOrWhiteSpace(dto.CustomExample) ? null : dto.CustomExample.Trim(),
            SourceQuestionId = dto.SourceQuestionId, CreatedAt = DateTime.UtcNow
        });
        return (saved, null);
    }

    public async Task<string?> DeleteAsync(int userId, int userVocabId) =>
        await _repo.DeleteAsync(userId, userVocabId) ? null : "VOCAB_NOT_FOUND";
}
