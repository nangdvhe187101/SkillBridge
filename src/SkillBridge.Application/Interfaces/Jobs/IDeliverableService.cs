using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces.Jobs;

public interface IDeliverableService
{
    Task<List<DeliverableDto>> GetDeliverablesByJobIdAsync(int userId, int jobId, CancellationToken cancellationToken = default);

    Task<DeliverableDto> SubmitDeliverableAsync(
        int studentId,
        int jobId,
        Stream? stream,
        string? fileName,
        string? contentType,
        string? externalUrl,
        string? note,
        CancellationToken cancellationToken = default);

    Task<DeliverableDto> ReviewDeliverableAsync(
        int employerId,
        int jobId,
        int deliverableId,
        ReviewDeliverableRequest request,
        CancellationToken cancellationToken = default);

    Task<(Stream Stream, string ContentType, string FileName)?> GetDeliverableFileStreamAsync(
        int userId,
        int jobId,
        int deliverableId,
        string type = "final",
        CancellationToken cancellationToken = default);
}
