using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("receipts")]
[Index("EmployerId", Name = "fk_receipts_employer")]
[Index("JobId", Name = "fk_receipts_job")]
[Index("StudentId", Name = "fk_receipts_student")]
public partial class Receipt
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("employer_id")]
    public int EmployerId { get; set; }

    [Column("budget")]
    [Precision(12, 0)]
    public decimal Budget { get; set; }

    [Column("commission")]
    [Precision(12, 0)]
    public decimal Commission { get; set; }

    [Column("total")]
    [Precision(12, 0)]
    public decimal Total { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("EmployerId")]
    [InverseProperty("ReceiptEmployers")]
    public virtual User Employer { get; set; } = null!;

    [ForeignKey("JobId")]
    [InverseProperty("Receipts")]
    public virtual Job Job { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("ReceiptStudents")]
    public virtual User Student { get; set; } = null!;
}
