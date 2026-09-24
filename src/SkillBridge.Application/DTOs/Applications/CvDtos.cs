using System;
using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Applications;

public class CvFileDto
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string FileName { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public int FileSize { get; set; }
    public string? Label { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public bool IsSearchable { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class UploadCvRequest
{
    [Required(ErrorMessage = "Tên file không được để trống.")]
    public string FileName { get; set; } = null!;

    public string? FileUrl { get; set; }

    [StringLength(100, ErrorMessage = "Nhãn hồ sơ không được vượt quá 100 ký tự.")]
    public string? Label { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn ngành nghề cho CV.")]
    public int? CategoryId { get; set; }

    public int FileSize { get; set; }

    public bool IsSearchable { get; set; } = true;
}

public class UpdateCvRequest
{
    [StringLength(100, ErrorMessage = "Nhãn hồ sơ không được vượt quá 100 ký tự.")]
    public string? Label { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn ngành nghề cho CV.")]
    public int CategoryId { get; set; }

    public bool IsSearchable { get; set; } = true;
}
