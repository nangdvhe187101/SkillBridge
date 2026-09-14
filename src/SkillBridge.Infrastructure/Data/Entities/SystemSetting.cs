using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("system_settings")]
public partial class SystemSetting
{
    [Key]
    [Column("key")]
    [StringLength(100)]
    public string Key { get; set; } = null!;

    [Column("value")]
    [StringLength(1000)]
    public string Value { get; set; } = null!;

    [Column("description")]
    [StringLength(255)]
    public string? Description { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
