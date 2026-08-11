using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("skill_badges")]
[Index("CategoryId", Name = "fk_skillbadges_category")]
public partial class SkillBadge
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [StringLength(100)]
    public string Name { get; set; } = null!;

    [Column("category_id")]
    public int? CategoryId { get; set; }

    [Column("description")]
    [StringLength(255)]
    public string? Description { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("SkillBadges")]
    public virtual Category? Category { get; set; }

    [InverseProperty("Badge")]
    public virtual ICollection<UserBadge> UserBadges { get; set; } = new List<UserBadge>();
}
