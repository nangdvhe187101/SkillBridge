using System;
using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs
{
    public class SchoolDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? ShortName { get; set; }
    }

    public class SubmitStudentVerificationDto
    {
        [Required(ErrorMessage = "Vui lòng chọn trường đại học")]
        public int SchoolId { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập mã số sinh viên")]
        [StringLength(50, ErrorMessage = "MSSV không được vượt quá 50 ký tự")]
        public string StudentCode { get; set; } = null!;

        [Required(ErrorMessage = "Vui lòng nhập họ tên trên thẻ")]
        [StringLength(150, ErrorMessage = "Họ tên không được vượt quá 150 ký tự")]
        public string FullNameOnCard { get; set; } = null!;

        [Required(ErrorMessage = "Vui lòng nhập năm tốt nghiệp dự kiến")]
        [Range(2020, 2040, ErrorMessage = "Năm tốt nghiệp không hợp lệ")]
        public short GraduationYear { get; set; }

        [Required(ErrorMessage = "Vui lòng tải lên ảnh mặt trước thẻ sinh viên")]
        public string FrontCardUrl { get; set; } = null!;

        public string? BackCardUrl { get; set; }
    }

    public class StudentVerificationResponseDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullNameOnCard { get; set; } = string.Empty;
        public short GraduationYear { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ReasonCode { get; set; }
        public string? UserMessage { get; set; }
        public string? RejectionReason { get; set; }
        public string? AdminNote { get; set; }
        public DateTime? NeedInfoDeadline { get; set; }
        public DateTime SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? FrontCardUrl { get; set; }
        public string? BackCardUrl { get; set; }
    }

    public class AdminReviewVerificationDto
    {
        [Required(ErrorMessage = "Vui lòng chọn quyết định")]
        public string Decision { get; set; } = null!; // "approve" | "reject" | "need_more_info"

        public string? ReasonCode { get; set; }
        public string? UserMessage { get; set; }
        public string? RejectionReason { get; set; }
        public string? AdminNote { get; set; }
        public int? NeedInfoDeadlineDays { get; set; } = 7;
    }
}
