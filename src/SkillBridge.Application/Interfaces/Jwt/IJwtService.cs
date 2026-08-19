using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces
{
    public interface IJwtService
    {
        string GenerateToken(int UserId, string email, string roleCode);
        string GenerateRefreshTokenString();
    }
}