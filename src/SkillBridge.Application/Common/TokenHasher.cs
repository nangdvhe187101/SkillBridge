using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace SkillBridge.Application.Common
{
    public static class TokenHasher
    {
        public static string HashToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return string.Empty;

            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToBase64String(bytes);
        }
    }
}