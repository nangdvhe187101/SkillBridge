using System.Threading.Tasks;
using SkillBridge.Application.DTOs;

namespace SkillBridge.Application.Interfaces.Auth
{
    public interface IChangePasswordService
    {
        Task<string> ChangePasswordAsync(int userId, ChangePasswordDto dto);
    }
}
