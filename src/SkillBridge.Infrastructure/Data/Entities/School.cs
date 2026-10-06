using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("schools")]
public partial class School
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("code")]
    [StringLength(50)]
    public string? Code { get; set; }

    [Column("name")]
    [StringLength(200)]
    public string Name { get; set; } = null!;

    [Column("short_name")]
    [StringLength(50)]
    public string? ShortName { get; set; }

    [Column("domain")]
    [StringLength(100)]
    public string? Domain { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [InverseProperty("School")]
    public virtual ICollection<StudentVerificationRequest> VerificationRequests { get; set; } = new List<StudentVerificationRequest>();

    [InverseProperty("School")]
    public virtual ICollection<StudentProfile> StudentProfiles { get; set; } = new List<StudentProfile>();
}
