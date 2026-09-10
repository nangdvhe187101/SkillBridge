using System;

namespace SkillBridge.Application.Common;

public static class StorageKeyHelper
{
    private static readonly string[] RecognizedPrefixes = new[]
    {
        "job-deliverables/",
        "jobs/",
        "cvs/",
        "avatars/"
    };

    /// <summary>
    /// Trích xuất FileKey hợp lệ trên Cloudflare R2 từ URL tuyệt đối, URL tương đối hoặc FileKey thô.
    /// </summary>
    public static string? ExtractKey(string? fileUrl)
    {
        if (string.IsNullOrWhiteSpace(fileUrl)) return null;

        var clean = fileUrl.Trim();
        if (Uri.TryCreate(clean, UriKind.Absolute, out var uri))
        {
            var path = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');
            foreach (var prefix in RecognizedPrefixes)
            {
                var idx = path.IndexOf(prefix, StringComparison.OrdinalIgnoreCase);
                if (idx >= 0)
                {
                    return path[idx..];
                }
            }
            return path;
        }

        var normalized = clean.Replace('\\', '/').TrimStart('/');
        var queryIdx = normalized.IndexOf('?');
        if (queryIdx >= 0)
        {
            normalized = normalized[..queryIdx];
        }

        foreach (var prefix in RecognizedPrefixes)
        {
            var idx = normalized.IndexOf(prefix, StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                return normalized[idx..];
            }
        }

        return normalized;
    }
}
