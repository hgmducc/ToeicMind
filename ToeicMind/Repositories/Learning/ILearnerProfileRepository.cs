namespace ToeicMind.Repositories.Learning;

/// <summary>Một lượt Luyện thi đã nộp có điểm kỹ năng (bài kiểm tra đầu vào hoặc bài đủ 100 câu của kỹ năng).</summary>
public record ScoredAttemptRow(int AttemptId, string Scope, DateTime SubmittedAt, short? ListeningScaled, short? ReadingScaled);

/// <summary>Hợp đồng truy cập dữ liệu cá nhân hóa (CHG-007): mục tiêu người học, các lần đo điểm, lần thi thử gần nhất (xem LearnerProfileRepository).</summary>
public interface ILearnerProfileRepository
{
    Task<LearnerProfile?> GetAsync(int userId);
    // Tạo hoặc cập nhật mục tiêu (một dòng mỗi người học).
    Task<LearnerProfile> SaveAsync(int userId, short? targetScore, DateOnly? examDate, short? dailyMinutes);
    // Các lượt Luyện thi có điểm kỹ năng, mới nhất trước.
    Task<List<ScoredAttemptRow>> GetScoredAttemptsAsync(int userId, int limit);
    // Thời điểm nộp bài thi thử gần nhất (Luyện thi trọn đề hoặc trọn phần Nghe/Đọc).
    Task<DateTime?> GetLastMockTestAtAsync(int userId);
}
