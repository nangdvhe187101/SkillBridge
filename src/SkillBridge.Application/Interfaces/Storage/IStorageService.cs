using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Storage;

namespace SkillBridge.Application.Interfaces.Storage;

public interface IStorageService
{
    Task<FileUploadResult> UploadStreamAsync(
        Stream stream,
        string fileName,
        string contentType,
        string? folder = null,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteFileAsync(string fileKey, CancellationToken cancellationToken = default);

    Task<string> GetPresignedUrlAsync(string fileKey, TimeSpan expiry);

    string GetPublicUrl(string? fileKeyOrUrl);

    Task<(Stream Stream, string ContentType, string FileName)?> DownloadFileAsync(string fileKey, CancellationToken cancellationToken = default);
}
