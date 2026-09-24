using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces.Jobs;

public interface IJobDeadlineExtensionService
{
    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-001
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-002
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-003
     */
    Task<DeadlineExtensionResponse> RequestExtensionAsync(int studentId, int jobId, CreateDeadlineExtensionRequest request, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-001
     */
    Task<DeadlineExtensionResponse?> GetActiveExtensionAsync(int userId, int jobId, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-001
     */
    Task<List<DeadlineExtensionResponse>> GetExtensionHistoryAsync(int userId, int jobId, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-004
     */
    Task RespondExtensionAsync(int employerId, int jobId, int extensionId, RespondDeadlineExtensionRequest request, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-006
     */
    Task CancelExtensionAsync(int studentId, int jobId, int extensionId, CancellationToken ct = default);
}
