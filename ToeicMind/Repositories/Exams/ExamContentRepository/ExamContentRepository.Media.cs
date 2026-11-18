using Microsoft.EntityFrameworkCore;
using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Exams;

// Tệp media (audio/ảnh) gắn với nhóm, clip hoặc hướng dẫn.
public partial class ExamContentRepository
{
    public Task<MediaFile?> GetMediaAsync(int id) =>
        _db.Media.AsNoTracking().Include(m => m.Group).Include(m => m.Direction)
            .Include(m => m.Clip).ThenInclude(c => c!.Item).ThenInclude(i => i.Group)
            .FirstOrDefaultAsync(m => m.MediaId == id && !m.IsDeleted &&
                // Clip của bộ sưu tầm (TH2, không có nhóm) chỉ cần bộ clip chưa xóa; clip cắt từ đề cần nhóm và đề chưa xóa.
                (!m.ClipId.HasValue || (!m.Clip!.IsDeleted && !m.Clip.Item.IsDeleted &&
                    (!m.Clip.Item.GroupId.HasValue || (!m.Clip.Item.Group!.IsDeleted && !m.Clip.Item.Group.Exam.IsDeleted)))) &&
                (!m.GroupId.HasValue || (!m.Group!.IsDeleted && !m.Group.Exam.IsDeleted)) &&
                (!m.DirectionId.HasValue || !m.Direction!.IsDeleted));

    public Task<bool> IsMediaKeyRegisteredAsync(string key) => _db.Media.AsNoTracking().AnyAsync(m => m.StorageKey == key);

    public Task<(MediaFile? Result, string? Error)> SaveMediaAsync(MediaFile requested, int? examId) =>
        ChangeAsync<MediaFile>(examId, async () =>
        {
            if (requested.ClipId.HasValue)
            {
                var clip = await _db.ListeningClips.AsNoTracking().Include(c => c.Item).ThenInclude(i => i.Group)
                    .FirstOrDefaultAsync(c => c.ClipId == requested.ClipId && !c.IsDeleted && !c.Item.IsDeleted &&
                        !c.Item.Group!.IsDeleted && c.Item.Group.ExamId == examId);
                if (clip is null) return (null, "CLIP_NOT_FOUND");
                if (requested.MediaType != "AUDIO") return (null, "MEDIA_TYPE_INVALID");
            }
            else if (requested.GroupId.HasValue)
            {
                var group = await _db.QuestionGroups.AsNoTracking().FirstOrDefaultAsync(g => g.GroupId == requested.GroupId && g.ExamId == examId && !g.IsDeleted);
                if (group is null) return (null, "GROUP_NOT_FOUND");
                requested.PartNo = group.PartNo;
                if (requested.MediaType == "AUDIO" && group.PartNo > 4) return (null, "AUDIO_NOT_ALLOWED");
            }
            else
            {
                var direction = await _db.ExamDirections.AsNoTracking().FirstOrDefaultAsync(d => d.DirectionId == requested.DirectionId && d.ExamId == examId && !d.IsDeleted);
                if (direction is null) return (null, "DIRECTION_NOT_FOUND");
                if (!direction.ExamId.HasValue && await DefaultDirectionUsedAsync(direction)) return (null, "DEFAULT_DIRECTIONS_LOCKED");
            }
            if (requested.MediaType == "AUDIO" || requested.DirectionId.HasValue)
            {
                var replaced = await _db.Media.Where(m => !m.IsDeleted && m.MediaType == requested.MediaType &&
                    ((requested.GroupId.HasValue && m.GroupId == requested.GroupId) || (requested.ClipId.HasValue && m.ClipId == requested.ClipId) ||
                     (requested.DirectionId.HasValue && m.DirectionId == requested.DirectionId))).ToListAsync();
                foreach (var media in replaced) { media.IsDeleted = true; media.DeletedAt = DateTime.UtcNow; }
                await _db.SaveChangesAsync();
            }
            _db.Media.Add(requested);
            return (requested, null);
        });

    public async Task<string?> DeleteMediaAsync(int id)
    {
        var current = await GetMediaAsync(id);
        if (current is null) return "MEDIA_NOT_FOUND";
        var examId = current.Group?.ExamId ?? current.Direction?.ExamId ?? current.Clip?.Item.Group?.ExamId;
        var (_, error) = await ChangeAsync<MediaFile>(examId, async () =>
        {
            if (current.Direction is { ExamId: null } direction && await DefaultDirectionUsedAsync(direction))
                return (null, "DEFAULT_DIRECTIONS_LOCKED");
            var media = await _db.Media.FirstAsync(m => m.MediaId == id);
            media.IsDeleted = true;
            media.DeletedAt = DateTime.UtcNow;
            return (media, null);
        });
        return error;
    }
}
