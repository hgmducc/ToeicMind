using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace ToeicMind.Services.Email;

/// <summary>Gửi email OTP đặt lại mật khẩu qua SMTP. Chưa cấu hình SMTP hoặc môi trường Testing thì ghi OTP ra log.</summary>
public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;
    private readonly IHostEnvironment _env;

    public EmailService(IConfiguration config, ILogger<EmailService> logger, IHostEnvironment env)
    {
        _config = config;
        _logger = logger;
        _env = env;
    }

    public async Task SendPasswordResetOtpAsync(string toEmail, string otp)
    {
        var smtpHost = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort = _config.GetValue<int>("Email:SmtpPort", 587);
        var senderName = _config["Email:SenderName"] ?? "ToeicMind";
        var senderEmail = _config["Email:SenderEmail"] ?? "no-reply@toeicmind.com";
        var username = _config["Email:Username"];
        var password = _config["Email:Password"];
        var enableSsl = _config.GetValue<bool>("Email:EnableSsl", true);
        var expiryMinutes = _config.GetValue<int>("Email:OtpExpiryMinutes", 5);

        // Chế độ Testing hoặc khi chưa cấu hình mật khẩu SMTP: Log OTP ra Console/Logger để kiểm thử mượt mà
        if (_env.IsEnvironment("Testing") || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogInformation("[ToeicMind - OTP Mock] Gửi OTP đặt lại mật khẩu cho {Email}: {Otp} (Hết hạn sau {Minutes} phút)",
                toEmail, otp, expiryMinutes);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(new MailboxAddress(toEmail, toEmail));
        message.Subject = $"{otp} là mã xác thực đặt lại mật khẩu ToeicMind của bạn";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = $"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #007bff; text-align: center;">ToeicMind - Đặt lại mật khẩu</h2>
                <p>Xin chào,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email <strong>{toEmail}</strong>.</p>
                <p>Mã xác thực (OTP) của bạn là:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #d9534f; background: #f8f9fa; padding: 10px 24px; border: 1px dashed #d9534f; border-radius: 6px;">
                        {otp}
                    </span>
                </div>
                <p>Mã này có hiệu lực trong vòng <strong>{expiryMinutes} phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
                <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc đổi mật khẩu ngay để bảo vệ tài khoản.</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #888; text-align: center;">Đây là email tự động, vui lòng không trả lời.</p>
            </div>
            """
        };

        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        var secureOption = enableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
        await client.ConnectAsync(smtpHost, smtpPort, secureOption);
        await client.AuthenticateAsync(username, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
