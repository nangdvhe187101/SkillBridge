using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Storage;
using SkillBridge.Application.Interfaces.Storage;

namespace SkillBridge.Infrastructure.Services.Storage;

public class R2StorageService : IStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly string? _publicBaseUrl;
    private readonly ILogger<R2StorageService> _logger;

    public R2StorageService(IConfiguration configuration, ILogger<R2StorageService> logger)
    {
        _logger = logger;
        var r2Config = configuration.GetSection("CloudflareR2");
        var accountId = r2Config["AccountId"];
        var accessKey = r2Config["AccessKeyId"];
        var secretKey = r2Config["SecretAccessKey"];
        _bucketName = r2Config["BucketName"] ?? "skillbridge-bucket";
        _publicBaseUrl = r2Config["PublicBaseUrl"];

        if (string.IsNullOrWhiteSpace(accountId) || string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey))
        {
            _logger.LogWarning("Cloudflare R2 credentials chưa được cấu hình đầy đủ trong appsettings.json.");
        }

        if (string.IsNullOrWhiteSpace(_publicBaseUrl))
        {
            _logger.LogWarning("Cloudflare R2 PublicBaseUrl chưa được cấu hình. Các tệp tải lên sẽ sử dụng presigned URL tạm thời (7 ngày), có nguy cơ hỏng link vĩnh viễn trong DB nếu không qua download endpoint.");
        }

        var credentials = new BasicAWSCredentials(accessKey, secretKey);
        var s3Config = new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
            AuthenticationRegion = "auto"
        };

        _s3Client = new AmazonS3Client(credentials, s3Config);
    }

    public async Task<FileUploadResult> UploadStreamAsync(
        Stream stream,
        string fileName,
        string contentType,
        string? folder = null,
        CancellationToken cancellationToken = default)
    {
        if (stream == null || stream.Length == 0)
        {
            throw new BusinessException("Dữ liệu file không hợp lệ hoặc rỗng.");
        }

        var cleanFileName = Path.GetFileName(fileName);
        var fileExtension = Path.GetExtension(cleanFileName).ToLowerInvariant();
        var uniqueId = Guid.NewGuid().ToString("N");
        var folderPrefix = string.IsNullOrWhiteSpace(folder) ? "general" : folder.Trim().Trim('/');
        var dateFolder = DateTime.UtcNow.ToString("yyyy/MM");
        var fileKey = $"{folderPrefix}/{dateFolder}/{uniqueId}{fileExtension}";

        try
        {
            var streamLength = stream.CanSeek ? stream.Length : 0;
            var safeContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType;

            if (streamLength > 5 * 1024 * 1024)
            {
                // Sử dụng TransferUtility để upload file lớn (>5MB) theo cơ chế multipart đa luồng song song
                using var transferUtility = new TransferUtility(_s3Client);
                var uploadRequest = new TransferUtilityUploadRequest
                {
                    BucketName = _bucketName,
                    Key = fileKey,
                    InputStream = stream,
                    ContentType = safeContentType,
                    PartSize = 5 * 1024 * 1024, // 5MB mỗi part
                    DisablePayloadSigning = true
                };
                await transferUtility.UploadAsync(uploadRequest, cancellationToken);
            }
            else
            {
                var putRequest = new PutObjectRequest
                {
                    BucketName = _bucketName,
                    Key = fileKey,
                    InputStream = stream,
                    ContentType = safeContentType,
                    DisablePayloadSigning = true
                };

                await _s3Client.PutObjectAsync(putRequest, cancellationToken);
            }

            string fileUrl = GetPublicUrl(fileKey);
            if (!IsPrivateFolder(fileKey) && string.IsNullOrWhiteSpace(_publicBaseUrl))
            {
                // Chỉ fallback sinh presigned URL cho tệp tin công khai khi PublicBaseUrl chưa được cấu hình (ví dụ dev local)
                _logger.LogWarning("PublicBaseUrl chưa được cấu hình. Sinh presigned URL 7 ngày cho tệp công khai {FileKey}.", fileKey);
                fileUrl = await GetPresignedUrlAsync(fileKey, TimeSpan.FromDays(7));
            }
            // Đối với tệp tin riêng tư (cvs/, job-deliverables/), giữ fileUrl rỗng để buộc client truy cập qua API backend.

            _logger.LogInformation("Upload file {FileKey} thành công.", fileKey);

            return new FileUploadResult
            {
                FileKey = fileKey,
                FileUrl = fileUrl,
                FileName = cleanFileName,
                FileSize = streamLength,
                ContentType = safeContentType,
                UploadedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi upload file {FileName}.", fileName);
            throw new BusinessException("Không thể tải file lên hệ thống lưu trữ. Vui lòng thử lại sau.", ex);
        }
    }

    public async Task<bool> DeleteFileAsync(string fileKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fileKey)) return false;

        try
        {
            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = fileKey
            };

            var response = await _s3Client.DeleteObjectAsync(deleteRequest, cancellationToken);
            return response.HttpStatusCode == System.Net.HttpStatusCode.NoContent ||
                   response.HttpStatusCode == System.Net.HttpStatusCode.OK;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xóa file {FileKey} trên Cloudflare R2.", fileKey);
            return false;
        }
    }

    public string GetPublicUrl(string? fileKeyOrUrl)
    {
        if (string.IsNullOrWhiteSpace(fileKeyOrUrl)) return string.Empty;

        var trimmed = fileKeyOrUrl.Trim();

        // Không sinh Public URL cho các tệp tin nhạy cảm hoặc riêng tư (CVs, Deliverables)
        if (IsPrivateFolder(trimmed))
        {
            return string.Empty;
        }

        var normalized = trimmed.Replace('\\', '/').TrimStart('/');

        // Hỗ trợ backward-compatibility: nếu bản ghi cũ đã lưu Full URL (http:// hoặc https://), trả về nguyên bản
        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }

        if (string.IsNullOrWhiteSpace(_publicBaseUrl))
        {
            return trimmed;
        }

        return $"{_publicBaseUrl.TrimEnd('/')}/{normalized}";
    }

    private static bool IsPrivateFolder(string? fileKeyOrUrl)
    {
        if (string.IsNullOrWhiteSpace(fileKeyOrUrl)) return false;
        var normalized = fileKeyOrUrl.Replace('\\', '/').TrimStart('/');
        return normalized.StartsWith("cvs/", StringComparison.OrdinalIgnoreCase) ||
               normalized.StartsWith("job-deliverables/", StringComparison.OrdinalIgnoreCase) ||
               normalized.StartsWith("private/", StringComparison.OrdinalIgnoreCase) ||
               normalized.Contains("/cvs/", StringComparison.OrdinalIgnoreCase) ||
               normalized.Contains("/job-deliverables/", StringComparison.OrdinalIgnoreCase);
    }

    public Task<string> GetPresignedUrlAsync(string fileKey, TimeSpan expiry)
    {
        try
        {
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = fileKey,
                Expires = DateTime.UtcNow.Add(expiry)
            };

            var url = _s3Client.GetPreSignedURL(request);
            return Task.FromResult(url);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi sinh Presigned URL cho {FileKey}.", fileKey);
            return Task.FromResult(string.Empty);
        }
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> DownloadFileAsync(
        string fileKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fileKey)) return null;

        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _bucketName,
                Key = fileKey
            };

            var response = await _s3Client.GetObjectAsync(getRequest, cancellationToken);
            var memoryStream = new MemoryStream();
            await response.ResponseStream.CopyToAsync(memoryStream, cancellationToken);
            memoryStream.Position = 0;

            var fileName = Path.GetFileName(fileKey);
            var contentType = response.Headers.ContentType ?? "application/octet-stream";

            return (memoryStream, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi tải stream file {FileKey} từ Cloudflare R2.", fileKey);
            return null;
        }
    }
}
