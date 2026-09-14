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

        Task SendDeadlineWarningEmailAsync(string toEmail, string fullName, string jobTitle, DateTime deadlineAt);

        Task SendDeadlineOverdueEmailAsync(string toEmail, string fullName, string jobTitle, DateTime deadlineAt);

        Task SendJobHiredEmailAsync(string toEmail, string studentName, string jobTitle, decimal budget, DateTime deadlineAt);

        Task SendDeliverableSubmittedEmailAsync(string toEmail, string employerName, string jobTitle, string studentName, int autoAcceptHours);

        Task SendPayoutSuccessEmailAsync(string toEmail, string studentName, string jobTitle, decimal netPayout, decimal commission);

        Task SendDailyApplicantDigestEmailAsync(string toEmail, string employerName, string jobTitle, int applicantCount);

        Task SendJobMatchAlertEmailAsync(string toEmail, string studentName, string jobTitle, decimal budget, string jobUrl);
    }
}