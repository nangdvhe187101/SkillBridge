using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace SkillBridge.Application.Common;

public static class EncryptionHelper
{
    public static string Encrypt(string plainText, string key)
    {
        if (string.IsNullOrEmpty(plainText)) return string.Empty;
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Encryption:Key chưa được cấu hình. Không cho phép dùng khóa mặc định trong source code.");
        }

        var keyBytes = DeriveKey(key);
        using var aes = Aes.Create();
        aes.Key = keyBytes;
        aes.GenerateIV();
        var iv = aes.IV;

        using var encryptor = aes.CreateEncryptor(aes.Key, iv);
        using var ms = new MemoryStream();
        // Ghi IV 16 bytes vào đầu stream
        ms.Write(iv, 0, iv.Length);

        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs, Encoding.UTF8))
        {
            sw.Write(plainText);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    public static string Decrypt(string cipherText, string key)
    {
        if (string.IsNullOrEmpty(cipherText)) return string.Empty;
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Encryption:Key chưa được cấu hình. Không cho phép dùng khóa mặc định trong source code.");
        }

        var fullCipher = Convert.FromBase64String(cipherText);
        if (fullCipher.Length < 16)
        {
            throw new InvalidOperationException("Chuỗi mã hóa không hợp lệ.");
        }

        var keyBytes = DeriveKey(key);
        using var aes = Aes.Create();
        aes.Key = keyBytes;

        var iv = new byte[16];
        Buffer.BlockCopy(fullCipher, 0, iv, 0, 16);
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream(fullCipher, 16, fullCipher.Length - 16);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs, Encoding.UTF8);

        return sr.ReadToEnd();
    }

    public static string MaskAccountNumber(string? accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber)) return string.Empty;

        var clean = accountNumber.Trim();
        if (clean.Length <= 4)
        {
            return "****" + clean;
        }

        var last4 = clean[^4..];
        return "****" + last4;
    }

    private static byte[] DeriveKey(string secret)
    {
        using var sha256 = SHA256.Create();
        return sha256.ComputeHash(Encoding.UTF8.GetBytes(secret));
    }
}
