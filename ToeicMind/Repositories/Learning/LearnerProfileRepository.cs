using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;

namespace ToeicMind.Repositories.Learning;

/// <summary>Truy cập dữ liệu cá nhân hóa: bảng LearnerProfile và các lượt làm bài có điểm của người học.</summary>
public class LearnerProfileRepository : ILearnerProfileRepository
{
    private readonly AppDbContext _db;
    public LearnerProfileRepository(AppDbContext db) => _db = db;

    public Task<LearnerProfile?> GetAsync(int userId) =>
        _db.LearnerProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);

    public async Task<LearnerProfile> SaveAsync(int userId, short? targetScore, DateOnly? examDate, short? dailyMinutes)
    {
        var now = DateTime.UtcNow;
        var updated = await _db.LearnerProfiles.Where(p => p.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.TargetScore, targetScore).SetProperty(p => p.ExamDate, examDate)
                .SetProperty(p => p.DailyMinutes, dailyMinutes).SetProperty(p => p.UpdatedAt, now));
        if (updated == 0)
        {
            try
            {
                _db.LearnerProfiles.Add(new LearnerProfile
                {
                    UserId = userId, TargetScore = targetScore, ExamDate = examDate, DailyMinutes = dailyMinutes, CreatedAt = now, UpdatedAt = now
                });
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
            {
                // Request khác vừa tạo dòng: ghi đè bằng giá trị của request này.
                _db.ChangeTracker.Clear();
                await _db.LearnerProfiles.Where(p => p.UserId == userId)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.TargetScore, targetScore).SetProperty(p => p.ExamDate, examDate)
                        .SetProperty(p => p.DailyMinutes, dailyMinutes).SetProperty(p => p.UpdatedAt, now));
            }
            finally { _db.ChangeTracker.Clear(); }
        }
        return (await GetAsync(userId))!;
    }

    public Task<List<ScoredAttemptRow>> GetScoredAttemptsAsync(int userId, int limit) =>
        _db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted && a.Status == AttemptStatus.Submitted && a.Mode == AttemptMode.Exam &&
                        (a.ListeningScaled != null || a.ReadingScaled != null))
            .OrderByDescending(a => a.SubmittedAt).Take(limit)
            .Select(a => new ScoredAttemptRow(a.AttemptId, a.Scope, a.SubmittedAt!.Value, a.ListeningScaled, a.ReadingScaled))
            .ToListAsync();

    public Task<DateTime?> GetLastMockTestAtAsync(int userId) =>
        _db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted && a.Status == AttemptStatus.Submitted && a.Mode == AttemptMode.Exam &&
                        (a.Scope == AttemptScope.Full || a.Scope == AttemptScope.Listening || a.Scope == AttemptScope.Reading))
            .MaxAsync(a => a.SubmittedAt);
}
