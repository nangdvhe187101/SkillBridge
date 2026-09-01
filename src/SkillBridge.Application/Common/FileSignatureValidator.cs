using System;
using System.IO;
using System.Text;

namespace SkillBridge.Application.Common;

public static class FileSignatureValidator
{
    private static readonly byte[] PeSignature = { 0x4D, 0x5A }; // "MZ" (Windows PE: .exe, .dll, .sys, .com)
    private static readonly byte[] ElfSignature = { 0x7F, 0x45, 0x4C, 0x46 }; // "\x7fELF" (Linux Executable)
    private static readonly byte[] MachO32 = { 0xFE, 0xED, 0xFA, 0xCE };
    private static readonly byte[] MachO64 = { 0xFE, 0xED, 0xFA, 0xCF };
    private static readonly byte[] MachO32Rev = { 0xCE, 0xFA, 0xED, 0xFE };
    private static readonly byte[] MachO64Rev = { 0xCF, 0xFA, 0xED, 0xFE };
    private static readonly byte[] ShellScript = { 0x23, 0x21 }; // "#!"

    /// <summary>
    /// Kiểm tra denylist các file thực thi / mã độc nhị phân nguy hiểm trên luồng Stream
    /// </summary>
    public static void ValidateSafeFile(Stream stream, string fileName)
    {
        if (stream == null || stream.Length == 0)
        {
            throw new BusinessException("Dữ liệu tệp không hợp lệ hoặc rỗng.");
        }

        if (!stream.CanSeek)
        {
            return; // Nếu không hỗ trợ seek thì bỏ qua
        }

        var originalPosition = stream.Position;
        try
        {
            stream.Position = 0;
            var header = new byte[Math.Min(32, stream.Length)];
            var bytesRead = stream.Read(header, 0, header.Length);

            if (bytesRead >= 2)
            {
                // Kiểm tra PE (Windows Executable / DLL)
                if (MatchSignature(header, PeSignature))
                {
                    throw new BusinessException("Tệp tin bị từ chối: Phát hiện tệp thực thi Windows (PE/EXE).");
                }

                // Kiểm tra Shell Script
                if (MatchSignature(header, ShellScript))
                {
                    throw new BusinessException("Tệp tin bị từ chối: Phát hiện tệp script shell.");
                }
            }

            if (bytesRead >= 4)
            {
                // Kiểm tra ELF (Linux Executable)
                if (MatchSignature(header, ElfSignature))
                {
                    throw new BusinessException("Tệp tin bị từ chối: Phát hiện tệp thực thi Linux (ELF).");
                }

                // Kiểm tra Mach-O (macOS Binary)
                if (MatchSignature(header, MachO32) || MatchSignature(header, MachO64) ||
                    MatchSignature(header, MachO32Rev) || MatchSignature(header, MachO64Rev))
                {
                    throw new BusinessException("Tệp tin bị từ chối: Phát hiện tệp thực thi macOS binary.");
                }
            }

            // Kiểm tra script PHP / Script tag giả mạo văn bản
            if (bytesRead >= 5)
            {
                var headerText = Encoding.ASCII.GetString(header).ToLowerInvariant();
                if (headerText.Contains("<?php") || headerText.Contains("<script"))
                {
                    throw new BusinessException("Tệp tin bị từ chối: Phát hiện mã script không an toàn trong nội dung.");
                }
            }
        }
        finally
        {
            stream.Position = originalPosition;
        }
    }

    private static bool MatchSignature(byte[] buffer, byte[] signature)
    {
        if (buffer.Length < signature.Length) return false;
        for (int i = 0; i < signature.Length; i++)
        {
            if (buffer[i] != signature[i]) return false;
        }
        return true;
    }
}
