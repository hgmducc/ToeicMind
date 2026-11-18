using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.DTOs.Grammar.Request;
using ToeicMind.DTOs.Grammar.Response;
using ToeicMind.Models.Catalogs;

namespace ToeicMind.Repositories.Grammar;

/// <summary>
/// Truy cập bài ngữ pháp (GrammarArticle) và tên chủ điểm (GrammarTopic → QuestionCategory của Part 5).
/// Mỗi chủ điểm chỉ có một bài chưa xóa; UX_GrammarArticle_Topic từ chối bản thứ hai (kể cả hai request đồng thời) → GRAMMAR_ARTICLE_EXISTS.
/// </summary>
public class GrammarArticleRepository : IGrammarArticleRepository
{
    private readonly AppDbContext _db;
    public GrammarArticleRepository(AppDbContext db) => _db = db;

    private IQueryable<GrammarArticleTopicDto> Topics() =>
        from t in _db.GrammarTopics.AsNoTracking()
        join c in _db.QuestionCategories.AsNoTracking() on t.CategoryId equals c.CategoryId
        let article = _db.GrammarArticles.Where(a => a.GrammarTopicId == t.GrammarTopicId && !a.IsDeleted).OrderBy(a => a.ArticleId).FirstOrDefault()
        orderby t.SortOrder, t.GrammarTopicId
        select new GrammarArticleTopicDto
        {
            GrammarTopicId = t.GrammarTopicId, CategoryId = t.CategoryId, Name = c.NameVi, Summary = t.Summary,
            GroupName = _db.QuestionCategories.Where(p => p.CategoryId == c.ParentCategoryId).Select(p => p.NameVi).FirstOrDefault(),
            ArticleId = article == null ? null : article.ArticleId,
            ArticleTitle = article == null ? null : article.Title,
            ArticleUpdatedAt = article == null ? null : article.UpdatedAt
        };

    public Task<List<GrammarArticleTopicDto>> GetTopicsAsync() => Topics().ToListAsync();

    public Task<GrammarArticleTopicDto?> GetTopicAsync(int grammarTopicId) =>
        Topics().FirstOrDefaultAsync(t => t.GrammarTopicId == grammarTopicId);

    public async Task<HashSet<int>> GetTopicIdsWithArticleAsync() =>
        (await _db.GrammarArticles.AsNoTracking().Where(a => !a.IsDeleted).Select(a => a.GrammarTopicId).Distinct().ToListAsync()).ToHashSet();

    // Danh sách không kèm Content (có thể rất dài).
    private IQueryable<GrammarArticleDto> Rows(IQueryable<GrammarArticle> articles, bool withContent) =>
        from a in articles
        join t in _db.GrammarTopics on a.GrammarTopicId equals t.GrammarTopicId
        join c in _db.QuestionCategories on t.CategoryId equals c.CategoryId
        select new GrammarArticleDto
        {
            ArticleId = a.ArticleId, GrammarTopicId = a.GrammarTopicId, CategoryId = t.CategoryId, TopicName = c.NameVi, Title = a.Title,
            Content = withContent ? a.Content : null, IsDeleted = a.IsDeleted, DeletedAt = a.DeletedAt, CreatedAt = a.CreatedAt, UpdatedAt = a.UpdatedAt
        };

    public async Task<(List<GrammarArticleDto> Items, int TotalCount)> ListAsync(GrammarArticleListRequestDto query)
    {
        var articles = _db.GrammarArticles.AsNoTracking().Where(a => a.IsDeleted == query.IsDeleted);
        if (query.GrammarTopicId is { } topicId) articles = articles.Where(a => a.GrammarTopicId == topicId);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            articles = articles.Where(a => a.Title.Contains(search));
        }
        var total = await articles.CountAsync();
        var items = await Rows(articles, false).OrderByDescending(a => a.UpdatedAt).ThenByDescending(a => a.ArticleId)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
        return (items, total);
    }

    public Task<GrammarArticleDto?> GetAsync(int articleId, bool includeDeleted) =>
        Rows(_db.GrammarArticles.AsNoTracking().Where(a => a.ArticleId == articleId && (includeDeleted || !a.IsDeleted)), true).FirstOrDefaultAsync();

    public Task<GrammarArticleDto?> GetByTopicAsync(int grammarTopicId) =>
        Rows(_db.GrammarArticles.AsNoTracking().Where(a => a.GrammarTopicId == grammarTopicId && !a.IsDeleted), true)
            .OrderBy(a => a.ArticleId).FirstOrDefaultAsync();

    public Task<bool> TopicHasOtherArticleAsync(int grammarTopicId, int? exceptArticleId) =>
        _db.GrammarArticles.AnyAsync(a => a.GrammarTopicId == grammarTopicId && !a.IsDeleted && a.ArticleId != exceptArticleId);

    public async Task<(int? ArticleId, string? Error)> AddAsync(GrammarArticle article)
    {
        _db.GrammarArticles.Add(article);
        try
        {
            await _db.SaveChangesAsync();
            return (article.ArticleId, null);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex)) { return (null, "GRAMMAR_ARTICLE_EXISTS"); }
        finally { _db.ChangeTracker.Clear(); }
    }

    public async Task<string?> UpdateAsync(int articleId, int grammarTopicId, string title, string content)
    {
        try
        {
            var changed = await _db.GrammarArticles.Where(a => a.ArticleId == articleId).ExecuteUpdateAsync(s => s
                .SetProperty(a => a.GrammarTopicId, grammarTopicId).SetProperty(a => a.Title, title).SetProperty(a => a.Content, content)
                .SetProperty(a => a.UpdatedAt, DateTime.UtcNow));
            return changed > 0 ? null : "GRAMMAR_ARTICLE_NOT_FOUND";
        }
        catch (Exception ex) when (IsUniqueViolation(ex)) { return "GRAMMAR_ARTICLE_EXISTS"; }
    }

    // CK_GrammarArticle_SoftDelete: IsDeleted và DeletedAt phải đổi cùng nhau. Khôi phục khi chủ điểm đã có bài khác → GRAMMAR_ARTICLE_EXISTS.
    public async Task<string?> SetDeletedAsync(int articleId, bool deleted)
    {
        try
        {
            var changed = await _db.GrammarArticles.Where(a => a.ArticleId == articleId).ExecuteUpdateAsync(s => s
                .SetProperty(a => a.IsDeleted, deleted).SetProperty(a => a.DeletedAt, deleted ? DateTime.UtcNow : (DateTime?)null)
                .SetProperty(a => a.UpdatedAt, DateTime.UtcNow));
            return changed > 0 ? null : "GRAMMAR_ARTICLE_NOT_FOUND";
        }
        catch (Exception ex) when (IsUniqueViolation(ex)) { return "GRAMMAR_ARTICLE_EXISTS"; }
    }

    private static bool IsUniqueViolation(Exception ex) =>
        (ex as SqlException ?? ex.InnerException as SqlException) is { Number: 2601 or 2627 };
}
