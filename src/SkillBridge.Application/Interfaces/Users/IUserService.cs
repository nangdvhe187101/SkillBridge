using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Storage;
using SkillBridge.Application.DTOs.Users;

namespace SkillBridge.Application.Interfaces.Users;

public interface IUserService
{
    Task<UserProfileDto> GetProfileAsync(int userId, CancellationToken cancellationToken = default);

    Task<UserProfileDto> UpdateProfileAsync(int userId, UpdateUserProfileRequest request, CancellationToken cancellationToken = default);

    Task<FileUploadResult> UploadAvatarAsync(
        int userId,
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);
}
