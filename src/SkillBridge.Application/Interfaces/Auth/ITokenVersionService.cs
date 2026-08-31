using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces.Auth
{
    public interface ITokenVersionService
    {
        Task<int> GetTokenVersionAsync(int userId);
        Task InvalidateOrUpdateVersionAsync(int userId, int newVersion);
    }
}
