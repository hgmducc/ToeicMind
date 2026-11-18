using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.Repositories.Exams;

/// <summary>
/// Đọc nội dung đề để hiển thị (chỉ đọc, nhanh). Khác với ExamContentRepository (nạp cả đồ thị entity để sửa),
/// lớp này chạy vài truy vấn phẳng, chỉ lấy cột cần dùng và ghép sẵn thành DTO.
/// </summary>
public interface IExamContentReader
{
    // Các nhóm của một đề (có thể giới hạn một Part), sắp theo GroupOrder; bỏ qua dữ liệu đã xóa mềm.
    Task<List<QuestionGroupDto>> ReadByExamAsync(int examId, byte? partNo);

    // Các nhóm theo danh sách ID (ngân hàng câu hỏi, xem lại bài). includeDeleted = true vẫn trả câu đã xóa mềm để xem lại bài cũ (BR-17).
    Task<List<QuestionGroupDto>> ReadByGroupIdsAsync(IReadOnlyCollection<int> groupIds, bool includeDeleted);

    // Bản "vào thi" tối giản của một Part: chữ, đáp án (không có đáp án đúng/giải thích/transcript) và khóa media chưa ký. Không gồm clip cắt.
    Task<List<PlayGroupSource>> ReadPlayAsync(int examId, byte partNo);

    // Giống ReadPlayAsync nhưng theo danh sách nhóm (học theo ngân hàng câu hỏi, có thể thuộc nhiều đề).
    Task<List<PlayGroupSource>> ReadPlayByGroupIdsAsync(IReadOnlyCollection<int> groupIds);

    // Dàn ý rất nhẹ của đề (không có chữ): mỗi nhóm một dòng, kèm số câu và có audio/hình.
    Task<List<OutlineRow>> ReadOutlineAsync(int examId);

    // Hướng dẫn hiệu lực của đề: bản riêng của đề được ưu tiên hơn bản mặc định; kèm media.
    Task<List<ExamDirectionDto>> ReadDirectionsAsync(int examId);
}

/// <summary>Một dòng dàn ý: nhóm câu hỏi và Part chứa nó.</summary>
public record OutlineRow(byte PartNo, GroupOutlineDto Group);

/// <summary>Nhóm câu hỏi để làm bài cùng các khóa media chưa ký (ký URL làm ở Service khi trả lời).</summary>
public record PlayGroupSource(PlayGroupDto Group, List<PlayMediaSource> Media);

/// <summary>Một tệp media của nhóm (ClipId = null, dùng khi làm đề) hoặc của clip cắt (Nghe chép; ClipSeq dùng để sắp thứ tự).</summary>
public record PlayMediaSource(int MediaId, int? ClipId, short ClipSeq, string MediaType, string? AltText, byte SortOrder, string StorageKey);
