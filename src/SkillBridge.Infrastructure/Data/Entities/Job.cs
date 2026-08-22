using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("jobs")]
[Index("CategoryId", Name = "fk_jobs_category")]
[Index("HiredApplicantId", Name = "fk_jobs_hired_applicant")]
[Index("EmployerId", "Status", Name = "idx_jobs_employer_status")]
[Index("Status", "CategoryId", Name = "idx_jobs_status_category")]
public partial class Job
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("employer_id")]
    public int EmployerId { get; set; }

    [Column("category_id")]
    public int CategoryId { get; set; }

    [Column("title")]
    [StringLength(255)]
    public string Title { get; set; } = null!;

    [Column("description", TypeName = "text")]
    public string Description { get; set; } = null!;

    [Column("location")]
    [StringLength(100)]
    public string? Location { get; set; }

    [Column("budget")]
    [Precision(12, 0)]
    public decimal Budget { get; set; }

    [Column("is_urgent")]
    public bool IsUrgent { get; set; }

    [Column("is_featured")]
    public bool IsFeatured { get; set; }

    [Column("status", TypeName = "enum('open','filled','in_progress','submitted','revision_requested','completed','cancelled')")]
    public string Status { get; set; } = null!;

    [Column("hired_applicant_id")]
    public int? HiredApplicantId { get; set; }

    [Column("escrow_amount")]
    [Precision(12, 0)]
    public decimal? EscrowAmount { get; set; }

    [Column("revision_limit")]
    public int RevisionLimit { get; set; }

    [Column("revision_count")]
    public int RevisionCount { get; set; }

    [Column("deadline_at", TypeName = "datetime")]
    public DateTime? DeadlineAt { get; set; }

    [Column("auto_release_at", TypeName = "datetime")]
    public DateTime? AutoReleaseAt { get; set; }

    [Column("posted_at", TypeName = "datetime")]
    public DateTime PostedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [InverseProperty("Job")]
    public virtual ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();

    [ForeignKey("CategoryId")]
    [InverseProperty("Jobs")]
    public virtual Category Category { get; set; } = null!;

    [InverseProperty("Job")]
    public virtual ICollection<Conversation> Conversations { get; set; } = new List<Conversation>();

    [InverseProperty("Job")]
    public virtual ICollection<Dispute> Disputes { get; set; } = new List<Dispute>();

    [ForeignKey("EmployerId")]
    [InverseProperty("JobEmployers")]
    public virtual User Employer { get; set; } = null!;

    [InverseProperty("Job")]
    public virtual ICollection<FeaturedRequest> FeaturedRequests { get; set; } = new List<FeaturedRequest>();

    [ForeignKey("HiredApplicantId")]
    [InverseProperty("JobHiredApplicants")]
    public virtual User? HiredApplicant { get; set; }

    [InverseProperty("Job")]
    public virtual ICollection<InsuranceFundClaim> InsuranceFundClaims { get; set; } = new List<InsuranceFundClaim>();

    [InverseProperty("Job")]
    public virtual ICollection<JobDeliverable> JobDeliverables { get; set; } = new List<JobDeliverable>();

    [InverseProperty("Job")]
    public virtual ICollection<JobRequirement> JobRequirements { get; set; } = new List<JobRequirement>();

    [InverseProperty("Job")]
    public virtual ICollection<ModerationQueue> ModerationQueues { get; set; } = new List<ModerationQueue>();

    [InverseProperty("Job")]
    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();

    [InverseProperty("Job")]
    public virtual ICollection<ReliabilityEvent> ReliabilityEvents { get; set; } = new List<ReliabilityEvent>();

    [InverseProperty("TargetJob")]
    public virtual ICollection<Report> Reports { get; set; } = new List<Report>();

    [InverseProperty("Job")]
    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    [InverseProperty("Job")]
    public virtual ICollection<SavedJob> SavedJobs { get; set; } = new List<SavedJob>();
}
