using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Admin;

/// <summary>
/// Dùng cho Admin Portal quản lý danh sách trường đại học/cao đẳng (bảng schools).
/// </summary>
public class AdminSchoolDto
{
    public int Id { get; set; }
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public string? Domain { get; set; }
    public bool IsActive { get; set; }
}

public class CreateAdminSchoolDto
{
    [StringLength(50, ErrorMessage = "Mã trường không được vượt quá 50 ký tự")]
    public string? Code { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập tên trường")]
    [StringLength(150, ErrorMessage = "Tên trường không được vượt quá 150 ký tự")]
    public string Name { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Tên viết tắt không được vượt quá 50 ký tự")]
    public string? ShortName { get; set; }

    [StringLength(100, ErrorMessage = "Domain email không được vượt quá 100 ký tự")]
    public string? Domain { get; set; }
}

public class UpdateAdminSchoolDto
{
    [StringLength(50, ErrorMessage = "Mã trường không được vượt quá 50 ký tự")]
    public string? Code { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập tên trường")]
    [StringLength(150, ErrorMessage = "Tên trường không được vượt quá 150 ký tự")]
    public string Name { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Tên viết tắt không được vượt quá 50 ký tự")]
    public string? ShortName { get; set; }

    [StringLength(100, ErrorMessage = "Domain email không được vượt quá 100 ký tự")]
    public string? Domain { get; set; }

    public bool IsActive { get; set; } = true;
}
