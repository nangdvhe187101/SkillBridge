using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace SkillBridge.Application.Common
{
    public class ValidationPatterns
    {
        public static readonly Regex Password = new(
       @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$",
       RegexOptions.Compiled);

        // 10-11 chữ số, bắt đầu bằng số 0 (tính cả số 0 đầu)
        public static readonly Regex Phone = new(
            @"^0\d{9,10}$",
            RegexOptions.Compiled);

        public static readonly Regex Email = new(
            @"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$",
            RegexOptions.Compiled);
    }
}