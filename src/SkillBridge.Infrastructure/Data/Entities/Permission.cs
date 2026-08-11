using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("permissions")]
public partial class Permission
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [StringLength(150)]
    public string Name { get; set; } = null!;

    [Column("module")]
    [StringLength(50)]
    public string Module { get; set; } = null!;

    [Column("method", TypeName = "enum('GET','POST','PUT','PATCH','DELETE')")]
    public string? Method { get; set; }

    [Column("endpoint")]
    [StringLength(255)]
    public string Endpoint { get; set; } = null!;

    [Column("description")]
    [StringLength(255)]
    public string? Description { get; set; }

    [InverseProperty("Permission")]
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
