using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scrutor;
using Serilog;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình ThreadPool linh hoạt (không hard-code, mặc định 50)
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
        options.InstanceName = "SkillBridge:";
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
        ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 }, // chặn alg:none và alg confusion
        ClockSkew = TimeSpan.FromMinutes(1)
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        },
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
                logger.LogError(ex, "Lỗi kiểm tra TokenVersion cho UserId {UserId}. Áp dụng Fail-Closed.", userIdClaim);
                context.Fail("Authentication verification service temporarily unavailable.");
            }
        }
    };
});
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireEmployerRole", policy => policy.RequireRole("employer"));
    options.AddPolicy("RequireStudentRole", policy => policy.RequireRole("student"));
});

builder.Services.Scan(scan => scan
    .FromAssemblies(
        typeof(SkillBridge.Application.AssemblyReference).Assembly,
        typeof(SkillBridge.Infrastructure.AssemblyReference).Assembly)
    .AddClasses(classes => classes.Where(c => c.Name.EndsWith("Service") || c.Name.EndsWith("Repository")))
    .UsingRegistrationStrategy(RegistrationStrategy.Skip)
    .AsImplementedInterfaces()
    .WithScopedLifetime());

builder.Services.AddSignalR();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var frontendBaseUrl = builder.Configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(frontendBaseUrl, "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()); // cần thiết cho SignalR và Cookie
});

builder.Services.AddRateLimiter(options =>
{
    // AuthPolicy (login, register, forgot-password, v.v.): 10 req/phút per IP
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

    // RefreshTokenPolicy (refresh, logout): 30 req/phút per IP
    options.AddPolicy("RefreshTokenPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));

    // UploadPolicy (upload avatar, CV, deliverables): 15 req/phút per User/IP
    options.AddPolicy("UploadPolicy", httpContext =>
    {
        var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var partitionKey = !string.IsNullOrEmpty(userId) ? $"user_{userId}" : httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: partitionKey,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 15,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            });
    });

    // ResourceCreationPolicy (đăng job, apply job, review deliverable): 20 req/phút per User/IP
    options.AddPolicy("ResourceCreationPolicy", httpContext =>
    {
        var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var partitionKey = !string.IsNullOrEmpty(userId) ? $"user_{userId}" : httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: partitionKey,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            });
    });

    // GeneralApiPolicy (các endpoint đọc/ghi thông thường): 120 req/phút per IP
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
    options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
                               Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    // Giữ loopback mặc định (127.0.0.1, ::1) để chỉ chấp nhận proxy nội bộ tin cậy.
    // KHÔNG clear KnownNetworks/KnownProxies để ngăn kẻ tấn công giả mạo X-Forwarded-For bypass rate limit.
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
    serverOptions.Limits.MaxRequestBodySize = 35 * 1024 * 1024; // 35MB cho request body
});

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 30 * 1024 * 1024; // 30MB multipart form
    options.ValueLengthLimit = 10 * 1024 * 1024;
});

var app = builder.Build();

app.UseForwardedHeaders();

app.UseMiddleware<SkillBridge.API.Middleware.ExceptionHandlingMiddleware>();

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

app.UseCors("AllowFrontend");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
// app.MapHub<ChatHub>("/hubs/chat");
// app.MapHub<NotificationHub>("/hubs/notification");

app.Run();