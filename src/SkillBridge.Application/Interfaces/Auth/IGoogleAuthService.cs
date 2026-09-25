using System.Threading.Tasks;
using SkillBridge.Application.DTOs;

namespace SkillBridge.Application.Interfaces.Auth
{
    public interface IGoogleAuthService
    {
        Task<(AuthResponseDto Result, string RefreshToken)> GoogleLoginAsync(GoogleLoginDto dto);
    }
}
