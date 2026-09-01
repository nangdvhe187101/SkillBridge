using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces.Jobs;

public interface IJobAttachmentService
{
    Task<JobAttachmentDto> UploadJobAttachmentAsync(
        int employerId,
        int jobId,
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);

    Task DeleteJobAttachmentAsync(
        int employerId,
        int jobId,
        int attachmentId,
        CancellationToken cancellationToken = default);

    Task<(Stream Stream, string ContentType, string FileName)?> GetAttachmentFileStreamAsync(
        int jobId,
        int attachmentId,
        CancellationToken cancellationToken = default);
}
