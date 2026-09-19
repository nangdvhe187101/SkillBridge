using System;
using Microsoft.Extensions.Configuration;
using SkillBridge.Application.Common;

namespace SkillBridge.Infrastructure.Services.Security;

public class ConfigurationEncryptionKeyProvider : IEncryptionKeyProvider
{
    private readonly IConfiguration _configuration;

    public ConfigurationEncryptionKeyProvider(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GetKey()
    {
        var key = _configuration["Encryption:Key"];
        if (string.IsNullOrWhiteSpace(key))
        {
            key = Environment.GetEnvironmentVariable("ENCRYPTION_KEY");
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Encryption:Key chưa được cấu hình. Vui lòng thiết lập biến môi trường ENCRYPTION_KEY hoặc cấu hình trong appsettings.json.");
        }

        return key.Trim();
    }
}
