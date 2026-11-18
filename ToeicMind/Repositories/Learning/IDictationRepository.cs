using ToeicMind.Models.Learning;

namespace ToeicMind.Repositories.Learning;

/// <summary>Hợp đồng truy cập dữ liệu Nghe chép: bộ clip của đề gốc, clip, và tiến độ nghe chép của người học.</summary>
public interface IDictationRepository
{
    // Các bộ clip luyện được (chưa xóa, thuộc đề chưa xóa, có ít nhất một clip; chỉ đề PUBLISHED nếu bật Learning:StudyContentOnlyPublished) khớp bộ lọc, kèm tiến độ của người dùng.
    // userId null = khách: không có tiến độ.
    Task<List<DictationItemRow>> GetItemsAsync(int? userId, DictationFilter filter);

    // Dạng đặc biệt của các nhóm: groupId → danh sách SpecialTagId.
    Task<ILookup<int, int>> GetTagsAsync(IReadOnlyCollection<int> groupIds);

    // Các clip của một bộ clip, theo thứ tự SeqNo (audio có thể rỗng nếu Admin chưa tải lên).
    Task<List<DictationClipRow>> GetClipsAsync(int itemId);

    // Bản dịch tiếng Việt cả nhóm câu (QuestionGroup.TranslationVi); null nếu chưa có.
    Task<string?> GetGroupTranslationAsync(int groupId);

    // Cộng một lượt luyện (accuracy = null thì giữ nguyên độ chính xác cũ). Tạo dòng mới nếu chưa có.
    Task<DictationProgressRow> SaveProgressAsync(int userId, int itemId, string mode, decimal? accuracy, DateTime at);

    // Tăng số clip đã luyện trong ngày học (cột ClipPracticeCount).
    Task TouchClipStudyDayAsync(int userId, DateOnly date, int clips);
}
