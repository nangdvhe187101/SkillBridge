using System.IO;

namespace SkillBridge.Application.Interfaces.Media;

public interface IWatermarkService
{
    bool IsSupported(string fileExtension);
    Stream? ApplyWatermark(Stream inputStream, string fileExtension, int jobId);
}
