using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces
{
    public interface IEmailService
    {
        Task SendVerificationEmailAsync(string toEmail, string fullName, string verificationLink);

        //gửi mã OTP quên mật khẩu
        Task SendPasswordResetOtpAsync(string toEmail, string fullName, string otp);

        //thông báo mật khẩu vừa được đổi
        Task SendPasswordChangedNotificationAsync(string toEmail, string fullName);
    }
}