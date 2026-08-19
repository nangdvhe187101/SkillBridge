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
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[4];
            rng.GetBytes(bytes);
            var number = System.BitConverter.ToUInt32(bytes, 0) % 1000000;
            return number.ToString("D6");
        }
    }
}