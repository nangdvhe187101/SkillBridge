using System;
using System.Collections.Generic;
using System.Text;

namespace SkillBridge.Application.Common;

public static class VietQrHelper
{
    private const string VietQrGuid = "A000000727";
    private const string ServiceCode = "QRIBFTTA";

    /// <summary>
    /// Tạo chuỗi VietQR chuẩn EMVCo từ mã ngân hàng (BIN) và số tài khoản
    /// </summary>
    public static string GeneratePayload(string bankBin, string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(bankBin)) throw new ArgumentException("Mã ngân hàng (BIN) không được để trống.", nameof(bankBin));
        if (string.IsNullOrWhiteSpace(accountNumber)) throw new ArgumentException("Số tài khoản không được để trống.", nameof(accountNumber));

        var cleanBin = bankBin.Trim();
        var cleanAcc = accountNumber.Trim();

        // 1. Beneficiary Sub-TLVs (Sub-tag 00: BIN, Sub-tag 01: STK)
        var binTlv = FormatTlv("00", cleanBin);
        var accTlv = FormatTlv("01", cleanAcc);
        var beneficiaryTlv = FormatTlv("01", binTlv + accTlv);

        // 2. Tag 38: Consumer Account Information
        var guidTlv = FormatTlv("00", VietQrGuid);
        var serviceTlv = FormatTlv("02", ServiceCode);
        var tag38Value = guidTlv + beneficiaryTlv + serviceTlv;
        var tag38 = FormatTlv("38", tag38Value);

        // 3. Payload cơ bản
        var sb = new StringBuilder();
        sb.Append(FormatTlv("00", "01"));    // Payload Format Indicator
        sb.Append(FormatTlv("01", "12"));    // Point of Initiation Method (Dynamic / Transfer)
        sb.Append(tag38);                    // Consumer Account Info
        sb.Append(FormatTlv("53", "704"));   // Currency VND
        sb.Append(FormatTlv("58", "VN"));    // Country Code

        // 4. Tag 63: CRC16
        sb.Append("6304");
        var crc = CalculateCrc16Ccitt(sb.ToString());
        sb.Append(crc);

        return sb.ToString();
    }

    /// <summary>
    /// Parse chuỗi EMVCo/VietQR để trích xuất BIN ngân hàng và số tài khoản
    /// </summary>
    public static bool TryParsePayload(string payload, out string? bankBin, out string? accountNumber)
    {
        bankBin = null;
        accountNumber = null;

        if (string.IsNullOrWhiteSpace(payload) || payload.Length < 20)
        {
            return false;
        }

        try
        {
            var rootTlvs = ParseTlvs(payload);

            // Tìm Tag 38
            if (!rootTlvs.TryGetValue("38", out var tag38Value))
            {
                return false;
            }

            var subTlvs = ParseTlvs(tag38Value);

            // Tìm Sub-tag 01 (Beneficiary Organization)
            if (!subTlvs.TryGetValue("01", out var beneficiaryValue))
            {
                return false;
            }

            var beneficiaryTlvs = ParseTlvs(beneficiaryValue);

            // Lấy Sub-tag 00 (BIN) và Sub-tag 01 (AccountNumber)
            if (beneficiaryTlvs.TryGetValue("00", out var bin) && beneficiaryTlvs.TryGetValue("01", out var acc))
            {
                bankBin = bin.Trim();
                accountNumber = acc.Trim();
                return !string.IsNullOrEmpty(bankBin) && !string.IsNullOrEmpty(accountNumber);
            }

            return false;
        }
        catch
        {
            return false;
        }
    }

    private static string FormatTlv(string tag, string value)
    {
        var len = value.Length;
        return $"{tag}{len:D2}{value}";
    }

    private static Dictionary<string, string> ParseTlvs(string content)
    {
        var dict = new Dictionary<string, string>();
        var index = 0;

        while (index + 4 <= content.Length)
        {
            var tag = content.Substring(index, 2);
            if (!int.TryParse(content.Substring(index + 2, 2), out var length))
            {
                break;
            }

            index += 4;
            if (index + length > content.Length)
            {
                break;
            }

            var value = content.Substring(index, length);
            dict[tag] = value;
            index += length;
        }

        return dict;
    }

    /// <summary>
    /// Tính mã CRC16-CCITT chuẩn EMVCo (Polynomial 0x1021, Init 0xFFFF)
    /// </summary>
    public static string CalculateCrc16Ccitt(string data)
    {
        var bytes = Encoding.ASCII.GetBytes(data);
        ushort crc = 0xFFFF;
        const ushort polynomial = 0x1021;

        foreach (var b in bytes)
        {
            for (var i = 0; i < 8; i++)
            {
                var bit = ((b >> (7 - i)) & 1) == 1;
                var c15 = ((crc >> 15) & 1) == 1;
                crc <<= 1;
                if (c15 ^ bit)
                {
                    crc ^= polynomial;
                }
            }
        }

        crc &= 0xFFFF;
        return crc.ToString("X4");
    }
}
