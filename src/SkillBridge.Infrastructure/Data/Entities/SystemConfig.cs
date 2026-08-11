using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("system_config")]
public partial class SystemConfig
{
    [Key]
    [Column("config_key")]
    [StringLength(50)]
    public string ConfigKey { get; set; } = null!;

    [Column("config_value")]
    [StringLength(255)]
    public string ConfigValue { get; set; } = null!;

    [Column("description")]
    [StringLength(255)]
    public string? Description { get; set; }
}
