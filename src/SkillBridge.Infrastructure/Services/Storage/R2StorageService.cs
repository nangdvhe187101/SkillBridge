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
    private readonly IAmazonS3? _s3Client;
    private readonly string _bucketName;
    private readonly string? _publicBaseUrl;
    private readonly string? _backendBaseUrl;
    private readonly string _localUploadDirectory;
    private readonly ILogger<R2StorageService> _logger;

    public R2StorageService(IConfiguration configuration, ILogger<R2StorageService> logger)
    {
        _logger = logger;
        _localUploadDirectory = Path.Combine(AppContext.BaseDirectory, "uploads");
        if (!Directory.Exists(_localUploadDirectory))
        {
            try { Directory.CreateDirectory(_localUploadDirectory); } catch { }
        }

        _backendBaseUrl = configuration["Backend:BaseUrl"] ?? configuration["Frontend:ApiBaseUrl"];
        if (string.IsNullOrWhiteSpace(_backendBaseUrl) &&
            (Environment.GetEnvironmentVariable("RENDER") != null ||
             string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Production", StringComparison.OrdinalIgnoreCase)))
        {
            _backendBaseUrl = "https://api.skillbridge.id.vn";
        }

        var r2Config = configuration.GetSection("CloudflareR2");
        var accountId = r2Config["AccountId"];
        var accessKey = r2Config["AccessKeyId"];
        var secretKey = r2Config["SecretAccessKey"];
        _bucketName = r2Config["BucketName"] ?? "skillbridge-bucket";
        _publicBaseUrl = r2Config["PublicBaseUrl"];

        if (string.IsNullOrWhiteSpace(accountId) || string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey))
        {
            _logger.LogWarning("Cloudflare R2 credentials chưa được cấu hình. Sử dụng bộ lưu trữ cục bộ (Local File Storage) tại {LocalPath}.", _localUploadDirectory);
            _s3Client = null;
        }
        else
        {
            var credentials = new BasicAWSCredentials(accessKey, secretKey);
            var s3Config = new AmazonS3Config
            {
                ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
                ForcePathStyle = true,
                AuthenticationRegion = "auto"
            };

            _s3Client = new AmazonS3Client(credentials, s3Config);
        }

        if (string.IsNullOrWhiteSpace(_publicBaseUrl))
        {
            _logger.LogWarning("Cloudflare R2 PublicBaseUrl chưa được cấu hình. Các tệp tải lên sẽ sử dụng download endpoint.");
        }
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
        var safeContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType;

        if (_s3Client == null)
        {
            _logger.LogInformation("Lưu file {FileKey} vào bộ lưu trữ cục bộ ({LocalPath}) do Cloudflare R2 chưa được cấu hình.", fileKey, _localUploadDirectory);
            var localFilePath = Path.Combine(_localUploadDirectory, fileKey.Replace('/', Path.DirectorySeparatorChar));
            var dir = Path.GetDirectoryName(localFilePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            using (var fileStream = new FileStream(localFilePath, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                if (stream.CanSeek) stream.Position = 0;
                await stream.CopyToAsync(fileStream, cancellationToken);
            }

            // Đồng thời sao lưu vào root uploads để không bị mất khi bin/Debug bị rebuild
            try
            {
                var rootUploadPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", fileKey.Replace('/', Path.DirectorySeparatorChar));
                var rootDir = Path.GetDirectoryName(rootUploadPath);
                if (!string.IsNullOrEmpty(rootDir) && !Directory.Exists(rootDir))
                {
                    Directory.CreateDirectory(rootDir);
                }
                if (!string.Equals(Path.GetFullPath(localFilePath), Path.GetFullPath(rootUploadPath), StringComparison.OrdinalIgnoreCase))
                {
                    File.Copy(localFilePath, rootUploadPath, overwrite: true);
                }
            }
            catch (Exception copyEx)
            {
                _logger.LogDebug(copyEx, "Không thể sao lưu file vào root uploads.");
            }

            return new FileUploadResult
            {
                FileKey = fileKey,
                FileUrl = GetPublicUrl(fileKey),
                FileName = cleanFileName,
                FileSize = stream.CanSeek ? stream.Length : 0,
                ContentType = safeContentType,
                UploadedAt = DateTime.UtcNow
            };
        }

        try
        {
            var streamLength = stream.CanSeek ? stream.Length : 0;

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

        var localFilePath = Path.Combine(_localUploadDirectory, fileKey.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(localFilePath))
        {
            try
            {
                File.Delete(localFilePath);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lỗi khi xóa file cục bộ {LocalPath}.", localFilePath);
            }
        }

        if (_s3Client == null) return false;

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

        // Hỗ trợ backward-compatibility: nếu bản ghi cũ đã lưu Full URL (http:// hoặc https://)
        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            if (trimmed.Contains(".r2.dev/", StringComparison.OrdinalIgnoreCase))
            {
                var idx = trimmed.IndexOf(".r2.dev/", StringComparison.OrdinalIgnoreCase);
                var key = trimmed.Substring(idx + 8).TrimStart('/');
                return BuildStorageFileUrl(key);
            }
            if (trimmed.Contains("/api/storage/file?key=", StringComparison.OrdinalIgnoreCase))
            {
                var idx = trimmed.IndexOf("key=", StringComparison.OrdinalIgnoreCase);
                var rawKey = trimmed.Substring(idx + 4).Split('&')[0];
                var decodedKey = Uri.UnescapeDataString(rawKey);
                return BuildStorageFileUrl(decodedKey);
            }
            return trimmed;
        }

        if (trimmed.StartsWith("/api/storage/file?key=", StringComparison.OrdinalIgnoreCase))
        {
            var idx = trimmed.IndexOf("key=", StringComparison.OrdinalIgnoreCase);
            var rawKey = trimmed.Substring(idx + 4).Split('&')[0];
            var decodedKey = Uri.UnescapeDataString(rawKey);
            return BuildStorageFileUrl(decodedKey);
        }

        if (string.IsNullOrWhiteSpace(_publicBaseUrl) || _publicBaseUrl.Contains(".r2.dev", StringComparison.OrdinalIgnoreCase))
        {
            return BuildStorageFileUrl(normalized);
        }

        return $"{_publicBaseUrl.TrimEnd('/')}/{normalized}";
    }

    private string BuildStorageFileUrl(string normalizedKey)
    {
        var escapedKey = Uri.EscapeDataString(normalizedKey);
        if (!string.IsNullOrWhiteSpace(_backendBaseUrl))
        {
            return $"{_backendBaseUrl.TrimEnd('/')}/api/storage/file?key={escapedKey}";
        }

        return $"/api/storage/file?key={escapedKey}";
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
        if (_s3Client == null) return Task.FromResult(string.Empty);

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

        // 1. Nếu hệ thống đã cấu hình Cloudflare R2 credentials (Production/Staging): Ưu tiên tải trực tiếp từ R2
        if (_s3Client != null)
        {
            try
            {
                var getRequest = new GetObjectRequest
                {
                    BucketName = _bucketName,
                    Key = fileKey
                };

                using var response = await _s3Client.GetObjectAsync(getRequest, cancellationToken);
                var memoryStream = new MemoryStream();
                await response.ResponseStream.CopyToAsync(memoryStream, cancellationToken);
                memoryStream.Position = 0;

                var fileName = Path.GetFileName(fileKey);
                var contentType = response.Headers.ContentType ?? "application/octet-stream";

                return (memoryStream, contentType, fileName);
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogInformation(ex, "File {FileKey} không tìm thấy trên Cloudflare R2, chuyển sang kiểm tra bộ lưu trữ cục bộ.", fileKey);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lỗi khi tải stream file {FileKey} từ Cloudflare R2, thử fallback bộ lưu trữ cục bộ.", fileKey);
            }
        }

        // 2. Fallback bộ lưu trữ cục bộ (Local File Storage) khi chạy môi trường local development không có key R2
        var localFilePath = Path.Combine(_localUploadDirectory, fileKey.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(localFilePath))
        {
            var rootUploadPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", fileKey.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(rootUploadPath))
            {
                localFilePath = rootUploadPath;
            }
        }

        if (File.Exists(localFilePath))
        {
            var memoryStream = new MemoryStream();
            using (var fs = new FileStream(localFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                await fs.CopyToAsync(memoryStream, cancellationToken);
            }
            memoryStream.Position = 0;
            var ext = Path.GetExtension(fileKey).ToLowerInvariant();
            var localContentType = ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                ".pdf" => "application/pdf",
                _ => "application/octet-stream"
            };
            return (memoryStream, localContentType, Path.GetFileName(fileKey));
        }

        return null;
    }
}
