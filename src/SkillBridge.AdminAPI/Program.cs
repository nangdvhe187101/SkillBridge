using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scrutor;
using Serilog;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình ThreadPool linh hoạt
var minWorkerThreads = builder.Configuration.GetValue<int>("ThreadPool:MinWorkerThreads", 50);
var minIocpThreads = builder.Configuration.GetValue<int>("ThreadPool:MinCompletionPortThreads", 50);
ThreadPool.SetMinThreads(minWorkerThreads, minIocpThreads);

builder.Host.UseSerilog((context, config) =>
{
    config.WriteTo.Console()
          .MinimumLevel.Information();
});

// Fail-fast Startup Configuration Validation
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' chưa được cấu hình.");

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException("Cấu hình 'Jwt:Key' không hợp lệ hoặc có độ dài < 32 bytes (256 bits).");
}

builder.Services.AddDbContext<SkillBridgeDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddMemoryCache();

var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redisConnection))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = "SkillBridgeAdmin:";
    });
}
else
{
    builder.Services.AddDistributedMemoryCache();
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
        ClockSkew = TimeSpan.FromMinutes(1)
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var tokenVersionService = context.HttpContext.RequestServices.GetRequiredService<ITokenVersionService>();
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();

            var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var tokenVersionClaim = context.Principal?.FindFirst("token_version")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tokenVersionClaim))
            {
                context.Fail("Missing token version claims.");
                return;
            }

            try
            {
                if (!int.TryParse(userIdClaim, out int userId) || !int.TryParse(tokenVersionClaim, out int tokenVersion))
                {
                    context.Fail("Invalid token claims format.");
                    return;
                }

                var currentVersion = await tokenVersionService.GetTokenVersionAsync(userId);

                if (currentVersion == -1 || tokenVersion != currentVersion)
                {
                    context.Fail("Token has been revoked or is no longer valid.");
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi kiểm tra TokenVersion cho UserId {UserId} tại AdminAPI. Áp dụng Fail-Closed.", userIdClaim);
                context.Fail("Authentication verification service temporarily unavailable.");
            }
        }
    };
});

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("RequireAdminRole", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("admin") ||
            context.User.IsInRole("super_admin") ||
            context.User.HasClaim(c => (c.Type == "role_type" || c.Type == "RoleType") && string.Equals(c.Value, "admin", StringComparison.OrdinalIgnoreCase))));

builder.Services.Scan(scan => scan
    .FromAssemblies(
        typeof(SkillBridge.Application.AssemblyReference).Assembly,
        typeof(SkillBridge.Infrastructure.AssemblyReference).Assembly)
    .AddClasses(classes => classes.Where(c => c.Name.EndsWith("Service") || c.Name.EndsWith("Repository")))
    .UsingRegistrationStrategy(RegistrationStrategy.Skip)
    .AsImplementedInterfaces()
    .WithScopedLifetime());

builder.Services.AddScoped<SkillBridge.Application.Interfaces.Payments.IPaymentRealtimeNotifier, SkillBridge.AdminAPI.Services.NullPaymentRealtimeNotifier>();
builder.Services.AddSingleton<SkillBridge.Application.Common.IEncryptionKeyProvider, SkillBridge.Infrastructure.Services.Security.ConfigurationEncryptionKeyProvider>();
builder.Services.AddHttpClient();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var adminFrontendBaseUrl = builder.Configuration["AdminFrontend:BaseUrl"] ?? "http://localhost:5174";
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAdminFrontend", policy =>
        policy.WithOrigins(adminFrontendBaseUrl, "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("AuthPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));

    options.AddPolicy("GeneralApiPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    var knownProxiesConfig = builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>();
    if (knownProxiesConfig != null)
    {
        foreach (var proxy in knownProxiesConfig)
        {
            if (System.Net.IPAddress.TryParse(proxy, out var ipAddress))
            {
                options.KnownProxies.Add(ipAddress);
            }
        }
    }
});

builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 35 * 1024 * 1024;
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    var encKey = app.Configuration["Encryption:Key"];
    if (string.IsNullOrWhiteSpace(encKey) || encKey.Length < 16)
    {
        throw new InvalidOperationException("CRITICAL: 'Encryption:Key' must be configured and at least 16 characters in non-development environments.");
    }
}

app.UseForwardedHeaders();
app.UseMiddleware<SkillBridge.AdminAPI.Middleware.ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    await next();
});

app.UseCors("AllowAdminFrontend");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
