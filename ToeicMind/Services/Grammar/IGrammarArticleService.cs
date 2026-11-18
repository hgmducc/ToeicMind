using ToeicMind.DTOs.Grammar.Request;
using ToeicMind.DTOs.Grammar.Response;

namespace ToeicMind.Services.Grammar;

/// <summary>Hợp đồng nghiệp vụ bài ngữ pháp (mỗi chủ điểm một bài): Admin soạn (UC-25), người học đọc (UC-18).</summary>
public interface IGrammarArticleService
{
    Task<List<GrammarArticleTopicDto>> GetTopicsAsync();
    Task<GrammarArticlePageDto> ListAsync(GrammarArticleListRequestDto query);
    Task<(GrammarArticleDto? Result, string? Error)> GetAsync(int articleId, bool includeDeleted);
    Task<(GrammarArticleDto? Result, string? Error)> SaveAsync(int? articleId, SaveGrammarArticleRequestDto dto);
    Task<string?> SetDeletedAsync(int articleId, bool deleted);
    Task<(GrammarTopicArticleDto? Result, string? Error)> GetTopicArticleAsync(int grammarTopicId);
}
