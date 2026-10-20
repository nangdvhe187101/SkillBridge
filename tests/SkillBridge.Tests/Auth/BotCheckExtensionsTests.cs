using System.Net;
using Microsoft.AspNetCore.Http;
using Moq;
using SkillBridge.API.Common;
using SkillBridge.Infrastructure.Services.Security;
using Xunit;

namespace SkillBridge.Tests.Auth;

public class BotCheckExtensionsTests
{
    private readonly Mock<ITurnstileService> _turnstile = new();

    private static DefaultHttpContext CreateContext(string? forwardedFor = null)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("10.0.0.1");
        if (forwardedFor != null)
        {
            context.Request.Headers["X-Forwarded-For"] = forwardedFor;
        }
        return context;
    }

    [Fact]
    public async Task FilledHoneypot_IsRejected_WithoutCallingTurnstile()
    {
        var passed = await _turnstile.Object.PassesBotCheckAsync(CreateContext(), "http://spam.example", "token");

        Assert.False(passed);
        _turnstile.Verify(t => t.VerifyTokenAsync(It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task InvalidToken_IsRejected()
    {
        _turnstile.Setup(t => t.VerifyTokenAsync("bad", It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var passed = await _turnstile.Object.PassesBotCheckAsync(CreateContext(), null, "bad");

        Assert.False(passed);
    }

    [Fact]
    public async Task ValidToken_Passes_AndUsesFirstForwardedIp()
    {
        _turnstile.Setup(t => t.VerifyTokenAsync("good", "203.0.113.5", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var passed = await _turnstile.Object.PassesBotCheckAsync(CreateContext("203.0.113.5, 10.1.1.1"), "", "good");

        Assert.True(passed);
    }

    [Fact]
    public async Task WithoutForwardedHeader_FallsBackToConnectionIp()
    {
        _turnstile.Setup(t => t.VerifyTokenAsync("good", "10.0.0.1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var passed = await _turnstile.Object.PassesBotCheckAsync(CreateContext(), null, "good");

        Assert.True(passed);
    }
}
