using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SkillBridge.Infrastructure.Services.Security;

public interface ITurnstileService
{
    Task<bool> VerifyTokenAsync(string? token, string? remoteIp = null, CancellationToken ct = default);
}

public class TurnstileService : ITurnstileService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<TurnstileService> _logger;

    private const string VerifyEndpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    public TurnstileService(
        HttpClient httpClient,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<TurnstileService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<bool> VerifyTokenAsync(string? token, string? remoteIp = null, CancellationToken ct = default)
    {
        var secretKey = _configuration["Turnstile:SecretKey"];

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            if (_environment.IsDevelopment())
            {
                _logger.LogWarning("[Turnstile] Không tìm thấy 'Turnstile:SecretKey'. Tự động bỏ qua kiểm tra Turnstile trên môi trường Development.");
                return true;
            }

            _logger.LogError("[Turnstile] LỖI CẤU HÌNH: 'Turnstile:SecretKey' chưa được thiết lập trên môi trường Production.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("[Turnstile] Request bị từ chối do thiếu turnstileToken từ Client.");
            return false;
        }

        try
        {
            var parameters = new Dictionary<string, string>
            {
                { "secret", secretKey },
                { "response", token }
            };

            if (!string.IsNullOrWhiteSpace(remoteIp))
            {
                parameters.Add("remoteip", remoteIp);
            }

            using var formContent = new FormUrlEncodedContent(parameters);
            var response = await _httpClient.PostAsync(VerifyEndpoint, formContent, ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[Turnstile] Cloudflare Verify API phản hồi mã HTTP: {StatusCode}", response.StatusCode);
                return false;
            }

            var result = await response.Content.ReadFromJsonAsync<TurnstileVerifyResponse>(cancellationToken: ct);

            if (result == null || !result.Success)
            {
                var errors = result?.ErrorCodes != null ? string.Join(", ", result.ErrorCodes) : "unknown";
                _logger.LogWarning("[Turnstile] Xác minh token thất bại từ Cloudflare. Error codes: {Errors}", errors);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Turnstile] Ngoại lệ khi gửi yêu cầu xác thực sang Cloudflare.");
            return false;
        }
    }

    private sealed class TurnstileVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public List<string>? ErrorCodes { get; set; }

        [JsonPropertyName("hostname")]
        public string? Hostname { get; set; }
    }
}
