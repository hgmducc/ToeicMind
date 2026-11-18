namespace ToeicMind.Repositories.Learning;

/// <summary>Một nhóm câu dùng để tự ghép bài kiểm tra đầu vào: Part, Level (của nhóm, hoặc Level thấp nhất trong các câu), số câu, phân loại.</summary>
public record PlacementPoolRow(int GroupId, int ExamId, byte PartNo, byte? LevelNo, int QuestionCount, int CategoryId);

/// <summary>Nhóm đã chọn của một bài kiểm tra kèm cấu trúc (để tính số câu theo Part). Live = nhóm, đề, bộ đề chưa xóa và còn câu.</summary>
public record PlacementGroupLink(int PlacementTestId, int GroupId, short SortOrder, byte PartNo, int QuestionCount, bool Live);

/// <summary>Lượt kiểm tra đầu vào đã nộp gần nhất của người học (điểm ước tính lưu ở cột *Scaled của Attempt).</summary>
public record PlacementAttemptRow(int AttemptId, int? PlacementTestId, string? Title, DateTime? SubmittedAt, short TotalQuestions, short? CorrectCount,
    short? ListeningScaled, short? ReadingScaled, short? TotalScaled);
