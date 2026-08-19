using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkillBridge.Application.Common
{
    public static class TokenTypes
    {
        public const string EmailVerify = "email_verify";
        public const string Refresh = "refresh";
        public const string PasswordResetOtp = "password_reset_otp";
        public const string PasswordReset = "password_reset";
    }
}