using ToeicMind.DTOs.Grammar.Request;
using ToeicMind.DTOs.Grammar.Response;
using ToeicMind.Models.Catalogs;

namespace ToeicMind.Repositories.Grammar;

/// <summary>Hợp đồng truy cập bài ngữ pháp, mỗi chủ điểm một bài chưa xóa (xem GrammarArticleRepository).</summary>
public interface IGrammarArticleRepository
{
    Task<List<GrammarArticleTopicDto>> GetTopicsAsync();
    Task<GrammarArticleTopicDto?> GetTopicAsync(int grammarTopicId);
    Task<HashSet<int>> GetTopicIdsWithArticleAsync();
    Task<(List<GrammarArticleDto> Items, int TotalCount)> ListAsync(GrammarArticleListRequestDto query);
    Task<GrammarArticleDto?> GetAsync(int articleId, bool includeDeleted);
    Task<GrammarArticleDto?> GetByTopicAsync(int grammarTopicId);
    Task<bool> TopicHasOtherArticleAsync(int grammarTopicId, int? exceptArticleId);
    Task<(int? ArticleId, string? Error)> AddAsync(GrammarArticle article);
    Task<string?> UpdateAsync(int articleId, int grammarTopicId, string title, string content);
    Task<string?> SetDeletedAsync(int articleId, bool deleted);
}
