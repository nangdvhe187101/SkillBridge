using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[PrimaryKey("RoleId", "PermissionId")]
[Table("role_permissions")]
[Index("GrantedBy", Name = "fk_rolepermissions_grantedby")]
[Index("PermissionId", Name = "fk_rolepermissions_permission")]
public partial class RolePermission
{
    [Key]
    [Column("role_id")]
    public int RoleId { get; set; }

    [Key]
    [Column("permission_id")]
    public int PermissionId { get; set; }

    [Column("granted_at", TypeName = "datetime")]
    public DateTime GrantedAt { get; set; }

    [Column("granted_by")]
    public int? GrantedBy { get; set; }

    [ForeignKey("GrantedBy")]
    [InverseProperty("RolePermissions")]
    public virtual AdminTeamMember? GrantedByNavigation { get; set; }

    [ForeignKey("PermissionId")]
    [InverseProperty("RolePermissions")]
    public virtual Permission Permission { get; set; } = null!;

    [ForeignKey("RoleId")]
    [InverseProperty("RolePermissions")]
    public virtual Role Role { get; set; } = null!;
}
