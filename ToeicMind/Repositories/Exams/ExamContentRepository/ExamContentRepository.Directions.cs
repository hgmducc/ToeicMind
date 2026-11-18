using Microsoft.EntityFrameworkCore;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Models.Exams;
using ToeicMind.Services.Exams;

namespace ToeicMind.Repositories.Exams;

// Hướng dẫn làm bài (mặc định và riêng từng đề).
public partial class ExamContentRepository
{
    public async Task<List<ExamDirection>> GetDirectionsAsync(int? examId, bool effective)
    {
        var directions = await _db.ExamDirections.AsNoTracking().Include(d => d.Media).Where(d => !d.IsDeleted &&
            (effective ? d.ExamId == null : d.ExamId == examId)).ToListAsync();
        return directions.GroupBy(d => new { d.DirectionKind, d.Skill, d.PartNo }).Select(g => g.OrderByDescending(d => d.ExamId.HasValue).First())
            .OrderBy(d => d.DirectionKind).ThenBy(d => d.Skill).ThenBy(d => d.PartNo).ToList();
    }

    public Task<ExamDirection?> GetDirectionAsync(int id) =>
        _db.ExamDirections.AsNoTracking().Include(d => d.Media).FirstOrDefaultAsync(d => d.DirectionId == id && !d.IsDeleted);

    public Task<(ExamDirection? Result, string? Error)> SaveDirectionAsync(ExamDirection requested, int? directionId) =>
        ChangeAsync<ExamDirection>(requested.ExamId, async () =>
        {
            if (!requested.ExamId.HasValue && await DefaultDirectionUsedAsync(requested)) return (null, "DEFAULT_DIRECTIONS_LOCKED");
            if (!directionId.HasValue) { _db.ExamDirections.Add(requested); return (requested, null); }
            var direction = await _db.ExamDirections.Include(d => d.Media).FirstOrDefaultAsync(d => d.DirectionId == directionId && !d.IsDeleted);
            if (direction is null) return (null, "DIRECTION_NOT_FOUND");
            if (direction.ExamId != requested.ExamId || direction.DirectionKind != requested.DirectionKind || direction.Skill != requested.Skill || direction.PartNo != requested.PartNo)
                return (null, "DIRECTION_KEY_IMMUTABLE");
            direction.DirectionsEn = requested.DirectionsEn;
            direction.DirectionsVi = requested.DirectionsVi;
            direction.ExampleEn = requested.ExampleEn;
            direction.ExampleVi = requested.ExampleVi;
            direction.UpdatedAt = DateTime.UtcNow;
            return (direction, null);
        });

    public async Task<(int Inserted, List<ExamDirectionDto> Directions)> SeedDefaultDirectionsAsync()
    {
        var inserted = 0;
        var now = DateTime.UtcNow;
        foreach (var d in DefaultExamDirections.All)
        {
            // Idempotent: chỉ chèn khi chưa có bản ghi mặc định (ExamId IS NULL) trùng key.
            var exists = await _db.ExamDirections.AnyAsync(x =>
                x.ExamId == null && !x.IsDeleted &&
                x.DirectionKind == d.Kind &&
                x.Skill == d.Skill &&
                x.PartNo == d.PartNo);
            if (exists) continue;
            _db.ExamDirections.Add(new ExamDirection
            {
                ExamId = null,
                DirectionKind = d.Kind,
                Skill = d.Skill,
                PartNo = d.PartNo,
                DirectionsEn = d.En,
                DirectionsVi = d.Vi,
                ExampleEn = d.ExampleEn,
                ExampleVi = d.ExampleVi,
                IsDeleted = false,
                CreatedAt = now,
                UpdatedAt = now
            });
            inserted++;
        }
        if (inserted > 0) await _db.SaveChangesAsync();

        var all = await _db.ExamDirections.AsNoTracking().Include(d => d.Media)
            .Where(d => d.ExamId == null && !d.IsDeleted)
            .OrderBy(d => d.DirectionKind).ThenBy(d => d.Skill).ThenBy(d => d.PartNo)
            .ToListAsync();
        return (inserted, all.Select(ExamContentMapper.ToDto).ToList());
    }
}
