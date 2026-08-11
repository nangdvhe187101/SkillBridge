using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("roles")]
[Index("Type", "IsActive", Name = "idx_roles_type_active")]
[Index("Code", Name = "uq_roles_code", IsUnique = true)]
public partial class Role
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("code")]
    [StringLength(50)]
    public string Code { get; set; } = null!;

    [Column("name")]
    [StringLength(100)]
    public string Name { get; set; } = null!;

    [Column("description")]
    [StringLength(255)]
    public string? Description { get; set; }

    [Column("type", TypeName = "enum('user','admin')")]
    public string Type { get; set; } = null!;

    [Required]
    [Column("is_active")]
    public bool? IsActive { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [InverseProperty("Role")]
    public virtual ICollection<AdminTeamMember> AdminTeamMembers { get; set; } = new List<AdminTeamMember>();

    [InverseProperty("Role")]
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();

    [InverseProperty("Role")]
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
