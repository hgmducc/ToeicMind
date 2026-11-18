using ToeicMind.DTOs.Exams.Request;
using ToeicMind.DTOs.Exams.Response;
using Microsoft.Extensions.Caching.Memory;
using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Exams;
using ToeicMind.Services.Vip;

namespace ToeicMind.Services.Exams;

/// <summary>Nghiệp vụ bộ đề và đề thi: danh sách, tạo, sửa, xóa mềm, khôi phục.</summary>
public class ExamService : IExamService
{
    private readonly IExamRepository _repo;
    private readonly IAccessService _access;
    private readonly IMemoryCache _cache;

    public ExamService(IExamRepository repo, IAccessService access, IMemoryCache cache)
    {
        _repo = repo;
        _access = access;
        _cache = cache;
    }

    public async Task<ExamPageDto<ExamSetDto>> ListSetsAsync(ExamPageRequestDto query, bool learner, bool deleted = false)
    {
        var (items, totalCount) = await _repo.ListSetsAsync(query, learner, deleted);
        return new() { Items = items.Select(ExamMapper.ToDto).ToList(), TotalCount = totalCount, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<ExamSetDto?> GetSetAsync(int id, bool learner)
    {
        var summary = await _repo.GetSetAsync(id, learner);
        return summary is null ? null : ExamMapper.ToDto(summary);
    }

    // viewerId: người xem (null = khách) để đánh dấu IsLocked cho đề VIP trong danh sách của người học.
    public async Task<ExamPageDto<ExamDto>> ListExamsAsync(ExamBrowseRequestDto query, bool learner, string? status = null, bool deleted = false, int? viewerId = null)
    {
        var (items, totalCount) = await _repo.ListExamsAsync(query, learner, status, deleted);
        var dtos = items.Select(ExamMapper.ToDto).ToList();
        if (learner && !await _access.HasVipAsync(viewerId))
            foreach (var dto in dtos) dto.IsLocked = dto.EffectiveAccess == Access.Vip;
        return new() { Items = dtos, TotalCount = totalCount, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<ExamDto?> GetExamAsync(int id, bool learner)
    {
        var exam = await _repo.GetExamAsync(id, learner);
        return exam is null ? null : ExamMapper.ToDto(exam);
    }

    public async Task<(ExamSetDto? Result, string? Error)> SaveSetAsync(int? id, SaveExamSetRequestDto dto, int userId)
    {
        var requested = new ExamSet
        {
            ExamSetId = id ?? 0, Name = dto.Name.Trim(), Description = Optional(dto.Description),
            ExamAccess = dto.ExamAccess, VocabAccess = dto.VocabAccess, ListeningAccess = dto.ListeningAccess, ReadingAccess = dto.ReadingAccess,
            CreatedBy = userId, CreatedAt = DateTime.UtcNow
        };
        var (entity, error) = await _repo.SaveSetAsync(requested, !id.HasValue);
        if (error is not null) return (null, error);
        // Danh mục từ vựng được cache (phân quyền từ vựng theo bộ đề nằm trong đó) nên xóa để quyền mới có hiệu lực ngay.
        _cache.Remove("vocab:catalog");
        return (await GetSetAsync(entity!.ExamSetId, false), null);
    }

    public async Task<(ExamDto? Result, string? Error)> SaveExamAsync(int? id, SaveExamRequestDto dto, int userId)
    {
        var current = id.HasValue ? await _repo.GetExamAsync(id.Value, false) : null;
        if (id.HasValue && current is null) return (null, "EXAM_NOT_FOUND");
        var requested = new Exam
        {
            ExamId = id ?? 0, ExamSetId = dto.ExamSetId,
            ExamCode = string.IsNullOrWhiteSpace(dto.ExamCode) ? current?.ExamCode ?? $"EXAM-{Guid.NewGuid():N}"[..25] : dto.ExamCode.Trim(),
            Title = dto.Title.Trim(), Description = Optional(dto.Description), AccessLevel = dto.AccessLevel,
            CreatedBy = userId, CreatedAt = DateTime.UtcNow
        };
        var (entity, error) = await _repo.SaveExamAsync(requested, !id.HasValue, id.HasValue && string.IsNullOrWhiteSpace(dto.ExamCode));
        if (error is not null) return (null, error);
        // Đọc lại để có quyền làm đề thực tế (gồm quyền kế thừa từ bộ đề).
        return (ExamMapper.ToDto(await _repo.GetExamAsync(entity!.ExamId, false) ?? entity), null);
    }

    public Task<string?> SetDeletedAsync(int id, bool deleted) => _repo.SetDeletedAsync(id, deleted);
    public Task<string?> ExamDeletedAsync(int id, bool deleted) => _repo.ExamDeletedAsync(id, deleted);

    private static string? Optional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
