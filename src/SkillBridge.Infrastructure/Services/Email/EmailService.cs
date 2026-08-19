using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.VisualBasic;
using MimeKit;
using SkillBridge.Application.Interfaces;

namespace SkillBridge.Infrastructure.Services.Email
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration config;
        public EmailService(IConfiguration _config)
        {
            config = _config;
        }

        public async Task SendVerificationEmailAsync(string toEmail, string fullName, string verificationLink)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"]
                ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:From")));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = "Xác thực email - SkillBridge";
            message.Body = new TextPart("plain")
            {
                Text = $"Chào {fullName},\n\n" +
                       $"Cảm ơn bạn đã đăng ký tài khoản SkillBridge.\n" +
                       $"Vui lòng bấm vào liên kết dưới đây để xác thực email của bạn (liên kết có hiệu lực trong 24 giờ):\n\n" +
                       $"{verificationLink}\n\n" +
                       $"Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.\n\n" +
                       $"Trân trọng,\nĐội ngũ SkillBridge"
            };

            await SendAsync(message);
        }

        public async Task SendPasswordResetOtpAsync(string toEmail, string fullName, string otp)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"]
                ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:From")));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = "Mã xác thực đặt lại mật khẩu - SkillBridge";
            message.Body = new TextPart("plain")
            {
                Text = $"Chào {fullName},\n\n" +
                       $"Mã xác thực để đặt lại mật khẩu của bạn là:\n\n" +
                       $"    {otp}\n\n" +
                       $"Mã này có hiệu lực trong 10 phút và chỉ dùng được 1 lần.\n" +
                       $"Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và không chia sẻ mã này cho bất kỳ ai.\n\n" +
                       $"Trân trọng,\nĐội ngũ SkillBridge"
            };

            await SendAsync(message);
        }

        public async Task SendPasswordChangedNotificationAsync(string toEmail, string fullName)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"]
                ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:From")));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = "Mật khẩu của bạn vừa được thay đổi - SkillBridge";
            message.Body = new TextPart("plain")
            {
                Text = $"Chào {fullName},\n\n" +
                       $"Mật khẩu tài khoản SkillBridge của bạn vừa được thay đổi thành công.\n" +
                       $"Nếu đây không phải là bạn thực hiện, vui lòng liên hệ hỗ trợ ngay để bảo vệ tài khoản.\n\n" +
                       $"Trân trọng,\nĐội ngũ SkillBridge"
            };

            await SendAsync(message);
        }

        private async Task SendAsync(MimeMessage message)
        {
            using var client = new SmtpClient();
            client.CheckCertificateRevocation = false;
            await client.ConnectAsync(
                config["Smtp:Host"] ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:Host"),
                int.Parse(config["Smtp:Port"] ?? "587"),
                SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(
                config["Smtp:Username"] ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:Username"),
                config["Smtp:Password"] ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:Password"));
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }
}