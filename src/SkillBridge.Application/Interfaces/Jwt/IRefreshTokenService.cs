using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs;

namespace SkillBridge.Application.Interfaces
{
    public interface IRefreshTokenService
    {
        Task<AuthResponseDto> RefreshAsync(RefreshTokenDto dto);
    }
}