using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
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

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;"">
    <div style=""text-align: center; margin-bottom: 24px;"">
        <h2 style=""color: #0f172a; margin: 0; font-size: 24px;"">SkillBridge</h2>
        <p style=""color: #64748b; font-size: 14px; margin-top: 4px;"">Nền tảng việc làm ngắn hạn cho sinh viên</p>
    </div>
    <div style=""padding: 20px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;"">
        <p style=""font-size: 16px; color: #1e293b;"">Chào <b>{fullName}</b>,</p>
        <p style=""color: #475569; line-height: 1.6;"">Cảm ơn bạn đã đăng ký tài khoản SkillBridge. Vui lòng bấm vào nút bên dưới để xác thực email của bạn (liên kết có hiệu lực trong 24 giờ):</p>
        <div style=""text-align: center; margin: 32px 0;"">
            <a href=""{verificationLink}"" target=""_blank"" style=""background-color: #00c853; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(0,200,83,0.25);"">Xác thực tài khoản ngay</a>
        </div>
        <p style=""color: #64748b; font-size: 13px; line-height: 1.5;"">Nếu nút trên không hoạt động, bạn có thể bấm trực tiếp vào đường link sau hoặc dán vào trình duyệt:<br/><a href=""{verificationLink}"" style=""color: #2563eb; word-break: break-all;"">{verificationLink}</a></p>
    </div>
    <p style=""color: #94a3b8; font-size: 12px; margin-top: 24px; text-align: center;"">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.<br/>&copy; SkillBridge. All rights reserved.</p>
</div>",
                TextBody = $"Chào {fullName},\n\n" +
                       $"Cảm ơn bạn đã đăng ký tài khoản SkillBridge.\n" +
                       $"Vui lòng bấm vào liên kết dưới đây để xác thực email của bạn (liên kết có hiệu lực trong 24 giờ):\n\n" +
                       $"{verificationLink}\n\n" +
                       $"Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.\n\n" +
                       $"Trân trọng,\nĐội ngũ SkillBridge"
            };

            message.Body = bodyBuilder.ToMessageBody();
            await SendAsync(message);
        }

        public async Task SendPasswordResetOtpAsync(string toEmail, string fullName, string otp)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"]
                ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:From")));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = "Mã xác thực đặt lại mật khẩu - SkillBridge";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;"">
    <div style=""text-align: center; margin-bottom: 24px;"">
        <h2 style=""color: #0f172a; margin: 0; font-size: 24px;"">SkillBridge</h2>
        <p style=""color: #64748b; font-size: 14px; margin-top: 4px;"">Nền tảng việc làm ngắn hạn cho sinh viên</p>
    </div>
    <div style=""padding: 20px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;"">
        <p style=""font-size: 16px; color: #1e293b;"">Chào <b>{fullName}</b>,</p>
        <p style=""color: #475569; line-height: 1.6;"">Mã xác thực để đặt lại mật khẩu tài khoản SkillBridge của bạn là:</p>
        <div style=""text-align: center; margin: 24px 0;"">
            <span style=""display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a; background-color: #f8fafc; padding: 12px 24px; border-radius: 8px; border: 1px dashed #cbd5e1;"">{otp}</span>
        </div>
        <p style=""color: #ef4444; font-size: 13px; text-align: center;"">Mã này có hiệu lực trong 10 phút và chỉ dùng được 1 lần. Không chia sẻ mã này cho bất kỳ ai.</p>
    </div>
    <p style=""color: #94a3b8; font-size: 12px; margin-top: 24px; text-align: center;"">&copy; SkillBridge. All rights reserved.</p>
</div>",
                TextBody = $"Chào {fullName},\n\nMã xác thực để đặt lại mật khẩu của bạn là: {otp}\n\nMã này có hiệu lực trong 10 phút và chỉ dùng được 1 lần.\n\nTrân trọng,\nĐội ngũ SkillBridge"
            };

            message.Body = bodyBuilder.ToMessageBody();
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

        public async Task SendDeadlineWarningEmailAsync(string toEmail, string fullName, string jobTitle, DateTime deadlineAt)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"]
                ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:From")));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = $"Nhắc nhở: Công việc \"{jobTitle}\" sắp đến hạn bàn giao - SkillBridge";
            message.Body = new TextPart("plain")
            {
                Text = $"Chào {fullName},\n\n" +
                       $"Công việc \"{jobTitle}\" trên SkillBridge sắp đến hạn bàn giao (trước {deadlineAt:HH:mm dd/MM/yyyy}).\n" +
                       $"Vui lòng kiểm tra tiến độ và nộp sản phẩm bàn giao đúng hạn để đảm bảo quyền lợi của bạn.\n\n" +
                       $"Trân trọng,\nĐội ngũ SkillBridge"
            };

            await SendAsync(message);
        }

        public async Task SendDeadlineOverdueEmailAsync(string toEmail, string fullName, string jobTitle, DateTime deadlineAt)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"]
                ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:From")));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = $"Cảnh báo: Công việc \"{jobTitle}\" đã quá hạn bàn giao - SkillBridge";
            message.Body = new TextPart("plain")
            {
                Text = $"Chào {fullName},\n\n" +
                       $"Công việc \"{jobTitle}\" trên SkillBridge đã quá hạn hoàn thành (hạn chót: {deadlineAt:HH:mm dd/MM/yyyy}).\n" +
                       $"Vui lòng truy cập hệ thống để kiểm tra trạng thái, liên hệ với đối tác hoặc gửi khiếu nại nếu cần thiết.\n\n" +
                       $"Trân trọng,\nĐội ngũ SkillBridge"
            };

            await SendAsync(message);
        }

        private async Task SendAsync(MimeMessage message)
        {
            using var client = new SmtpClient();
            client.CheckCertificateRevocation = false;
            var port = int.TryParse(config["Smtp:Port"], out var p) ? p : 587;
            await client.ConnectAsync(
                config["Smtp:Host"] ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:Host"),
                port,
                SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(
                config["Smtp:Username"] ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:Username"),
                config["Smtp:Password"] ?? throw new InvalidOperationException("Thiếu cấu hình Smtp:Password"));
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }
}