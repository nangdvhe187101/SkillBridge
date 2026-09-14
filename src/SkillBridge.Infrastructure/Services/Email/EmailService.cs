using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using MimeKit;
using SkillBridge.Application.Interfaces;

namespace SkillBridge.Infrastructure.Services.Email
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration config;
        private readonly ILogger<EmailService> logger;

        public EmailService(IConfiguration _config, ILogger<EmailService>? _logger = null)
        {
            config = _config;
            logger = _logger ?? NullLogger<EmailService>.Instance;
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

        public async Task SendJobHiredEmailAsync(string toEmail, string studentName, string jobTitle, decimal budget, DateTime deadlineAt)
        {
            if (!await IsEmailEnabledAsync("Email_JobHired_Enabled")) return;

            var baseUrl = config["Frontend:BaseUrl"] ?? "http://localhost:5173";
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"] ?? "no-reply@skillbridge.vn"));
            message.To.Add(new MailboxAddress(studentName, toEmail));
            message.Subject = $"🎉 Chúc mừng! Bạn đã được chọn thực hiện: \"{jobTitle}\" - SkillBridge";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;"">
    <div style=""text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;"">
        <h2 style=""color: #6366f1; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;"">SkillBridge</h2>
        <p style=""color: #64748b; font-size: 13px; margin-top: 4px;"">Nền tảng việc làm ngắn hạn & Ký quỹ an toàn</p>
    </div>
    <div>
        <span style=""display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px;"">🎉 Ứng tuyển thành công</span>
        <h3 style=""margin: 0 0 12px; font-size: 20px; color: #0f172a;"">Chúc mừng {studentName}!</h3>
        <p style=""line-height: 1.6; color: #475569; margin-bottom: 20px;"">Hồ sơ của bạn đã được Nhà tuyển dụng tin tưởng lựa chọn cho dự án <b>""{jobTitle}""</b>. Khoản tiền thù lao đã được ký quỹ Escrow bảo đảm an toàn trên hệ thống.</p>
        
        <div style=""background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;"">
            <div style=""display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;"">
                <span style=""color: #64748b;"">Thù lao thỏa thuận:</span>
                <b style=""color: #059669; font-size: 16px;"">{budget:N0} đ</b>
            </div>
            <div style=""display: flex; justify-content: space-between; font-size: 14px;"">
                <span style=""color: #64748b;"">Hạn chót bàn giao (Deadline):</span>
                <b style=""color: #ef4444;"">{deadlineAt:HH:mm dd/MM/yyyy}</b>
            </div>
        </div>

        <div style=""text-align: center; margin: 28px 0;"">
            <a href=""{baseUrl}/mywork"" target=""_blank"" style=""background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(79,70,229,0.3);"">Bắt đầu thực hiện dự án</a>
        </div>
        <p style=""font-size: 13px; color: #94a3b8; line-height: 1.5; text-align: center;"">Vui lòng hoàn thành và nộp sản phẩm trước thời hạn để giữ vững chỉ số Uy tín (Reliability Score).</p>
    </div>
    <div style=""margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;"">
        &copy; {DateTime.UtcNow.Year} SkillBridge Platform. Mọi giao dịch được bảo trợ bởi Quỹ Ký quỹ Escrow.
    </div>
</div>",
                TextBody = $"Chúc mừng {studentName}!\nBạn đã được chọn làm việc: \"{jobTitle}\".\nThù lao: {budget:N0} đ\nHạn chót: {deadlineAt:HH:mm dd/MM/yyyy}\nTruy cập hệ thống để làm việc ngay: {baseUrl}/mywork"
            };

            message.Body = bodyBuilder.ToMessageBody();
            await SendSafeAsync(message);
        }

        public async Task SendDeliverableSubmittedEmailAsync(string toEmail, string employerName, string jobTitle, string studentName, int autoAcceptHours)
        {
            if (!await IsEmailEnabledAsync("Email_Deliverable72h_Enabled")) return;

            var baseUrl = config["Frontend:BaseUrl"] ?? "http://localhost:5173";
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"] ?? "no-reply@skillbridge.vn"));
            message.To.Add(new MailboxAddress(employerName, toEmail));
            message.Subject = $"📥 Sinh viên đã nộp bài bàn giao: \"{jobTitle}\" - SkillBridge";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;"">
    <div style=""text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;"">
        <h2 style=""color: #6366f1; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;"">SkillBridge</h2>
        <p style=""color: #64748b; font-size: 13px; margin-top: 4px;"">Thông báo nghiệm thu sản phẩm bàn giao</p>
    </div>
    <div>
        <span style=""display: inline-block; background-color: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px;"">📦 Sản phẩm mới được nộp</span>
        <h3 style=""margin: 0 0 12px; font-size: 20px; color: #0f172a;"">Kính gửi {employerName},</h3>
        <p style=""line-height: 1.6; color: #475569; margin-bottom: 20px;"">Sinh viên <b>{studentName}</b> vừa nộp sản phẩm bàn giao cho công việc <b>""{jobTitle}""</b>. Bạn có thể xem trước sản phẩm an toàn trên hệ thống ngay bây giờ.</p>
        
        <div style=""background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 24px;"">
            <b style=""color: #b45309; font-size: 14px; display: block; margin-bottom: 6px;"">⏳ Lưu ý thời hạn nghiệm thu tự động ({autoAcceptHours} giờ):</b>
            <p style=""margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;"">
                Theo điều khoản bảo vệ cả 2 bên của SkillBridge, nếu sau <b>{autoAcceptHours} giờ</b> bạn không yêu cầu chỉnh sửa hoặc không phản hồi, hệ thống sẽ tự động nghiệm thu và giải ngân tiền thù lao cho sinh viên.
            </p>
        </div>

        <div style=""text-align: center; margin: 28px 0;"">
            <a href=""{baseUrl}/myjobs"" target=""_blank"" style=""background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.3);"">Kiểm tra & Nghiệm thu ngay</a>
        </div>
    </div>
    <div style=""margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;"">
        &copy; {DateTime.UtcNow.Year} SkillBridge. All rights reserved.
    </div>
</div>",
                TextBody = $"Chào {employerName},\nSinh viên {studentName} vừa nộp sản phẩm cho công việc \"{jobTitle}\".\nVui lòng kiểm tra và nghiệm thu trong vòng {autoAcceptHours} giờ: {baseUrl}/myjobs"
            };

            message.Body = bodyBuilder.ToMessageBody();
            await SendSafeAsync(message);
        }

        public async Task SendPayoutSuccessEmailAsync(string toEmail, string studentName, string jobTitle, decimal netPayout, decimal commission)
        {
            if (!await IsEmailEnabledAsync("Email_Payout_Enabled")) return;

            var baseUrl = config["Frontend:BaseUrl"] ?? "http://localhost:5173";
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"] ?? "no-reply@skillbridge.vn"));
            message.To.Add(new MailboxAddress(studentName, toEmail));
            message.Subject = $"💰 Thù lao {netPayout:N0}đ đã được giải ngân vào ví - SkillBridge";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;"">
    <div style=""text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;"">
        <h2 style=""color: #059669; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;"">SkillBridge</h2>
        <p style=""color: #64748b; font-size: 13px; margin-top: 4px;"">Biên nhận giải ngân thù lao điện tử</p>
    </div>
    <div>
        <span style=""display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px;"">✅ Nghiệm thu hoàn tất</span>
        <h3 style=""margin: 0 0 12px; font-size: 20px; color: #0f172a;"">Chúc mừng {studentName}!</h3>
        <p style=""line-height: 1.6; color: #475569; margin-bottom: 20px;"">Sản phẩm của bạn cho dự án <b>""{jobTitle}""</b> đã được nghiệm thu thành công. Khoản tiền thù lao đã được cộng trực tiếp vào số dư ví SkillBridge của bạn.</p>
        
        <div style=""background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;"">
            <div style=""display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;"">
                <span style=""color: #64748b;"">Phí bảo trợ nền tảng:</span>
                <span style=""color: #64748b;"">{(commission > 0 ? commission.ToString("N0") + " đ" : "0 đ (Miễn phí)")}</span>
            </div>
            <div style=""border-top: 1px dashed #cbd5e1; margin: 10px 0;""></div>
            <div style=""display: flex; justify-content: space-between; font-size: 15px;"">
                <b style=""color: #0f172a;"">Số tiền thực nhận vào ví:</b>
                <b style=""color: #059669; font-size: 20px;"">+{netPayout:N0} đ</b>
            </div>
        </div>

        <div style=""text-align: center; margin: 28px 0;"">
            <a href=""{baseUrl}/wallet"" target=""_blank"" style=""background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(5,150,105,0.3);"">Kiểm tra ví & Rút tiền</a>
        </div>
    </div>
    <div style=""margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;"">
        &copy; {DateTime.UtcNow.Year} SkillBridge. Cảm ơn bạn đã đồng hành cùng cộng đồng tài năng trẻ!
    </div>
</div>",
                TextBody = $"Chúc mừng {studentName}!\nSản phẩm cho dự án \"{jobTitle}\" đã được nghiệm thu.\nSố tiền thực nhận: +{netPayout:N0} đ (Phí sàn: {commission:N0} đ).\nKiểm tra số dư ví ngay: {baseUrl}/wallet"
            };

            message.Body = bodyBuilder.ToMessageBody();
            await SendSafeAsync(message);
        }

        public async Task SendDailyApplicantDigestEmailAsync(string toEmail, string employerName, string jobTitle, int applicantCount)
        {
            if (!await IsEmailEnabledAsync("Email_Digest18h_Enabled")) return;

            var baseUrl = config["Frontend:BaseUrl"] ?? "http://localhost:5173";
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"] ?? "no-reply@skillbridge.vn"));
            message.To.Add(new MailboxAddress(employerName, toEmail));
            message.Subject = $"📬 Báo cáo 18h: {applicantCount} ứng viên mới cho công việc \"{jobTitle}\"";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;"">
    <div style=""text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;"">
        <h2 style=""color: #6366f1; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;"">SkillBridge</h2>
        <p style=""color: #64748b; font-size: 13px; margin-top: 4px;"">Tổng hợp ứng viên tiềm năng hàng ngày</p>
    </div>
    <div>
        <h3 style=""margin: 0 0 12px; font-size: 20px; color: #0f172a;"">Chào {employerName},</h3>
        <p style=""line-height: 1.6; color: #475569; margin-bottom: 20px;"">Hôm nay có <b>{applicantCount} ứng viên mới</b> vừa nộp hồ sơ ứng tuyển cho tin đăng tuyển <b>""{jobTitle}""</b> của bạn.</p>
        
        <div style=""background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 8px 8px 0;"">
            <p style=""margin: 0; font-size: 13.5px; color: #334155; line-height: 1.5;"">
                💡 <b>Lời khuyên tuyển dụng:</b> Phản hồi ứng viên trong vòng 24 giờ giúp bạn tăng 70% cơ hội hợp tác với những sinh viên giỏi nhất.
            </p>
        </div>

        <div style=""text-align: center; margin: 28px 0;"">
            <a href=""{baseUrl}/myjobs"" target=""_blank"" style=""background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(99,102,241,0.3);"">Xem danh sách ứng viên ngay</a>
        </div>
    </div>
    <div style=""margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;"">
        &copy; {DateTime.UtcNow.Year} SkillBridge. Nền tảng kết nối nhân tài trẻ.
    </div>
</div>",
                TextBody = $"Chào {employerName},\nCó {applicantCount} ứng viên mới nộp hồ sơ cho công việc \"{jobTitle}\".\nXem hồ sơ ngay tại: {baseUrl}/myjobs"
            };

            message.Body = bodyBuilder.ToMessageBody();
            await SendSafeAsync(message);
        }

        public async Task SendJobMatchAlertEmailAsync(string toEmail, string studentName, string jobTitle, decimal budget, string jobUrl)
        {
            if (!await IsEmailEnabledAsync("Email_VipMatch_Enabled")) return;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SkillBridge", config["Smtp:From"] ?? "no-reply@skillbridge.vn"));
            message.To.Add(new MailboxAddress(studentName, toEmail));
            message.Subject = $"⭐ Cơ hội việc làm hấp dẫn phù hợp với bạn: \"{jobTitle}\"";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;"">
    <div style=""text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;"">
        <h2 style=""color: #f59e0b; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;"">SkillBridge VIP</h2>
        <p style=""color: #64748b; font-size: 13px; margin-top: 4px;"">Đặc quyền thông báo việc làm ưu tiên</p>
    </div>
    <div>
        <span style=""display: inline-block; background-color: #fef3c7; color: #d97706; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px;"">⭐ Việc làm đề xuất cho bạn</span>
        <h3 style=""margin: 0 0 12px; font-size: 20px; color: #0f172a;"">Chào {studentName},</h3>
        <p style=""line-height: 1.6; color: #475569; margin-bottom: 20px;"">Một dự án mới hấp dẫn rất phù hợp với kỹ năng và xếp hạng của bạn vừa được đăng tải:</p>
        
        <div style=""background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;"">
            <div style=""font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 8px;"">{jobTitle}</div>
            <div style=""display: flex; justify-content: space-between; font-size: 14px;"">
                <span style=""color: #64748b;"">Mức thù lao dự kiến:</span>
                <b style=""color: #059669; font-size: 16px;"">{budget:N0} đ</b>
            </div>
        </div>

        <div style=""text-align: center; margin: 28px 0;"">
            <a href=""{jobUrl}"" target=""_blank"" style=""background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(245,158,11,0.3);"">Xem chi tiết & Ứng tuyển ngay</a>
        </div>
    </div>
    <div style=""margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;"">
        &copy; {DateTime.UtcNow.Year} SkillBridge. Bạn nhận được email này vì đã đăng ký gói thành viên Pro/Master.
    </div>
</div>",
                TextBody = $"Chào {studentName},\nCó việc làm mới phù hợp: \"{jobTitle}\" - Thù lao: {budget:N0} đ.\nỨng tuyển ngay: {jobUrl}"
            };

            message.Body = bodyBuilder.ToMessageBody();
            await SendSafeAsync(message);
        }

        private Task<bool> IsEmailEnabledAsync(string toggleKey)
        {
            var host = config["Smtp:Host"];
            return Task.FromResult(!string.IsNullOrWhiteSpace(host));
        }

        private async Task SendSafeAsync(MimeMessage message)
        {
            try
            {
                await SendAsync(message);
            }
            catch (Exception ex)
            {
                // Không làm crash luồng nghiệp vụ nếu SMTP không khả dụng trong môi trường dev/test, nhưng vẫn log cảnh báo để theo dõi chẩn đoán
                logger.LogWarning(ex, "Gửi email thất bại tới {Recipient} với tiêu đề '{Subject}'.", message.To?.ToString(), message.Subject);
            }
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