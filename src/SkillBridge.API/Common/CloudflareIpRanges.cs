using System.Collections.Generic;

namespace SkillBridge.API.Common
{
    /// <summary>
    /// Dải IP CDN/proxy chính thức của Cloudflare (nguồn: https://www.cloudflare.com/ips-v4
    /// và https://www.cloudflare.com/ips-v6). Dùng để cấu hình ForwardedHeadersOptions.KnownNetworks
    /// sao cho RemoteIpAddress phản ánh đúng IP người dùng thật (qua header X-Forwarded-For) thay vì
    /// IP của edge node Cloudflare đứng trước Render.
    ///
    /// Cloudflare cập nhật danh sách này không thường xuyên; nếu cần luôn mới nhất, cân nhắc tải động
    /// lúc khởi động thay vì hardcode. Hiện tại hardcode để tránh phụ thuộc mạng khi app khởi động.
    /// </summary>
    public static class CloudflareIpRanges
    {
        public static readonly string[] All =
        {
            // IPv4
            "173.245.48.0/20",
            "103.21.244.0/22",
            "103.22.200.0/22",
            "103.31.4.0/22",
            "141.101.64.0/18",
            "108.162.192.0/18",
            "190.93.240.0/20",
            "188.114.96.0/20",
            "197.234.240.0/22",
            "198.41.128.0/17",
            "162.158.0.0/15",
            "104.16.0.0/13",
            "104.24.0.0/14",
            "172.64.0.0/13",
            "131.0.72.0/22",
            // IPv6
            "2400:cb00::/32",
            "2606:4700::/32",
            "2803:f800::/32",
            "2405:b500::/32",
            "2405:8100::/32",
            "2a06:98c0::/29",
            "2c0f:f248::/32",
        };
    }
}
