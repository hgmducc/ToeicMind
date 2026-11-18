using Amazon.Runtime;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.DTOs.Listening.Request;
using ToeicMind.DTOs.Listening.Response;
using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Exams;
using ToeicMind.Repositories.Listening;
using ToeicMind.Services.Media;

namespace ToeicMind.Services.Listening;

/// <summary>
/// UC-28 TH2: Admin quản lý bộ clip sưu tầm (không thuộc đề). Tạo bộ clip theo Part 1–4, gán loại bài và Level (bắt buộc trước khi xuất bản, A2),
/// thêm/sửa/xóa clip với vai trò đúng Part (E1), tải audio từng clip, xuất bản/ẩn, xóa mềm/khôi phục (A3).
/// Bộ clip đã xuất bản hiện trong Nghe chép của người học (DictationRepository) cùng bộ lọc loại bài/Level.
/// </summary>
public class ListeningItemService : IListeningItemService
{
    private static readonly Dictionary<byte, string[]> RolesByPart = new()
    {
        [1] = ["OPTION_A", "OPTION_B", "OPTION_C", "OPTION_D"],
        [2] = ["QUESTION", "OPTION_A", "OPTION_B", "OPTION_C"],
        [3] = ["SENTENCE"],
        [4] = ["SENTENCE"]
    };

    private readonly IListeningItemRepository _repo;
    private readonly IExamContentRepository _content;
    private readonly IMediaStorage _storage;
    private readonly IConfiguration _config;
    private readonly ILogger<ListeningItemService> _logger;

    public ListeningItemService(IListeningItemRepository repo, IExamContentRepository content, IMediaStorage storage, IConfiguration config,
        ILogger<ListeningItemService> logger)
    {
        _repo = repo;
        _content = content;
        _storage = storage;
        _config = config;
        _logger = logger;
    }

    public async Task<ListeningItemPageDto> ListAsync(ListeningItemListRequestDto query)
    {
        var (items, total) = await _repo.ListAsync(query);
        return new ListeningItemPageDto { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<(ListeningItemDetailDto? Result, string? Error)> GetAsync(int itemId)
    {
        var item = await _repo.GetSummaryAsync(itemId);
        if (item is null) return (null, "LISTENING_ITEM_NOT_FOUND");
        return (new ListeningItemDetailDto { Item = item, Clips = item.IsDeleted ? [] : await _repo.GetClipsAsync(itemId) }, null);
    }

    public async Task<(ListeningItemDetailDto? Result, string? Error)> SaveAsync(int? itemId, SaveListeningItemRequestDto dto)
    {
        var partNo = dto.PartNo!.Value;
        var error = await ValidateClassificationAsync(partNo, dto.CategoryId, dto.LevelNo);
        if (error is not null) return (null, error);
        var note = string.IsNullOrWhiteSpace(dto.SourceNote) ? null : dto.SourceNote.Trim();
        if (itemId is null)
        {
            var now = DateTime.UtcNow;
            itemId = await _repo.AddItemAsync(new ListeningItem
            {
                PartNo = partNo, CategoryId = dto.CategoryId, LevelNo = dto.LevelNo, SourceNote = note, IsPublished = false, CreatedAt = now, UpdatedAt = now
            });
            return await GetAsync(itemId.Value);
        }

        var current = await _repo.GetSummaryAsync(itemId.Value);
        if (current is null || current.IsDeleted) return (null, "LISTENING_ITEM_NOT_FOUND");
        // Đổi Part làm vai trò các clip hiện có sai ràng buộc theo Part: chỉ cho đổi khi bộ clip còn trống.
        if (partNo != current.PartNo && current.ClipCount > 0) return (null, "LISTENING_ITEM_PART_LOCKED");
        // Bộ đang xuất bản không được bỏ loại bài hoặc Level (A2).
        if (current.IsPublished && (dto.CategoryId is null || dto.LevelNo is null)) return (null, "LISTENING_ITEM_CLASSIFICATION_REQUIRED");
        if (!await _repo.UpdateItemAsync(itemId.Value, partNo, dto.CategoryId, dto.LevelNo, note)) return (null, "LISTENING_ITEM_NOT_FOUND");
        return await GetAsync(itemId.Value);
    }

    public async Task<(ListeningItemDetailDto? Result, string? Error)> SetPublishedAsync(int itemId, bool published)
    {
        var item = await _repo.GetSummaryAsync(itemId);
        if (item is null || item.IsDeleted) return (null, "LISTENING_ITEM_NOT_FOUND");
        if (published)
        {
            if (item.CategoryId is null || item.LevelNo is null) return (null, "LISTENING_ITEM_CLASSIFICATION_REQUIRED");
            if (item.ClipCount == 0) return (null, "LISTENING_ITEM_EMPTY");
        }
        await _repo.SetPublishedAsync(itemId, published);
        return await GetAsync(itemId);
    }

    public async Task<string?> SetDeletedAsync(int itemId, bool deleted)
    {
        var item = await _repo.GetSummaryAsync(itemId);
        if (item is null || item.IsDeleted != !deleted) return "LISTENING_ITEM_NOT_FOUND";
        await _repo.SetDeletedAsync(itemId, deleted);
        return null;
    }

    public async Task<(ListeningItemDetailDto? Result, string? Error)> SaveClipAsync(int itemId, int? clipId, SaveListeningClipRequestDto dto)
    {
        var item = await _repo.GetSummaryAsync(itemId);
        if (item is null || item.IsDeleted) return (null, "LISTENING_ITEM_NOT_FOUND");
        if (!RolesByPart[item.PartNo].Contains(dto.ClipRole)) return (null, "LISTENING_CLIP_ROLE_INVALID");
        var transcript = dto.TranscriptEn.Trim();
        if (transcript.Length == 0) return (null, "LISTENING_CLIP_EMPTY");
        var translation = string.IsNullOrWhiteSpace(dto.TranslationVi) ? null : dto.TranslationVi.Trim();
        var speaker = string.IsNullOrWhiteSpace(dto.Speaker) ? null : dto.Speaker.Trim();

        string? error;
        if (clipId is null)
        {
            var seq = dto.SeqNo ?? await _repo.NextSeqAsync(itemId);
            (_, error) = await _repo.AddClipAsync(new ListeningClip
            {
                ItemId = itemId, PartNo = item.PartNo, SeqNo = seq, ClipRole = dto.ClipRole, TranscriptEn = transcript, TranslationVi = translation,
                Speaker = speaker, TextSource = "MANUAL", CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            var current = await _repo.GetClipAsync(itemId, clipId.Value);
            if (current is null) return (null, "CLIP_NOT_FOUND");
            error = await _repo.UpdateClipAsync(itemId, clipId.Value, dto.SeqNo ?? current.SeqNo, dto.ClipRole, transcript, translation, speaker);
        }
        return error is not null ? (null, error) : await GetAsync(itemId);
    }

    public async Task<(ListeningItemDetailDto? Result, string? Error)> DeleteClipAsync(int itemId, int clipId)
    {
        var item = await _repo.GetSummaryAsync(itemId);
        if (item is null || item.IsDeleted) return (null, "LISTENING_ITEM_NOT_FOUND");
        // Bộ đang xuất bản phải còn ít nhất một clip; muốn xóa hết thì ẩn bộ trước.
        if (item.IsPublished && item.ClipCount <= 1) return (null, "LISTENING_ITEM_EMPTY");
        if (!await _repo.DeleteClipAsync(itemId, clipId)) return (null, "CLIP_NOT_FOUND");
        return await GetAsync(itemId);
    }

    public async Task<(ListeningItemDetailDto? Result, string? Error)> UploadClipAudioAsync(int itemId, int clipId, IFormFile file, CancellationToken cancellationToken)
    {
        var item = await _repo.GetSummaryAsync(itemId);
        if (item is null || item.IsDeleted) return (null, "LISTENING_ITEM_NOT_FOUND");
        if (await _repo.GetClipAsync(itemId, clipId) is null) return (null, "CLIP_NOT_FOUND");
        if (file.Length <= 0) return (null, "MEDIA_INVALID");
        await using var bytes = new MemoryStream();
        await file.CopyToAsync(bytes, cancellationToken);
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var (type, contentType) = MediaFileValidator.Detect(bytes.GetBuffer().AsSpan(0, (int)bytes.Length), extension);
        if (type != "AUDIO") return (null, "MEDIA_TYPE_INVALID");
        if (bytes.Length > (_config.GetValue<long?>("Media:MaxAudioBytes") ?? 25 * 1024 * 1024)) return (null, "MEDIA_TOO_LARGE");

        var key = $"listening/{itemId}/clips/{clipId}-{Guid.NewGuid():N}{extension}";
        var saved = false;
        try
        {
            bytes.Position = 0;
            await _storage.PutAsync(key, bytes, contentType!, cancellationToken);
            var error = await _repo.SaveClipAudioAsync(new MediaFile
            {
                ClipId = clipId, MediaType = "AUDIO", StorageKey = key, SortOrder = 1, CreatedAt = DateTime.UtcNow
            });
            if (error is not null) return (null, error);
            saved = true;
            return await GetAsync(itemId);
        }
        catch (Exception ex) when (ex is AmazonClientException or HttpRequestException or IOException or TimeoutException ||
                                   (ex is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            _logger.LogError(ex, "R2 upload failed for {StorageKey}", key);
            return (null, "STORAGE_UNAVAILABLE");
        }
        finally
        {
            if (!saved)
            {
                try { if (!await _repo.IsMediaKeyRegisteredAsync(key)) await _storage.DeleteUncommittedAsync(key, CancellationToken.None); }
                catch { _logger.LogError("R2 cleanup pending for unconfirmed upload {StorageKey}", key); }
            }
        }
    }

    // Loại bài phải là phân loại lá, đang dùng, đúng Part (FK (CategoryId, PartNo)); Level phải có trong LevelBand.
    private async Task<string?> ValidateClassificationAsync(byte partNo, int? categoryId, byte? levelNo)
    {
        if (categoryId is null && levelNo is null) return null;
        ExamCatalogDto catalog = await _content.GetCatalogAsync();
        if (categoryId is { } id && !catalog.Categories.Any(c => c.CategoryId == id && c.PartNo == partNo && c.IsLeaf)) return "LISTENING_CATEGORY_INVALID";
        if (levelNo is { } level && catalog.Levels.All(l => l.LevelNo != level)) return "LISTENING_LEVEL_INVALID";
        return null;
    }
}
