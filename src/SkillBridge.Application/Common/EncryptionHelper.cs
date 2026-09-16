using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace SkillBridge.Application.Common;

public static class EncryptionHelper
{
    // Khóa mã hóa bí mật mặc định (được override bởi config Encryption:Key nếu có)
    private const string DefaultMasterSecret = "SkillBridge_Banking_Secret_Key_2026_Enterprise_Salt";

    public static string Encrypt(string plainText, string? key = null)
    {
        if (string.IsNullOrEmpty(plainText)) return string.Empty;

        var keyBytes = DeriveKey(key ?? DefaultMasterSecret);
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

    public static string Decrypt(string cipherText, string? key = null)
    {
        if (string.IsNullOrEmpty(cipherText)) return string.Empty;

        var fullCipher = Convert.FromBase64String(cipherText);
        if (fullCipher.Length < 16)
        {
            throw new InvalidOperationException("Chuỗi mã hóa không hợp lệ.");
        }

        var keyBytes = DeriveKey(key ?? DefaultMasterSecret);
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
