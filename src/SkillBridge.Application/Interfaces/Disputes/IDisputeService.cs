using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Disputes;

namespace SkillBridge.Application.Interfaces.Disputes;

public interface IDisputeService
{
    Task<DisputeChatEvidenceDto> GetChatEvidenceAsync(int adminUserId, int disputeId, CancellationToken ct = default);
}
