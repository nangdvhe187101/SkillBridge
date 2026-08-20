using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("users")]
[Index("RoleId", Name = "idx_users_role")]
[Index("RoleId", "AccountStatus", Name = "idx_users_role_status")]
[Index("Email", Name = "uq_users_email", IsUnique = true)]
[Index("PhoneNumber", Name = "uq_users_phone", IsUnique = true)]
[Index("ReferralCode", Name = "uq_users_referral_code", IsUnique = true)]

public partial class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("full_name")]
    [StringLength(150)]
    public string FullName { get; set; } = null!;

    [Column("email")]
    [StringLength(150)]
    public string Email { get; set; } = null!;

    [Column("phone_number")]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    [Column("avatar_url")]
    [StringLength(255)]
    public string? AvatarUrl { get; set; }

    [Column("password_hash")]
    [StringLength(255)]
    public string PasswordHash { get; set; } = null!;

    [Column("role_id")]
    public int RoleId { get; set; }

    [Column("school")]
    [StringLength(150)]
    public string? School { get; set; }

    [Column("industry")]
    [StringLength(100)]
    public string? Industry { get; set; }

    [Column("company_size")]
    [StringLength(50)]
    public string? CompanySize { get; set; }

    [Column("website")]
    [StringLength(255)]
    public string? Website { get; set; }

    [Column("company_description", TypeName = "text")]
    public string? CompanyDescription { get; set; }

    [Column("kyc_status", TypeName = "enum('pending','verified','rejected')")]
    public string KycStatus { get; set; } = null!;

    [Column("kyc_reviewed_by")]
    public int? KycReviewedBy { get; set; }

    [Column("kyc_reviewed_at", TypeName = "datetime")]
    public DateTime? KycReviewedAt { get; set; }

    [Column("kyc_rejection_reason", TypeName = "text")]
    public string? KycRejectionReason { get; set; }

    [Column("account_status", TypeName = "enum('active','pending','locked','blacklisted')")]
    public string AccountStatus { get; set; } = null!;

    [Column("reliability_score")]
    public int ReliabilityScore { get; set; }

    [Column("jobs_done_count")]
    public int JobsDoneCount { get; set; }

    [Column("blacklist_reason", TypeName = "text")]
    public string? BlacklistReason { get; set; }

    [Column("referral_code")]
    [StringLength(20)]
    public string? ReferralCode { get; set; }

    [Column("joined_at", TypeName = "datetime")]
    public DateTime JoinedAt { get; set; }

    // ==== MỚI: chống brute-force login theo tài khoản ====
    [Column("failed_login_attempts")]
    public int FailedLoginAttempts { get; set; } = 0;

    [Column("lockout_until")]
    public DateTime? LockoutUntil { get; set; }
    // ======================================================

    [InverseProperty("Business")]
    public virtual ICollection<AdCampaign> AdCampaigns { get; set; } = new List<AdCampaign>();

    [InverseProperty("Student")]
    public virtual ICollection<AffiliateReferral> AffiliateReferrals { get; set; } = new List<AffiliateReferral>();

    [InverseProperty("Student")]
    public virtual ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();

    [InverseProperty("User")]
    public virtual ICollection<AuthToken> AuthTokens { get; set; } = new List<AuthToken>();

    [InverseProperty("User")]
    public virtual ICollection<BankAccount> BankAccounts { get; set; } = new List<BankAccount>();

    [InverseProperty("Sender")]
    public virtual ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();

    [InverseProperty("UserA")]
    public virtual ICollection<Conversation> ConversationUserAs { get; set; } = new List<Conversation>();

    [InverseProperty("UserB")]
    public virtual ICollection<Conversation> ConversationUserBs { get; set; } = new List<Conversation>();

    [InverseProperty("Student")]
    public virtual ICollection<CvFile> CvFiles { get; set; } = new List<CvFile>();

    [InverseProperty("Employer")]
    public virtual ICollection<DeliverableFeedback> DeliverableFeedbacks { get; set; } = new List<DeliverableFeedback>();

    [InverseProperty("Employer")]
    public virtual ICollection<Dispute> DisputeEmployers { get; set; } = new List<Dispute>();

    [InverseProperty("SubmittedByNavigation")]
    public virtual ICollection<DisputeEvidence> DisputeEvidences { get; set; } = new List<DisputeEvidence>();

    [InverseProperty("Student")]
    public virtual ICollection<Dispute> DisputeStudents { get; set; } = new List<Dispute>();

    [InverseProperty("Employer")]
    public virtual ICollection<FeaturedRequest> FeaturedRequests { get; set; } = new List<FeaturedRequest>();

    [InverseProperty("User")]
    public virtual ICollection<IdentityDocument> IdentityDocuments { get; set; } = new List<IdentityDocument>();

    [InverseProperty("Claimant")]
    public virtual ICollection<InsuranceFundClaim> InsuranceFundClaims { get; set; } = new List<InsuranceFundClaim>();

    [InverseProperty("Student")]
    public virtual ICollection<JobDeliverable> JobDeliverables { get; set; } = new List<JobDeliverable>();

    [InverseProperty("Employer")]
    public virtual ICollection<Job> JobEmployers { get; set; } = new List<Job>();

    [InverseProperty("HiredApplicant")]
    public virtual ICollection<Job> JobHiredApplicants { get; set; } = new List<Job>();

    [InverseProperty("User")]
    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    [InverseProperty("Student")]
    public virtual ICollection<PortfolioUpload> PortfolioUploads { get; set; } = new List<PortfolioUpload>();

    [InverseProperty("Employer")]
    public virtual ICollection<Receipt> ReceiptEmployers { get; set; } = new List<Receipt>();

    [InverseProperty("Student")]
    public virtual ICollection<Receipt> ReceiptStudents { get; set; } = new List<Receipt>();

    [InverseProperty("Referred")]
    public virtual Referral? ReferralReferred { get; set; }

    [InverseProperty("Referrer")]
    public virtual ICollection<Referral> ReferralReferrers { get; set; } = new List<Referral>();

    [InverseProperty("User")]
    public virtual ICollection<ReliabilityEvent> ReliabilityEvents { get; set; } = new List<ReliabilityEvent>();

    [InverseProperty("Reporter")]
    public virtual ICollection<Report> ReportReporters { get; set; } = new List<Report>();

    [InverseProperty("TargetUser")]
    public virtual ICollection<Report> ReportTargetUsers { get; set; } = new List<Report>();

    [InverseProperty("Reviewee")]
    public virtual ICollection<Review> ReviewReviewees { get; set; } = new List<Review>();

    [InverseProperty("Reviewer")]
    public virtual ICollection<Review> ReviewReviewers { get; set; } = new List<Review>();

    [ForeignKey("RoleId")]
    [InverseProperty("Users")]
    public virtual Role Role { get; set; } = null!;

    [ForeignKey("KycReviewedBy")]
    [InverseProperty("KycReviewedUsers")]
    public virtual AdminTeamMember? KycReviewer { get; set; }

    [InverseProperty("User")]
    public virtual ICollection<SecurityLog> SecurityLogs { get; set; } = new List<SecurityLog>();

    [InverseProperty("User")]
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

    [InverseProperty("User")]
    public virtual ICollection<SupportTicket> SupportTickets { get; set; } = new List<SupportTicket>();

    [InverseProperty("User")]
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();

    [InverseProperty("User")]
    public virtual ICollection<UserBadge> UserBadges { get; set; } = new List<UserBadge>();

    [InverseProperty("User")]
    public virtual Wallet? Wallet { get; set; }

    [InverseProperty("User")]
    public virtual ICollection<WithdrawalRequest> WithdrawalRequests { get; set; } = new List<WithdrawalRequest>();
}