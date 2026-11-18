using System.Text.RegularExpressions;
using Amazon.Runtime;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Exams;
using ToeicMind.Services.Exams;

namespace ToeicMind.Services.Media;

/// <summary>Nghiệp vụ media của đề: kiểm tra tên/định dạng/dung lượng, upload lên R2, ghi database, tạo link ký, danh sách vị trí cần file.</summary>
public class ExamMediaService : IExamMediaService
{
    private readonly IExamContentRepository _repo;
    private readonly IExamRepository _exams;
    private readonly IMediaStorage _storage;
    private readonly IConfiguration _config;
    private readonly ILogger<ExamMediaService> _logger;

    public ExamMediaService(IExamContentRepository repo, IExamRepository exams, IMediaStorage storage, IConfiguration config, ILogger<ExamMediaService> logger)
    { _repo = repo; _exams = exams; _storage = storage; _config = config; _logger = logger; }

    public async Task<(MediaFileDto? Result, string? Error)> UploadAsync(int? examId, int? groupId, int? directionId,
        IFormFile file, string? altText, byte sortOrder, CancellationToken cancellationToken, int? clipId = null, string? fileName = null)
    {
        if (file.Length <= 0 || file.Length > 50 * 1024 * 1024 || sortOrder == 0 || altText?.Length > 300) return (null, "MEDIA_INVALID");
        await using var bytes = new MemoryStream();
        await file.CopyToAsync(bytes, cancellationToken);
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var (type, contentType) = MediaFileValidator.Detect(bytes.GetBuffer().AsSpan(0, (int)bytes.Length), extension);
        if (type is null) return (null, "MEDIA_TYPE_INVALID");
        var maxBytes = type == "AUDIO" ? _config.GetValue<long?>("Media:MaxAudioBytes") ?? 25 * 1024 * 1024 : _config.GetValue<long?>("Media:MaxImageBytes") ?? 10 * 1024 * 1024;
        if (bytes.Length > maxBytes) return (null, "MEDIA_TOO_LARGE");
        string prefix;
        byte? partNo = null;
        QuestionGroup? group = null;
        ListeningClip? clip = null;
        if (groupId.HasValue && examId.HasValue && !directionId.HasValue)
        {
            group = await _repo.GetGroupAsync(examId.Value, groupId.Value);
            if (group is null) return (null, "GROUP_NOT_FOUND");
            if (type == "AUDIO" && group.PartNo > 4) return (null, "AUDIO_NOT_ALLOWED");
            partNo = group.PartNo;
            prefix = $"exams/{examId}/p{partNo}/{group.GroupOrder:D3}";
            if (clipId.HasValue)
            {
                if (type != "AUDIO") return (null, "MEDIA_TYPE_INVALID");
                clip = await _repo.GetClipAsync(examId.Value, groupId.Value, clipId.Value);
                if (clip is null) return (null, "CLIP_NOT_FOUND");
                prefix += $"/clips/{clipId}";
            }
        }
        else if (directionId.HasValue && !groupId.HasValue)
        {
            var direction = await _repo.GetDirectionAsync(directionId.Value);
            if (direction is null) return (null, "DIRECTION_NOT_FOUND");
            examId = direction.ExamId;
            prefix = $"directions/{examId?.ToString() ?? "default"}/{direction.Skill?.ToLowerInvariant() ?? $"p{direction.PartNo}"}";
        }
        else return (null, "MEDIA_INVALID");
        Exam? exam = null;
        if (examId.HasValue)
        {
            exam = await _exams.GetExamAsync(examId.Value, false);
            if (exam is null || exam.IsDeleted) return (null, "EXAM_NOT_FOUND");
            if (await _repo.HasAttemptsAsync(examId.Value)) return (null, "EXAM_CONTENT_LOCKED");
            if (exam.Status != "DRAFT") return (null, "EXAM_MUST_BE_DRAFT");
        }
        string slug;
        if (group is not null)
        {
            // Media nhóm/clip dùng tên theo quy tắc do FE gửi; tên sai (nhầm nhóm, nhầm clip) bị từ chối trước khi ghi R2.
            slug = MediaFileNaming.GroupName(exam!.ExamCode, group);
            if (clip is not null) slug = MediaFileNaming.ClipName(slug, clip.SeqNo);
            if (!MediaFileNaming.Matches(fileName, slug)) return (null, "MEDIA_FILE_NAME_INVALID");
        }
        else
        {
            slug = Regex.Replace(Path.GetFileNameWithoutExtension(file.FileName), "[^A-Za-z0-9_-]", "-").Trim('-');
            if (slug.Length > 40) slug = slug[..40];
            if (slug.Length == 0) slug = type.ToLowerInvariant();
        }
        var key = $"{prefix}/{slug}-{Guid.NewGuid():N}{extension}";
        var saved = false;
        try
        {
            bytes.Position = 0;
            await _storage.PutAsync(key, bytes, contentType!, cancellationToken);
            var (result, error) = await _repo.SaveMediaAsync(new MediaFile
            {
                GroupId = clipId.HasValue ? null : groupId,
                ClipId = clipId,
                DirectionId = directionId,
                PartNo = clipId.HasValue ? null : partNo,
                MediaType = type,
                StorageKey = key,
                AltText = string.IsNullOrWhiteSpace(altText) ? null : altText.Trim(),
                SortOrder = sortOrder,
                CreatedAt = DateTime.UtcNow
            }, examId);
            saved = error is null;
            return (result is null ? null : ExamContentMapper.ToDto(result), error);
        }
        catch (Exception ex) when (IsStorageFailure(ex, cancellationToken))
        {
            _logger.LogError(ex, "R2 upload failed for {StorageKey}: {ErrorType} {ErrorCode} {HttpStatus}", key, ex.GetType().Name,
                (ex as AmazonServiceException)?.ErrorCode, (ex as AmazonServiceException)?.StatusCode);
            return (null, "STORAGE_UNAVAILABLE");
        }
        finally
        {
            if (!saved)
            {
                try
                {
                    // Không xóa khi DB đã commit hoặc không xác định được trạng thái commit.
                    if (!await _repo.IsMediaKeyRegisteredAsync(key)) await _storage.DeleteUncommittedAsync(key, CancellationToken.None);
                }
                catch
                {
                    _logger.LogError("R2 cleanup pending for unconfirmed upload {StorageKey}", key);
                }
            }
        }
    }

    public async Task<(List<MediaSlotDto>? Result, string? Error)> GetSlotsAsync(int examId)
    {
        var exam = await _exams.GetExamAsync(examId, false);
        if (exam is null || exam.IsDeleted) return (null, "EXAM_NOT_FOUND");
        // Nhóm Part 1 hoặc có cờ hình/bảng bắt buộc có hình (sp_ValidateExam).
        var imageTags = (await _repo.GetCatalogAsync()).SpecialTags.Where(t => t.Code == "chart_or_table").Select(t => t.SpecialTagId).ToHashSet();
        var slots = new List<MediaSlotDto>();
        foreach (var group in await _repo.GetGroupsAsync(examId, null))
        {
            var name = MediaFileNaming.GroupName(exam.ExamCode, group);
            var path = $"/api/admin/exams/{examId}/groups/{group.GroupId}";
            MediaSlotDto Slot(string slot, string fileName, bool uploaded, string uploadPath, int? clipId = null) => new()
            { Slot = slot, PartNo = group.PartNo, GroupId = group.GroupId, ClipId = clipId, FileName = fileName, Uploaded = uploaded, UploadPath = uploadPath };
            var media = group.Media.Where(m => !m.IsDeleted).ToList();
            if (group.PartNo <= 4) slots.Add(Slot("GROUP_AUDIO", name, media.Any(m => m.MediaType == "AUDIO"), $"{path}/media"));
            if (group.PartNo == 1 || group.Tags.Any(t => imageTags.Contains(t.SpecialTagId)))
                slots.Add(Slot("GROUP_IMAGE", name, media.Any(m => m.MediaType == "IMAGE"), $"{path}/media"));
            foreach (var clip in group.ListeningItems.Where(i => !i.IsDeleted).SelectMany(i => i.Clips).Where(c => !c.IsDeleted).OrderBy(c => c.SeqNo))
                slots.Add(Slot("CLIP_AUDIO", MediaFileNaming.ClipName(name, clip.SeqNo), clip.Media.Any(m => !m.IsDeleted), $"{path}/segments/{clip.ClipId}/media", clip.ClipId));
        }
        return (slots, null);
    }

    public async Task<(SignedMediaUrlDto? Result, string? Error)> SignReadAsync(int id)
    {
        var media = await _repo.GetMediaAsync(id);
        if (media is null) return (null, "MEDIA_NOT_FOUND");
        try
        {
            var minutes = Math.Clamp(_config.GetValue<int?>("R2:SignedUrlMinutes") ?? 10, 1, 60);
            var (url, expiresAt) = await _storage.SignReadAsync(media.StorageKey, TimeSpan.FromMinutes(minutes));
            return (new() { MediaId = id, Url = url, ExpiresAt = expiresAt }, null);
        }
        catch (Exception ex) when (IsStorageFailure(ex, CancellationToken.None))
        {
            _logger.LogError(ex, "R2 sign read failed for media {MediaId}: {ErrorType}", id, ex.GetType().Name);
            return (null, "STORAGE_UNAVAILABLE");
        }
    }

    // Lỗi hạ tầng R2 (cấu hình, mạng, bị từ chối quyền, hết thời gian chờ) trả STORAGE_UNAVAILABLE thay vì 500; hủy do client thì để nguyên.
    private static bool IsStorageFailure(Exception ex, CancellationToken cancellationToken) =>
        ex is AmazonClientException or HttpRequestException or InvalidOperationException or IOException or TimeoutException ||
        (ex is OperationCanceledException && !cancellationToken.IsCancellationRequested);

    public Task<string?> DeleteAsync(int id) => _repo.DeleteMediaAsync(id);
}
