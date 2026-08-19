using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces.Auth
{
    public interface ILogoutService
    {
        Task LogoutAsync(string refreshToken);
    }
}