using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Users;

namespace SkillBridge.Application.Interfaces.Users;

public interface IKycService
{
    Task<KycStatusResponse> GetKycStatusAsync(int userId, CancellationToken ct = default);
    Task<KycStatusResponse> SubmitKycAsync(int userId, SubmitKycRequest request, List<KycFileUploadModel> files, CancellationToken ct = default);
}
