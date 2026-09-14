using System;
using System.Globalization;
using System.Text;

namespace SkillBridge.Application.Common;

public static class VietnameseConverter
{
    public static string RemoveVietnameseTones(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var normalizedString = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();

        foreach (var c in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        return sb.ToString().Normalize(NormalizationForm.FormC)
            .Replace("đ", "d", StringComparison.OrdinalIgnoreCase)
            .Replace("Đ", "D", StringComparison.OrdinalIgnoreCase)
            .Trim()
            .ToUpperInvariant();
    }
}
