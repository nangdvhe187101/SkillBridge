using System;
using System.Collections.Generic;
using SkillBridge.Application.Common;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Payments;

public static class BankAccountMatcher
{
    public static BankAccount? Find(IEnumerable<BankAccount> accounts, string? bankName, string? plainAccount, string key)
    {
        if (accounts == null || string.IsNullOrWhiteSpace(bankName) || string.IsNullOrWhiteSpace(plainAccount) || string.IsNullOrWhiteSpace(key))
            return null;

        var normalizedBank = bankName.Trim().ToUpperInvariant();
        var targetAccount = plainAccount.Trim();

        foreach (var acc in accounts)
        {
            if (acc.BankName?.Trim().ToUpperInvariant() != normalizedBank) continue;
            try
            {
                var decrypted = EncryptionHelper.Decrypt(acc.AccountNumberEncrypted, key);
                if (decrypted?.Trim() == targetAccount) return acc;
            }
            catch
            {
                // Bỏ qua bản ghi hỏng/không giải mã được
            }
        }
        return null;
    }
}
