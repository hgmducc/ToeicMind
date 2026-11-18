namespace ToeicMind.Services.Email;

/// <summary>Hợp đồng gửi email (xem EmailService).</summary>
public interface IEmailService
{
    Task SendPasswordResetOtpAsync(string toEmail, string otp);
}
