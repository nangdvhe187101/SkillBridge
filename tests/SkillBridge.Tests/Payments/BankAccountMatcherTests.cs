using System;
using System.Collections.Generic;
using SkillBridge.Application.Common;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Payments;
using Xunit;

namespace SkillBridge.Tests.Payments;

public class BankAccountMatcherTests
{
    private const string TestKey = "12345678901234567890123456789012";

    [Fact]
    public void Find_ShouldMatchAccount_WhenBankNameAndDecryptedAccountMatch()
    {
        // Arrange
        var plainAccount = "1903333333";
        var encrypted = EncryptionHelper.Encrypt(plainAccount, TestKey);

        var accounts = new List<BankAccount>
        {
            new BankAccount
            {
                Id = 1,
                BankName = "Techcombank",
                AccountNumberEncrypted = EncryptionHelper.Encrypt("9999999999", TestKey),
                AccountNumberMask = "****9999"
            },
            new BankAccount
            {
                Id = 2,
                BankName = "techcombank", // lower case
                AccountNumberEncrypted = encrypted,
                AccountNumberMask = "****3333"
            }
        };

        // Act
        var result = BankAccountMatcher.Find(accounts, "TECHCOMBANK", plainAccount, TestKey);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Id);
    }

    [Fact]
    public void Find_ShouldIgnoreCorruptedEncryptedData_AndNotThrow()
    {
        // Arrange
        var plainAccount = "0987654321";
        var encrypted = EncryptionHelper.Encrypt(plainAccount, TestKey);

        var accounts = new List<BankAccount>
        {
            new BankAccount
            {
                Id = 1,
                BankName = "Vietcombank",
                AccountNumberEncrypted = "invalid-base64-string",
                AccountNumberMask = "****0000"
            },
            new BankAccount
            {
                Id = 2,
                BankName = "Vietcombank",
                AccountNumberEncrypted = EncryptionHelper.Encrypt("0000000000", "wrongkey12345678wrongkey12345678"), // wrong key decrypt garbage
                AccountNumberMask = "****0000"
            },
            new BankAccount
            {
                Id = 3,
                BankName = "Vietcombank",
                AccountNumberEncrypted = encrypted,
                AccountNumberMask = "****4321"
            }
        };

        // Act
        var result = BankAccountMatcher.Find(accounts, "Vietcombank", plainAccount, TestKey);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.Id);
    }

    [Fact]
    public void Find_ShouldReturnNull_WhenNoMatchFound()
    {
        // Arrange
        var accounts = new List<BankAccount>
        {
            new BankAccount
            {
                Id = 1,
                BankName = "MB Bank",
                AccountNumberEncrypted = EncryptionHelper.Encrypt("1111222233", TestKey),
                AccountNumberMask = "****2233"
            }
        };

        // Act
        var result = BankAccountMatcher.Find(accounts, "MB Bank", "9999888877", TestKey);

        // Assert
        Assert.Null(result);
    }
}
