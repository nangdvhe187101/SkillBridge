using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces
{
    public interface IEmailService
    {
        Task SendVerificationEmailAsync(string toEmail, string fullName, string verificationLink);

        Task SendPasswordResetOtpAsync(string toEmail, string fullName, string otp);

        Task SendPasswordChangedNotificationAsync(string toEmail, string fullName);
    }
}