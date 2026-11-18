using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Repositories.Exams;
using ToeicMind.Repositories.Learning;
using ToeicMind.Services.Vip;

namespace ToeicMind.Services.Learning;

/// <summary>
/// Nghiệp vụ làm bài: tạo lượt, lưu đáp án, chấm điểm, kết quả, xem lại, lịch sử.
/// Luyện thi (EXAM): có đồng hồ (mặc định theo phạm vi hoặc người học tự đặt), không báo đúng/sai khi đang làm, chấm khi nộp hoặc hết giờ.
/// Luyện tập (PRACTICE) và ngân hàng (BANK): không đồng hồ, chấm và giải thích ngay từng câu, mỗi câu chọn một lần.
/// Làm đề chỉ dùng audio/hình của nhóm câu hỏi, không dùng clip cắt (clip dành cho Nghe chép).
/// </summary>
public class AttemptService : IAttemptService
{
    private const int GraceSeconds = 5;       // dung sai mạng khi đáp án đến sát giờ
    private const int ScoredQuestionCount = 100; // đủ 100 câu mỗi kỹ năng mới quy đổi điểm TOEIC

    private readonly IAttemptRepository _repo;
    private readonly IExamRepository _exams;
    private readonly IExamContentReader _reader;
    private readonly PlayMediaSigner _signer;
    private readonly IConfiguration _config;
    private readonly IAccessService _access;
    private readonly IExamContentRepository _content;

    public AttemptService(IAttemptRepository repo, IExamRepository exams, IExamContentReader reader, PlayMediaSigner signer, IConfiguration config, IAccessService access,
        IExamContentRepository content)
    {
        _content = content;
        _access = access;
        _repo = repo;
        _exams = exams;
        _reader = reader;
        _signer = signer;
        _config = config;
    }

    public async Task<(AttemptDto? Result, string? Error)> StartAsync(int userId, StartAttemptRequestDto dto)
    {
        var exam = await _exams.GetExamAsync(dto.ExamId, true);
        if (exam is null) return (null, "EXAM_NOT_FOUND");
        // Đề VIP chỉ mở cho tài khoản VIP còn hạn hoặc ADMIN.
        if (!await _access.CanUseAsync(userId, exam.EffectiveAccess)) return (null, "VIP_REQUIRED");

        var partNos = dto.Scope switch
        {
            AttemptScope.Full => Enumerable.Range(1, 7).Select(p => (byte)p).ToList(),
            AttemptScope.Listening => Enumerable.Range(1, 4).Select(p => (byte)p).ToList(),
            AttemptScope.Reading => Enumerable.Range(5, 3).Select(p => (byte)p).ToList(),
            _ => (dto.PartNos ?? []).Distinct().Order().ToList()
        };
        var scopeValid = dto.Scope == AttemptScope.Part
            ? partNos.Count > 0 && partNos.All(p => p is >= 1 and <= 7)
            : dto.PartNos is null or { Count: 0 };
        if (!scopeValid) return (null, "SCOPE_PARTS_INVALID");
        // Luyện thi luôn có đồng hồ; người học có thể tự đặt thời gian cho mọi phạm vi. Luyện tập không có đồng hồ.
        if (dto.TimeLimitSeconds.HasValue && dto.Mode != AttemptMode.Exam) return (null, "TIME_LIMIT_NOT_ALLOWED");

        var questions = await _repo.GetScopeQuestionsAsync(dto.ExamId, partNos);
        if (questions.Count == 0) return (null, "SCOPE_EMPTY");

        int? limit = null;
        if (dto.Mode == AttemptMode.Exam)
            limit = dto.TimeLimitSeconds ?? ExamTimeRules.DefaultFor(dto.Scope) ?? await SuggestedSecondsAsync(questions);

        var attempt = await _repo.CreateAsync(new Attempt
        {
            UserId = userId, ExamId = dto.ExamId, Mode = dto.Mode, Scope = dto.Scope, Status = AttemptStatus.InProgress,
            TimeLimitSeconds = limit, StartedAt = DateTime.UtcNow, TotalQuestions = (short)questions.Count
        }, questions.Select(q => q.QuestionId).ToList());
        return (await BuildAsync(attempt), null);
    }

    public async Task<(AttemptDto? Result, string? Error)> StartBankAsync(int userId, IReadOnlyCollection<int> groupIds)
    {
        var questions = await _repo.GetQuestionsByGroupsAsync(groupIds);
        if (questions.Count == 0) return (null, "BANK_EMPTY");
        var attempt = await _repo.CreateAsync(new Attempt
        {
            UserId = userId, ExamId = null, Mode = AttemptMode.Practice, Scope = AttemptScope.Bank, Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow, TotalQuestions = (short)questions.Count
        }, questions.Select(q => q.QuestionId).ToList());
        return (await BuildAsync(attempt), null);
    }

    // Kiểm tra đầu vào: Luyện thi có giờ trên các nhóm câu Admin chọn (giữ thứ tự Admin sắp trong từng Part). Nội dung gửi kèm như ngân hàng.
    // Không kiểm tra quyền VIP: Admin chủ động đưa nhóm vào bài kiểm tra dành cho mọi người học.
    public async Task<(AttemptDto? Result, string? Error)> StartPlacementAsync(int userId, int placementTestId, IReadOnlyList<int> orderedGroupIds, int timeLimitSeconds)
    {
        var order = orderedGroupIds.Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);
        var questions = (await _repo.GetQuestionsByGroupsAsync(orderedGroupIds))
            .OrderBy(q => q.PartNo).ThenBy(q => order.GetValueOrDefault(q.GroupId, int.MaxValue)).ThenBy(q => q.QuestionNo).ToList();
        if (questions.Count == 0) return (null, "PLACEMENT_NOT_AVAILABLE");
        var attempt = await _repo.CreateAsync(new Attempt
        {
            UserId = userId, ExamId = null, Mode = AttemptMode.Exam, Scope = AttemptScope.Placement, Status = AttemptStatus.InProgress,
            TimeLimitSeconds = Math.Clamp(timeLimitSeconds, ExamTimeRules.MinSeconds, ExamTimeRules.MaxSeconds), StartedAt = DateTime.UtcNow,
            TotalQuestions = (short)questions.Count
        }, questions.Select(q => q.QuestionId).ToList(), placementTestId);
        return (await BuildAsync(attempt), null);
    }

    public async Task<(AttemptDto? Result, string? Error)> GetAsync(int userId, int attemptId)
    {
        var attempt = await _repo.GetOwnAsync(attemptId, userId);
        if (attempt is null) return (null, "ATTEMPT_NOT_FOUND");
        attempt = await ExpireIfNeededAsync(attempt);
        return (await BuildAsync(attempt), null);
    }

    public async Task<(AnswerResultDto? Result, string? Error)> SaveAnswerAsync(int userId, int attemptId, int questionId, int? optionId, bool reveal = true)
    {
        var attempt = await _repo.GetOwnAsync(attemptId, userId);
        if (attempt is null) return (null, "ATTEMPT_NOT_FOUND");
        if (attempt.Status != AttemptStatus.InProgress) return (null, "ATTEMPT_NOT_IN_PROGRESS");
        if (IsExpired(attempt))
        {
            await ExpireIfNeededAsync(attempt);
            return (null, "ATTEMPT_EXPIRED");
        }
        var target = await _repo.GetAnswerTargetAsync(attemptId, questionId, optionId);
        if (target is null) return (null, "QUESTION_NOT_IN_ATTEMPT");
        if (!target.OptionBelongsToQuestion) return (null, "OPTION_NOT_IN_QUESTION");

        var now = DateTime.UtcNow;
        if (attempt.Mode == AttemptMode.Exam)
        {
            await _repo.SaveAnswerAsync(target.AttemptAnswerId, optionId, null, now);
            return (new AnswerResultDto { QuestionId = questionId, SelectedOptionId = optionId }, null);
        }

        // Luyện tập / ngân hàng. Câu đã hiện đáp án (IsCorrect khác null) bị khóa, không đổi được.
        if (target.IsCorrect is not null) return (null, "ANSWER_LOCKED");
        if (!reveal)
        {
            // Chưa hiện đáp án: chỉ lưu lựa chọn như Luyện thi (đổi/bỏ được); chấm khi hiện đáp án hoặc khi nộp bài.
            await _repo.SaveAnswerAsync(target.AttemptAnswerId, optionId, null, now);
            return (new AnswerResultDto { QuestionId = questionId, SelectedOptionId = optionId }, null);
        }
        // Hiện đáp án: chấm ngay, ghi tiến độ, trả giải thích và khóa câu.
        if (optionId is null) return (null, "ANSWER_CLEAR_NOT_ALLOWED");
        var isCorrect = optionId == target.CorrectOptionId;
        await _repo.SaveAnswerAsync(target.AttemptAnswerId, optionId, isCorrect, now);
        await _repo.UpsertProgressAsync(userId, [new(questionId, isCorrect)], now);
        var source = await _repo.GetFeedbackAsync(questionId);
        return (new AnswerResultDto
        {
            QuestionId = questionId, SelectedOptionId = optionId,
            Feedback = new AnswerFeedbackDto
            {
                IsCorrect = isCorrect, CorrectOptionId = target.CorrectOptionId, Explanation = source?.Explanation,
                OptionExplanations = source?.OptionExplanations, TranscriptEn = source?.TranscriptEn,
                TranslationVi = source?.TranslationVi, Vocabularies = source?.Vocabularies ?? []
            }
        }, null);
    }

    public async Task<string?> AddDirectionTimeAsync(int userId, int attemptId, int seconds)
    {
        var attempt = await _repo.GetOwnAsync(attemptId, userId);
        if (attempt is null) return "ATTEMPT_NOT_FOUND";
        if (attempt.Status != AttemptStatus.InProgress) return "ATTEMPT_NOT_IN_PROGRESS";
        return await _repo.AddDirectionSecondsAsync(attemptId, seconds) ? null : "ATTEMPT_NOT_IN_PROGRESS";
    }

    public async Task<(AttemptResultDto? Result, string? Error)> SubmitAsync(int userId, int attemptId)
    {
        var attempt = await _repo.GetOwnAsync(attemptId, userId);
        if (attempt is null) return (null, "ATTEMPT_NOT_FOUND");
        if (attempt.Status == AttemptStatus.InProgress)
            attempt = IsExpired(attempt) ? await ExpireIfNeededAsync(attempt) : await GradeAsync(attempt, false, DateTime.UtcNow);
        // Nộp lại lượt đã nộp: trả lại kết quả cũ (idempotent).
        if (attempt.Status != AttemptStatus.Submitted) return (null, "ATTEMPT_NOT_IN_PROGRESS");
        return (await BuildResultAsync(attempt, false), null);
    }

    public async Task<string?> AbandonAsync(int userId, int attemptId)
    {
        var attempt = await _repo.GetOwnAsync(attemptId, userId);
        if (attempt is null) return "ATTEMPT_NOT_FOUND";
        if (attempt.Status != AttemptStatus.InProgress) return "ATTEMPT_NOT_IN_PROGRESS";
        return await _repo.AbandonAsync(attemptId, DateTime.UtcNow) ? null : "ATTEMPT_NOT_IN_PROGRESS";
    }

    // includeReview: kèm xem lại chi tiết từng câu (đáp án đúng, giải thích, transcript, từ vựng). Chỉ sau khi nộp; Luyện thi bị chặn khi tắt Learning:AllowExamReview.
    public async Task<(AttemptResultDto? Result, string? Error)> GetResultAsync(int userId, int attemptId, bool includeReview)
    {
        var attempt = await _repo.GetOwnAsync(attemptId, userId);
        if (attempt is null) return (null, "ATTEMPT_NOT_FOUND");
        attempt = await ExpireIfNeededAsync(attempt);
        if (attempt.Status != AttemptStatus.Submitted) return (null, "ATTEMPT_NOT_SUBMITTED");
        if (includeReview && !ShowsAnswers(attempt)) return (null, "REVIEW_NOT_ALLOWED");
        return (await BuildResultAsync(attempt, includeReview), null);
    }

    public async Task<AttemptPageDto> ListAsync(int userId, AttemptListRequestDto query)
    {
        var (items, total) = await _repo.ListAsync(userId, query);
        return new AttemptPageDto { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<string?> DeleteAsync(int userId, int attemptId)
    {
        var attempt = await _repo.GetOwnAsync(attemptId, userId);
        if (attempt is null) return "ATTEMPT_NOT_FOUND";
        if (attempt.Status == AttemptStatus.InProgress) return "ATTEMPT_IN_PROGRESS";
        return await _repo.SoftDeleteAsync(attemptId, userId) ? null : "ATTEMPT_NOT_FOUND";
    }

    // ---------- Hết giờ và chấm điểm ----------

    private static DateTime? Deadline(Attempt a) =>
        a.TimeLimitSeconds is null ? null : a.StartedAt.AddSeconds(a.TimeLimitSeconds.Value + a.DirectionSeconds);

    private static bool IsExpired(Attempt a) =>
        a.Status == AttemptStatus.InProgress && Deadline(a) is { } deadline && DateTime.UtcNow > deadline.AddSeconds(GraceSeconds);

    // Lượt quá giờ được tự nộp ở lần truy cập kế tiếp (lazy) hoặc bởi AttemptAutoSubmitWorker, tùy bên nào đến trước;
    // FinalizeAsync chỉ chốt khi còn IN_PROGRESS nên hai đường không chấm trùng. Thời điểm nộp ghi đúng hạn chót.
    private async Task<Attempt> ExpireIfNeededAsync(Attempt attempt) =>
        IsExpired(attempt) ? await GradeAsync(attempt, true, Deadline(attempt)!.Value) : attempt;

    public async Task<int> AutoSubmitOverdueAsync(int limit)
    {
        // Tác vụ nền chờ thêm một khoảng (mặc định 120 giây) sau hạn chót: client có thể chưa kịp gửi thời gian xem hướng dẫn cuối cùng.
        var grace = Math.Clamp(_config.GetValue<int?>("Learning:AutoSubmitGraceSeconds") ?? 120, GraceSeconds, 3600);
        var overdue = await _repo.GetOverdueAsync(DateTime.UtcNow.AddSeconds(-grace), limit);
        var submitted = 0;
        foreach (var attempt in overdue)
        {
            var graded = await GradeAsync(attempt, true, Deadline(attempt)!.Value);
            if (graded.Status != AttemptStatus.InProgress) submitted++;
        }
        return submitted;
    }

    private async Task<Attempt> GradeAsync(Attempt attempt, bool auto, DateTime submittedAt)
    {
        var rows = await _repo.GetAnswerRowsAsync(attempt.AttemptId);
        bool Correct(AnswerRow r) => r.SelectedOptionId is not null && r.SelectedOptionId == r.CorrectOptionId;
        var listening = rows.Where(r => r.PartNo <= 4).ToList();
        var reading = rows.Where(r => r.PartNo > 4).ToList();

        short? listeningScaled = null, readingScaled = null, totalScaled = null;
        // Kiểm tra đầu vào: điểm ước tính = tỷ lệ đúng của kỹ năng quy về 100 câu rồi tra ScoreConversion (bài ngắn hơn đề thật).
        if (attempt.Scope == AttemptScope.Placement)
        {
            if (listening.Count > 0) listeningScaled = await _repo.GetScaledScoreAsync("LISTENING", ScoreBands.Per100(listening.Count(Correct), listening.Count));
            if (reading.Count > 0) readingScaled = await _repo.GetScaledScoreAsync("READING", ScoreBands.Per100(reading.Count(Correct), reading.Count));
            if (listeningScaled is not null && readingScaled is not null) totalScaled = (short)(listeningScaled + readingScaled);
        }
        // Quy đổi điểm TOEIC (BR-07) cho mọi lượt làm trong một đề (Luyện thi hoặc Luyện tập), chỉ khi bài phủ đủ 100 câu của kỹ năng đó
        // (trọn đề, trọn phần Nghe/Đọc, hoặc tự chọn các Part cộng lại đủ 100 câu). Học theo ngân hàng không quy đổi (BR-05).
        else if (attempt.Scope != AttemptScope.Bank)
        {
            if (listening.Count == ScoredQuestionCount) listeningScaled = await _repo.GetScaledScoreAsync("LISTENING", listening.Count(Correct));
            if (reading.Count == ScoredQuestionCount) readingScaled = await _repo.GetScaledScoreAsync("READING", reading.Count(Correct));
            if (listeningScaled is not null && readingScaled is not null) totalScaled = (short)(listeningScaled + readingScaled);
        }

        var duration = (int)Math.Max(0, (submittedAt - attempt.StartedAt).TotalSeconds - attempt.DirectionSeconds);
        var correctIds = rows.Where(Correct).Select(r => r.AttemptAnswerId).ToList();
        var graded = new GradedAttempt(AttemptStatus.Submitted, submittedAt, auto, duration, (short)correctIds.Count,
            listeningScaled, readingScaled, totalScaled, correctIds);
        var finalized = await _repo.FinalizeAsync(attempt.AttemptId, graded, rows.Select(r => r.AttemptAnswerId).ToList());
        if (finalized)
        {
            // Luyện thi cập nhật tiến độ từng câu lúc nộp. Luyện tập đã cập nhật khi hiện đáp án; câu đã chọn nhưng chưa hiện đáp án
            // (IsCorrect còn null trước khi chốt) được ghi lúc nộp.
            var pending = attempt.Mode == AttemptMode.Exam
                ? rows.Where(r => r.SelectedOptionId is not null)
                : rows.Where(r => r.SelectedOptionId is not null && r.IsCorrect is null);
            var progress = pending.Select(r => new KeyValuePair<int, bool>(r.QuestionId, Correct(r))).ToList();
            if (progress.Count > 0) await _repo.UpsertProgressAsync(attempt.UserId, progress, submittedAt);
            await _repo.TouchStudyDayAsync(attempt.UserId, _config.StudyDate(submittedAt));
        }
        return await _repo.GetAsync(attempt.AttemptId) ?? attempt;
    }

    private async Task<int> SuggestedSecondsAsync(IReadOnlyList<ScopeQuestion> questions)
    {
        var settings = (await _repo.GetPartSettingsAsync()).ToDictionary(p => p.PartNo, p => p.DefaultSecondsPerQuestion);
        return ExamTimeRules.Suggested(questions.GroupBy(q => q.PartNo).Select(g => (g.Key, g.Count())), settings);
    }

    // ---------- Dựng DTO ----------

    // Đáp án chỉ lộ sau khi nộp (kết quả/xem lại yêu cầu SUBMITTED); khi đang làm Luyện thi vẫn không trả đúng/sai.
    // Từ 17/11/2026 Luyện thi mặc định được xem kết quả từng câu và đáp án chi tiết sau khi nộp (BR-09 sửa theo yêu cầu người dùng);
    // đặt Learning:AllowExamReview = false để quay lại cách cũ. Kiểm tra đầu vào luôn được xem lại để học từ lỗi sai.
    private bool ShowsAnswers(Attempt attempt) =>
        attempt.Mode != AttemptMode.Exam || attempt.Scope == AttemptScope.Placement || _config.GetValue("Learning:AllowExamReview", true);

    // Nội dung gửi kèm lượt (không có "Part của một đề" để tải riêng): ngân hàng và kiểm tra đầu vào.
    private static bool CarriesContent(Attempt attempt) => attempt.Scope is AttemptScope.Bank or AttemptScope.Placement;

    // Câu theo thứ tự hiển thị: kiểm tra đầu vào giữ thứ tự tạo lượt (Part, thứ tự Admin sắp); lượt khác theo Part rồi số câu.
    private async Task<List<AnswerRow>> OrderedRowsAsync(Attempt attempt)
    {
        var rows = await _repo.GetAnswerRowsAsync(attempt.AttemptId);
        return attempt.Scope == AttemptScope.Placement ? rows.OrderBy(r => r.PartNo).ThenBy(r => r.AttemptAnswerId).ToList() : rows;
    }

    private async Task<AttemptDto> BuildAsync(Attempt attempt)
    {
        var rows = await OrderedRowsAsync(attempt);
        var dto = new AttemptDto
        {
            AttemptId = attempt.AttemptId, ExamId = attempt.ExamId, Mode = attempt.Mode, Scope = attempt.Scope, Status = attempt.Status,
            TimeLimitSeconds = attempt.TimeLimitSeconds, StartedAt = attempt.StartedAt, SubmittedAt = attempt.SubmittedAt,
            DirectionSeconds = attempt.DirectionSeconds, TotalQuestions = attempt.TotalQuestions,
            AnsweredCount = rows.Count(r => r.SelectedOptionId is not null),
            PartNos = rows.Select(r => r.PartNo).Distinct().Order().ToList(),
            Questions = rows.Select(r => new AttemptQuestionDto
            {
                QuestionId = r.QuestionId, PartNo = r.PartNo, QuestionNo = r.QuestionNo, GroupId = r.GroupId,
                SelectedOptionId = r.SelectedOptionId,
                // Luyện thi không lộ đúng/sai khi đang làm; Luyện tập đã chấm ngay nên hiển thị được.
                IsCorrect = attempt.Mode == AttemptMode.Practice ? r.IsCorrect : null
            }).ToList()
        };
        if (attempt.Status == AttemptStatus.InProgress && Deadline(attempt) is { } deadline)
            dto.RemainingSeconds = (int)Math.Max(0, Math.Ceiling((deadline - DateTime.UtcNow).TotalSeconds));
        if (CarriesContent(attempt))
        {
            // Bài ngân hàng/kiểm tra đầu vào gồm nhiều đề nên gửi kèm nội dung luôn, theo thứ tự nhóm xuất hiện trong lượt.
            var groupOrder = rows.Select(r => r.GroupId).Distinct().Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);
            var sources = (await _reader.ReadPlayByGroupIdsAsync(groupOrder.Keys.ToList()))
                .OrderBy(s => groupOrder.GetValueOrDefault(s.Group.GroupId, int.MaxValue)).ToList();
            dto.Content = [];
            foreach (var source in sources)
                dto.Content.Add(new PlayGroupDto
                {
                    GroupId = source.Group.GroupId, ExamId = source.Group.ExamId, PartNo = source.Group.PartNo, GroupOrder = source.Group.GroupOrder,
                    PassageHtml = source.Group.PassageHtml, Questions = source.Group.Questions, Media = await _signer.SignAsync(source.Media)
                });
        }
        return dto;
    }

    private async Task<AttemptResultDto> BuildResultAsync(Attempt attempt, bool includeReview)
    {
        var rows = await OrderedRowsAsync(attempt);
        var placement = attempt.Scope == AttemptScope.Placement;
        var title = placement
            ? (await _repo.GetPlacementTitlesAsync([attempt.AttemptId])).GetValueOrDefault(attempt.AttemptId) ?? "Kiểm tra đầu vào"
            : await _repo.GetExamTitleAsync(attempt.ExamId);
        var result = new AttemptResultDto
        {
            AttemptId = attempt.AttemptId, ExamId = attempt.ExamId, ExamTitle = title,
            Mode = attempt.Mode, Scope = attempt.Scope, Status = attempt.Status, StartedAt = attempt.StartedAt, SubmittedAt = attempt.SubmittedAt,
            IsAutoSubmitted = attempt.IsAutoSubmitted, DurationSeconds = attempt.DurationSeconds, TotalQuestions = attempt.TotalQuestions,
            AnsweredCount = rows.Count(r => r.SelectedOptionId is not null), CorrectCount = attempt.CorrectCount,
            ListeningScaled = attempt.ListeningScaled, ReadingScaled = attempt.ReadingScaled, TotalScaled = attempt.TotalScaled,
            Parts = rows.GroupBy(r => r.PartNo).OrderBy(g => g.Key).Select(g => new PartResultDto
            {
                PartNo = g.Key, Total = g.Count(), Answered = g.Count(r => r.SelectedOptionId is not null), Correct = g.Count(r => r.IsCorrect == true)
            }).ToList()
        };
        if (placement)
        {
            var levels = (await _content.GetCatalogAsync()).Levels;
            result.ListeningLevel = attempt.ListeningScaled is { } l ? ScoreBands.Info(ScoreBands.LevelFor(l), levels) : null;
            result.ReadingLevel = attempt.ReadingScaled is { } r ? ScoreBands.Info(ScoreBands.LevelFor(r), levels) : null;
        }
        if (ShowsAnswers(attempt))
        {
            var labels = await _repo.GetOptionLabelsAsync(rows.SelectMany(r => new[] { r.SelectedOptionId ?? 0, r.CorrectOptionId }).Where(id => id > 0).ToList());
            string? Label(int? optionId) => optionId is { } id && labels.TryGetValue(id, out var label) ? label : null;
            result.Questions = rows.Select(r => new QuestionResultDto
            {
                QuestionId = r.QuestionId, PartNo = r.PartNo, QuestionNo = r.QuestionNo, SelectedOptionId = r.SelectedOptionId, IsCorrect = r.IsCorrect == true,
                SelectedLabel = Label(r.SelectedOptionId), CorrectLabel = Label(r.CorrectOptionId)
            }).ToList();
        }
        else result.Questions = null;
        if (includeReview) result.Groups = await BuildReviewGroupsAsync(rows);
        return result;
    }

    // includeDeleted: câu đã xóa mềm sau này vẫn xem lại được đúng như lúc làm (BR-17).
    private async Task<List<ReviewGroupDto>> BuildReviewGroupsAsync(IReadOnlyList<AnswerRow> answerRows)
    {
        var rows = answerRows.ToDictionary(r => r.QuestionId);
        var groups = await _reader.ReadByGroupIdsAsync(answerRows.Select(r => r.GroupId).Distinct().ToList(), true);
        var review = new List<ReviewGroupDto>();
        foreach (var group in groups)
        {
            var questions = group.Questions.Where(q => rows.ContainsKey(q.QuestionId)).Select(q =>
            {
                var row = rows[q.QuestionId];
                return new ReviewQuestionDto
                {
                    QuestionId = q.QuestionId, QuestionNo = q.QuestionNo, QuestionText = q.QuestionText, Explanation = q.Explanation,
                    OptionExplanations = q.OptionExplanations, SelectedOptionId = row.SelectedOptionId, IsCorrect = row.IsCorrect == true,
                    Options = q.Options, Vocabularies = q.Vocabularies
                };
            }).ToList();
            if (questions.Count == 0) continue;
            review.Add(new ReviewGroupDto
            {
                GroupId = group.GroupId, PartNo = group.PartNo, PassageHtml = group.PassageHtml, TranscriptEn = group.TranscriptEn,
                TranslationVi = group.TranslationVi, Media = await _signer.SignAsync(MediaSources(group)), Questions = questions
            });
        }
        return review;
    }

    // Chỉ media của chính nhóm câu hỏi (audio, hình); clip cắt dành riêng cho Nghe chép.
    private static List<PlayMediaSource> MediaSources(QuestionGroupDto group) =>
        group.Media.Select(m => new PlayMediaSource(m.MediaId, null, 0, m.MediaType, m.AltText, m.SortOrder, m.StorageKey)).ToList();
}
