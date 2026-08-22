using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace SkillBridge.Application.Common
{
    public static class OtpGenerator
    {
        public static string GenerateOtp()
        {
            var number = RandomNumberGenerator.GetInt32(100000, 1000000);
            return number.ToString("D6");
        }
    }
}