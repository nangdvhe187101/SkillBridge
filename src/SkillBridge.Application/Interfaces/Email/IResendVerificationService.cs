using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces.Email
{
    public interface IResendVerificationService
    {
        Task<string> ResendAsync(string email);
    }
}