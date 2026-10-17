using System;
using System.Linq;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Services.Payments;
using SkillBridge.Infrastructure.Services.Security;
using Xunit;

namespace SkillBridge.Tests.Architecture;

public class DependencyInjectionTests
{
    [Fact]
    public void ServiceCollection_ResolveBankVerificationService_ShouldNotThrowAmbiguousConstructors()
    {
        // Arrange: Dựng ServiceCollection với ValidateOnBuild = true như môi trường thực tế
        var services = new ServiceCollection();

        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        services.AddScoped(_ => new SkillBridgeDbContext(options));
        services.AddScoped(typeof(ILogger<>), typeof(MockLogger<>));
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().Build());
        services.AddSingleton<IEncryptionKeyProvider, ConfigurationEncryptionKeyProvider>();
        services.AddScoped(_ => new Moq.Mock<SkillBridge.Application.Interfaces.Admin.ISystemSettingService>().Object);
        services.AddScoped<IBankVerificationService, BankVerificationService>();

        var providerOptions = new ServiceProviderOptions
        {
            ValidateOnBuild = true,
            ValidateScopes = true
        };

        // Act & Assert: Build container và Resolve scoped service
        var serviceProvider = services.BuildServiceProvider(providerOptions);
        using var scope = serviceProvider.CreateScope();

        var service = scope.ServiceProvider.GetService<IBankVerificationService>();
        Assert.NotNull(service);
        Assert.IsType<BankVerificationService>(service);
    }

    [Fact]
    public void AllInfrastructureServices_ShouldHaveExactlyOnePublicConstructor()
    {
        // Quy tắc kiến trúc: Mọi class *Service trong Infrastructure chỉ được có đúng 1 constructor public
        // để ngăn chặn hoàn toàn lỗi Ambiguous Constructor khi DI container resolve
        var infraAssembly = typeof(BankVerificationService).Assembly;

        var serviceTypes = infraAssembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && t.Name.EndsWith("Service") && t.IsPublic)
            .ToList();

        Assert.NotEmpty(serviceTypes);

        foreach (var type in serviceTypes)
        {
            var publicConstructors = type.GetConstructors(BindingFlags.Public | BindingFlags.Instance);
            Assert.True(
                publicConstructors.Length == 1,
                $"Class '{type.FullName}' có {publicConstructors.Length} public constructors (yêu cầu duy nhất 1 constructor để tránh lỗi DI ambiguous)."
            );
        }
    }

    private class MockLogger<T> : ILogger<T>
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => false;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) { }
    }
}
