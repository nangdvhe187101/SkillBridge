using System;
using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Support;

/// <summary>
/// DTO gửi yêu cầu hỗ trợ / khiếu nại từ người dùng hoặc khách vãng lai
/// </summary>
public class CreateSupportTicketDto
{
    [Required(ErrorMessage = "Vui lòng nhập họ và tên.")]
    [StringLength(100, ErrorMessage = "Họ và tên không được vượt quá 100 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập email liên hệ.")]
    [EmailAddress(ErrorMessage = "Địa chỉ email không đúng định dạng.")]
    [StringLength(150, ErrorMessage = "Email không được vượt quá 150 ký tự.")]
    public string Email { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Số điện thoại không đúng định dạng.")]
    [StringLength(20, ErrorMessage = "Số điện thoại không được vượt quá 20 ký tự.")]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn hoặc nhập chủ đề yêu cầu.")]
    [StringLength(200, ErrorMessage = "Chủ đề không được vượt quá 200 ký tự.")]
    public string Subject { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập nội dung chi tiết.")]
    [StringLength(4000, ErrorMessage = "Nội dung chi tiết không được vượt quá 4000 ký tự.")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Trường bẫy Bot Honeypot (Người dùng thật luôn để trống)
    /// </summary>
    public string? HoneypotTrap { get; set; }
}

/// <summary>
/// Kết quả phản hồi khi gửi ticket thành công
/// </summary>
public class SupportTicketCreatedResponseDto
{
    public int TicketId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = "open";
    public DateTime CreatedAt { get; set; }
    public string Message { get; set; } = string.Empty;
}
