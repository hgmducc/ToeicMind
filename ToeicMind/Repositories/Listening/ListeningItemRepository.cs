using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.DTOs.Listening.Request;
using ToeicMind.DTOs.Listening.Response;
using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Listening;

/// <summary>
/// Truy cập bộ clip sưu tầm (TH2): chỉ ListeningItem có GroupId NULL; bộ clip TH1 (cắt từ đề) quản lý qua nội dung đề.
/// Trùng SeqNo/vai trò (UX_ListeningClip_Seq, UX_ListeningClip_Role) trả LISTENING_CLIP_CONFLICT.
/// </summary>
public class ListeningItemRepository : IListeningItemRepository
{
    private readonly AppDbContext _db;
    public ListeningItemRepository(AppDbContext db) => _db = db;

    private IQueryable<ListeningItem> Standalone() => _db.ListeningItems.AsNoTracking().Where(i => i.GroupId == null);

    private IQueryable<ListeningItemSummaryDto> Summaries(IQueryable<ListeningItem> items) =>
        items.Select(i => new ListeningItemSummaryDto
        {
            ItemId = i.ItemId, PartNo = i.PartNo, CategoryId = i.CategoryId, LevelNo = i.LevelNo, SourceNote = i.SourceNote,
            CategoryName = _db.QuestionCategories.Where(c => c.CategoryId == i.CategoryId).Select(c => c.NameVi).FirstOrDefault(),
            LevelName = _db.LevelBands.Where(l => l.LevelNo == i.LevelNo).Select(l => l.NameVi).FirstOrDefault(),
            IsPublished = i.IsPublished, IsDeleted = i.IsDeleted,
            ClipCount = i.Clips.Count(c => !c.IsDeleted),
            AudioCount = i.Clips.Count(c => !c.IsDeleted && c.Media.Any(m => !m.IsDeleted && m.MediaType == "AUDIO")),
            CreatedAt = i.CreatedAt, UpdatedAt = i.UpdatedAt
        });

    public async Task<(List<ListeningItemSummaryDto> Items, int TotalCount)> ListAsync(ListeningItemListRequestDto query)
    {
        var items = Standalone().Where(i => i.IsDeleted == query.IsDeleted);
        if (query.PartNo is { } partNo) items = items.Where(i => i.PartNo == partNo);
        if (query.IsPublished is { } published) items = items.Where(i => i.IsPublished == published);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            items = items.Where(i => i.SourceNote != null && i.SourceNote.Contains(search));
        }
        var total = await items.CountAsync();
        var page = await Summaries(items.OrderByDescending(i => i.ItemId).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)).ToListAsync();
        return (page, total);
    }

    public Task<ListeningItemSummaryDto?> GetSummaryAsync(int itemId) => Summaries(Standalone().Where(i => i.ItemId == itemId)).FirstOrDefaultAsync();

    private IQueryable<ListeningClipAdminDto> Clips(int itemId) =>
        _db.ListeningClips.AsNoTracking().Where(c => c.ItemId == itemId && !c.IsDeleted && c.Item.GroupId == null)
            .OrderBy(c => c.SeqNo)
            .Select(c => new ListeningClipAdminDto
            {
                ClipId = c.ClipId, SeqNo = c.SeqNo, ClipRole = c.ClipRole, Speaker = c.Speaker, TranscriptEn = c.TranscriptEn, TranslationVi = c.TranslationVi,
                MediaId = c.Media.Where(m => !m.IsDeleted && m.MediaType == "AUDIO").OrderByDescending(m => m.MediaId).Select(m => (int?)m.MediaId).FirstOrDefault()
            });

    public Task<List<ListeningClipAdminDto>> GetClipsAsync(int itemId) => Clips(itemId).ToListAsync();

    public Task<ListeningClipAdminDto?> GetClipAsync(int itemId, int clipId) => Clips(itemId).FirstOrDefaultAsync(c => c.ClipId == clipId);

    public async Task<int> AddItemAsync(ListeningItem item)
    {
        _db.ListeningItems.Add(item);
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
        return item.ItemId;
    }

    public async Task<bool> UpdateItemAsync(int itemId, byte partNo, int? categoryId, byte? levelNo, string? sourceNote) =>
        await _db.ListeningItems.Where(i => i.ItemId == itemId && i.GroupId == null && !i.IsDeleted).ExecuteUpdateAsync(s => s
            .SetProperty(i => i.PartNo, partNo).SetProperty(i => i.CategoryId, categoryId).SetProperty(i => i.LevelNo, levelNo)
            .SetProperty(i => i.SourceNote, sourceNote).SetProperty(i => i.UpdatedAt, DateTime.UtcNow)) > 0;

    public async Task<bool> SetPublishedAsync(int itemId, bool published) =>
        await _db.ListeningItems.Where(i => i.ItemId == itemId && i.GroupId == null && !i.IsDeleted).ExecuteUpdateAsync(s => s
            .SetProperty(i => i.IsPublished, published).SetProperty(i => i.UpdatedAt, DateTime.UtcNow)) > 0;

    // Xóa mềm cũng ẩn bộ clip; khôi phục giữ trạng thái ẩn để Admin kiểm tra lại trước khi xuất bản.
    public async Task<bool> SetDeletedAsync(int itemId, bool deleted) =>
        await _db.ListeningItems.Where(i => i.ItemId == itemId && i.GroupId == null && i.IsDeleted != deleted).ExecuteUpdateAsync(s => s
            .SetProperty(i => i.IsDeleted, deleted).SetProperty(i => i.DeletedAt, deleted ? DateTime.UtcNow : (DateTime?)null)
            .SetProperty(i => i.IsPublished, false).SetProperty(i => i.UpdatedAt, DateTime.UtcNow)) > 0;

    public async Task<short> NextSeqAsync(int itemId) =>
        (short)((await _db.ListeningClips.Where(c => c.ItemId == itemId && !c.IsDeleted).MaxAsync(c => (short?)c.SeqNo) ?? 0) + 1);

    public async Task<(int? ClipId, string? Error)> AddClipAsync(ListeningClip clip)
    {
        _db.ListeningClips.Add(clip);
        try
        {
            await _db.SaveChangesAsync();
            await TouchAsync(clip.ItemId);
            return (clip.ClipId, null);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex)) { return (null, "LISTENING_CLIP_CONFLICT"); }
        finally { _db.ChangeTracker.Clear(); }
    }

    public async Task<string?> UpdateClipAsync(int itemId, int clipId, short seqNo, string role, string transcriptEn, string? translationVi, string? speaker)
    {
        try
        {
            var changed = await _db.ListeningClips.Where(c => c.ClipId == clipId && c.ItemId == itemId && !c.IsDeleted).ExecuteUpdateAsync(s => s
                .SetProperty(c => c.SeqNo, seqNo).SetProperty(c => c.ClipRole, role).SetProperty(c => c.TranscriptEn, transcriptEn)
                .SetProperty(c => c.TranslationVi, translationVi).SetProperty(c => c.Speaker, speaker));
            if (changed == 0) return "CLIP_NOT_FOUND";
            await TouchAsync(itemId);
            return null;
        }
        catch (Exception ex) when (IsUniqueViolation(ex)) { return "LISTENING_CLIP_CONFLICT"; }
    }

    // Xóa mềm clip cùng audio của clip trong một transaction (CK_*_SoftDelete đòi DeletedAt đi cùng IsDeleted).
    public async Task<bool> DeleteClipAsync(int itemId, int clipId)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        var now = DateTime.UtcNow;
        var changed = await _db.ListeningClips.Where(c => c.ClipId == clipId && c.ItemId == itemId && !c.IsDeleted)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsDeleted, true).SetProperty(c => c.DeletedAt, now));
        if (changed == 0) return false;
        await _db.Media.Where(m => m.ClipId == clipId && !m.IsDeleted)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsDeleted, true).SetProperty(m => m.DeletedAt, now));
        await TouchAsync(itemId);
        await transaction.CommitAsync();
        return true;
    }

    // Mỗi clip một audio (UX_Media_ClipAudio): xóa mềm audio cũ rồi thêm audio mới trong một transaction.
    public async Task<string?> SaveClipAudioAsync(MediaFile media)
    {
        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync();
            await _db.Media.Where(m => m.ClipId == media.ClipId && !m.IsDeleted && m.MediaType == "AUDIO")
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsDeleted, true).SetProperty(m => m.DeletedAt, DateTime.UtcNow));
            _db.Media.Add(media);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return null;
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex)) { return "CONCURRENT_CHANGE"; }
        finally { _db.ChangeTracker.Clear(); }
    }

    public Task<bool> IsMediaKeyRegisteredAsync(string key) => _db.Media.AsNoTracking().AnyAsync(m => m.StorageKey == key);

    private Task<int> TouchAsync(int itemId) =>
        _db.ListeningItems.Where(i => i.ItemId == itemId).ExecuteUpdateAsync(s => s.SetProperty(i => i.UpdatedAt, DateTime.UtcNow));

    private static bool IsUniqueViolation(Exception ex) =>
        (ex as SqlException ?? ex.InnerException as SqlException) is { Number: 2601 or 2627 };
}
