namespace ToeicMind.Services.Learning;

/// <summary>
/// UC-04 / P08-03: tự nộp các lượt Luyện thi (và kiểm tra đầu vào) đã hết giờ mà người học không quay lại, để kết quả, lịch sử,
/// tiến độ câu và ngày học được chốt đúng hạn thay vì chờ lần truy cập kế tiếp.
/// Chu kỳ quét: Learning:AutoSubmitIntervalSeconds (mặc định 60, đặt 0 để tắt); số lượt mỗi lần: Learning:AutoSubmitBatchSize (mặc định 50).
/// </summary>
public class AttemptAutoSubmitWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly IConfiguration _config;
    private readonly ILogger<AttemptAutoSubmitWorker> _logger;

    public AttemptAutoSubmitWorker(IServiceScopeFactory scopes, IConfiguration config, ILogger<AttemptAutoSubmitWorker> logger)
    {
        _scopes = scopes;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = _config.GetValue<int?>("Learning:AutoSubmitIntervalSeconds") ?? 60;
        if (interval <= 0) return;
        var batch = Math.Clamp(_config.GetValue<int?>("Learning:AutoSubmitBatchSize") ?? 50, 1, 500);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(10, interval)));
        do
        {
            try
            {
                int submitted;
                // Mỗi vòng một scope mới (DbContext scoped). Lặp khi đủ cả lô để xả hàng tồn sau thời gian dừng máy chủ.
                do
                {
                    using var scope = _scopes.CreateScope();
                    submitted = await scope.ServiceProvider.GetRequiredService<IAttemptService>().AutoSubmitOverdueAsync(batch);
                    if (submitted > 0) _logger.LogInformation("Tự nộp {Count} lượt làm bài đã hết giờ", submitted);
                } while (submitted >= batch && !stoppingToken.IsCancellationRequested);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Lỗi CSDL tạm thời không được dừng tác vụ nền; vòng sau thử lại. Đường lazy trong AttemptService vẫn bảo đảm chốt bài.
                _logger.LogError(ex, "Tự nộp lượt làm bài hết giờ thất bại");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
