using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Applications;

namespace SkillBridge.Application.Interfaces.Applications;

public interface ICvService
{
    Task<List<CvFileDto>> GetStudentCvFilesAsync(int studentId);
    Task<CvFileDto> UploadCvAsync(int studentId, UploadCvRequest request);
    Task<CvFileDto> UploadCvBinaryAsync(int studentId, Stream stream, string fileName, string contentType, string? label, int? categoryId);
    Task DeleteCvAsync(int studentId, int cvId);
    Task<(Stream Stream, string ContentType, string FileName)> GetCvFileStreamAsync(int currentUserId, int cvId);
}

