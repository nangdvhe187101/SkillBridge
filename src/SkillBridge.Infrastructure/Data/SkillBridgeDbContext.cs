using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Data;

public partial class SkillBridgeDbContext : DbContext
{
    public SkillBridgeDbContext(DbContextOptions<SkillBridgeDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AdCampaign> AdCampaigns { get; set; }

    public virtual DbSet<AdContent> AdContents { get; set; }

    public virtual DbSet<AdminTeamMember> AdminTeamMembers { get; set; }

    public virtual DbSet<AffiliatePartner> AffiliatePartners { get; set; }

    public virtual DbSet<AffiliateReferral> AffiliateReferrals { get; set; }

    public virtual DbSet<JobApplication> Applications { get; set; }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<AuthToken> AuthTokens { get; set; }

    public virtual DbSet<BankAccount> BankAccounts { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<ChatMessage> ChatMessages { get; set; }

    public virtual DbSet<Conversation> Conversations { get; set; }

    public virtual DbSet<CvFile> CvFiles { get; set; }

    public virtual DbSet<DeliverableFeedback> DeliverableFeedbacks { get; set; }

    public virtual DbSet<Dispute> Disputes { get; set; }

    public virtual DbSet<DisputeEvidence> DisputeEvidences { get; set; }

    public virtual DbSet<FeaturedRequest> FeaturedRequests { get; set; }

    public virtual DbSet<IdentityDocument> IdentityDocuments { get; set; }

    public virtual DbSet<InsuranceFundClaim> InsuranceFundClaims { get; set; }

    public virtual DbSet<InsuranceFundLedger> InsuranceFundLedgers { get; set; }

    public virtual DbSet<Job> Jobs { get; set; }

    public virtual DbSet<JobAttachment> JobAttachments { get; set; }

    public virtual DbSet<JobDeliverable> JobDeliverables { get; set; }

    public virtual DbSet<JobRequirement> JobRequirements { get; set; }

    public virtual DbSet<ModerationQueue> ModerationQueues { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Permission> Permissions { get; set; }

    public virtual DbSet<PortfolioUpload> PortfolioUploads { get; set; }

    public virtual DbSet<Receipt> Receipts { get; set; }

    public virtual DbSet<Referral> Referrals { get; set; }

    public virtual DbSet<ReliabilityEvent> ReliabilityEvents { get; set; }

    public virtual DbSet<Report> Reports { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<SavedJob> SavedJobs { get; set; }

    public virtual DbSet<RolePermission> RolePermissions { get; set; }

    public virtual DbSet<SecurityLog> SecurityLogs { get; set; }

    public virtual DbSet<SkillBadge> SkillBadges { get; set; }

    public virtual DbSet<Subscription> Subscriptions { get; set; }

    public virtual DbSet<SupportTicket> SupportTickets { get; set; }

    public virtual DbSet<SystemConfig> SystemConfigs { get; set; }

    public virtual DbSet<Transaction> Transactions { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserBadge> UserBadges { get; set; }

    public virtual DbSet<Wallet> Wallets { get; set; }

    public virtual DbSet<WithdrawalRequest> WithdrawalRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_unicode_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<AdCampaign>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.Status).HasDefaultValueSql("'running'");

            entity.HasOne(d => d.Business).WithMany(p => p.AdCampaigns)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_adcampaigns_business");
        });

        modelBuilder.Entity<AdContent>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");

            entity.HasOne(d => d.Campaign).WithMany(p => p.AdContents)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_adcontent_campaign");
        });

        modelBuilder.Entity<AdminTeamMember>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.IsActive).HasDefaultValueSql("'1'");

            entity.HasOne(d => d.Role).WithMany(p => p.AdminTeamMembers)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_adminteam_role");
        });

        modelBuilder.Entity<AffiliatePartner>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
        });

        modelBuilder.Entity<AffiliateReferral>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'clicked'");

            entity.HasOne(d => d.Partner).WithMany(p => p.AffiliateReferrals)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_affiliatereferrals_partner");

            entity.HasOne(d => d.Student).WithMany(p => p.AffiliateReferrals).HasConstraintName("fk_affiliatereferrals_student");
        });

        modelBuilder.Entity<JobApplication>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.HasIndex(e => new { e.JobId, e.StudentId })
                .IsUnique()
                .HasDatabaseName("uq_applications_job_student");

            entity.Property(e => e.AppliedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Job).WithMany(p => p.Applications)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_applications_job");

            entity.HasOne(d => d.Student).WithMany(p => p.Applications)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_applications_student");

            entity.HasOne(d => d.CvFile).WithMany(p => p.JobApplications)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_applications_cvfile");
        });

        modelBuilder.Entity<JobAttachment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Job).WithMany(p => p.Attachments)
                .HasForeignKey(d => d.JobId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_job_attachments_job");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Actor).WithMany(p => p.AuditLogs)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_auditlog_actor");
        });

        modelBuilder.Entity<AuthToken>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.MaxAttempts).HasDefaultValueSql("'5'");

            entity.HasOne(d => d.User).WithMany(p => p.AuthTokens)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_authtokens_user");
        });

        modelBuilder.Entity<BankAccount>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User).WithMany(p => p.BankAccounts)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_bankaccounts_user");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.DefaultRevisionLimit).HasDefaultValueSql("'2'");
            entity.Property(e => e.PreviewStrategy).HasDefaultValueSql("'watermark_image'");
        });

        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.SentAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Conversation).WithMany(p => p.ChatMessages)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_chatmessages_conversation");

            entity.HasOne(d => d.Sender).WithMany(p => p.ChatMessages)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_chatmessages_sender");
        });

        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Job).WithMany(p => p.Conversations).HasConstraintName("fk_conversations_job");

            entity.HasOne(d => d.UserA).WithMany(p => p.ConversationUserAs)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_conversations_usera");

            entity.HasOne(d => d.UserB).WithMany(p => p.ConversationUserBs)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_conversations_userb");
        });

        modelBuilder.Entity<CvFile>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.IsSearchable).HasDefaultValueSql("'1'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UploadedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Category).WithMany(p => p.CvFiles).HasConstraintName("fk_cvfiles_category");

            entity.HasOne(d => d.Student).WithMany(p => p.CvFiles)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_cvfiles_student");
        });

        modelBuilder.Entity<DeliverableFeedback>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Deliverable).WithMany(p => p.DeliverableFeedbacks)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_delivfeedback_deliverable");

            entity.HasOne(d => d.Employer).WithMany(p => p.DeliverableFeedbacks)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_delivfeedback_employer");
        });

        modelBuilder.Entity<Dispute>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.FiledAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Origin).HasDefaultValueSql("'manual'");
            entity.Property(e => e.Status).HasDefaultValueSql("'open'");

            entity.HasOne(d => d.Deliverable).WithMany(p => p.Disputes).HasConstraintName("fk_disputes_deliverable");

            entity.HasOne(d => d.Employer).WithMany(p => p.DisputeEmployers)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_disputes_employer");

            entity.HasOne(d => d.Job).WithMany(p => p.Disputes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_disputes_job");

            entity.HasOne(d => d.ResolvedByNavigation).WithMany(p => p.Disputes).HasConstraintName("fk_disputes_resolvedby");

            entity.HasOne(d => d.Student).WithMany(p => p.DisputeStudents)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_disputes_student");
        });

        modelBuilder.Entity<DisputeEvidence>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Dispute).WithMany(p => p.DisputeEvidences)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_disputeevidence_dispute");

            entity.HasOne(d => d.SubmittedByNavigation).WithMany(p => p.DisputeEvidences)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_disputeevidence_submitter");
        });

        modelBuilder.Entity<FeaturedRequest>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
            entity.Property(e => e.UpdatedAt).ValueGeneratedOnAddOrUpdate();

            entity.HasOne(d => d.Employer).WithMany(p => p.FeaturedRequests)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_featuredreq_employer");

            entity.HasOne(d => d.Job).WithMany(p => p.FeaturedRequests)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_featuredreq_job");
        });

        modelBuilder.Entity<IdentityDocument>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.UploadedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User).WithMany(p => p.IdentityDocuments)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_identitydocs_user");
        });

        modelBuilder.Entity<InsuranceFundClaim>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
            entity.Property(e => e.UpdatedAt).ValueGeneratedOnAddOrUpdate();

            entity.HasOne(d => d.Claimant).WithMany(p => p.InsuranceFundClaims)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_insuranceclaims_claimant");

            entity.HasOne(d => d.Job).WithMany(p => p.InsuranceFundClaims)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_insuranceclaims_job");
        });

        modelBuilder.Entity<InsuranceFundLedger>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Claim).WithMany(p => p.InsuranceFundLedgers).HasConstraintName("fk_insuranceledger_claim");

            entity.HasOne(d => d.Dispute).WithMany(p => p.InsuranceFundLedgers).HasConstraintName("fk_insuranceledger_dispute");
        });

        modelBuilder.Entity<Job>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.HasIndex(e => new { e.Title, e.Description }, "idx_jobs_fulltext")
                .HasAnnotation("MySql:FullTextIndex", true);

            entity.Property(e => e.PostedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.RevisionLimit).HasDefaultValueSql("'2'");
            entity.Property(e => e.Status).HasDefaultValueSql("'open'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Category).WithMany(p => p.Jobs)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_jobs_category");

            entity.HasOne(d => d.Employer).WithMany(p => p.JobEmployers)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_jobs_employer");

            entity.HasOne(d => d.HiredApplicant).WithMany(p => p.JobHiredApplicants).HasConstraintName("fk_jobs_hired_applicant");
        });

        modelBuilder.Entity<JobDeliverable>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.HasIndex(e => new { e.JobId, e.Version }, "uq_deliverables_job_version").IsUnique();

            entity.Property(e => e.Status).HasDefaultValueSql("'submitted'");
            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Version).HasDefaultValueSql("'1'");

            entity.HasOne(d => d.Job).WithMany(p => p.JobDeliverables)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_deliverables_job");

            entity.HasOne(d => d.Student).WithMany(p => p.JobDeliverables)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_deliverables_student");
        });

        modelBuilder.Entity<JobRequirement>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.HasOne(d => d.Job).WithMany(p => p.JobRequirements)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_jobreq_job");
        });

        modelBuilder.Entity<ModerationQueue>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Job).WithMany(p => p.ModerationQueues)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_modqueue_job");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.ModerationQueues).HasConstraintName("fk_modqueue_reviewer");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_notifications_user");
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
        });

        modelBuilder.Entity<PortfolioUpload>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.UploadedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Student).WithMany(p => p.PortfolioUploads)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_portfolio_student");
        });

        modelBuilder.Entity<Receipt>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Employer).WithMany(p => p.ReceiptEmployers)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_receipts_employer");

            entity.HasOne(d => d.Job).WithMany(p => p.Receipts)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_receipts_job");

            entity.HasOne(d => d.Student).WithMany(p => p.ReceiptStudents)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_receipts_student");
        });

        modelBuilder.Entity<Referral>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");

            entity.HasOne(d => d.Referred).WithOne(p => p.ReferralReferred)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_referrals_referred");

            entity.HasOne(d => d.Referrer).WithMany(p => p.ReferralReferrers)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_referrals_referrer");
        });

        modelBuilder.Entity<ReliabilityEvent>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Job).WithMany(p => p.ReliabilityEvents).HasConstraintName("fk_reliabilityevents_job");

            entity.HasOne(d => d.User).WithMany(p => p.ReliabilityEvents)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_reliabilityevents_user");
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");

            entity.HasOne(d => d.Reporter).WithMany(p => p.ReportReporters)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_reports_reporter");

            entity.HasOne(d => d.TargetJob).WithMany(p => p.Reports).HasConstraintName("fk_reports_targetjob");

            entity.HasOne(d => d.TargetUser).WithMany(p => p.ReportTargetUsers).HasConstraintName("fk_reports_targetuser");
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Job).WithMany(p => p.Reviews)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_reviews_job");

            entity.HasOne(d => d.Reviewee).WithMany(p => p.ReviewReviewees)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_reviews_reviewee");

            entity.HasOne(d => d.Reviewer).WithMany(p => p.ReviewReviewers)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_reviews_reviewer");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.IsActive).HasDefaultValueSql("'1'");
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(e => new { e.RoleId, e.PermissionId })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });

            entity.Property(e => e.GrantedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.GrantedByNavigation).WithMany(p => p.RolePermissions).HasConstraintName("fk_rolepermissions_grantedby");

            entity.HasOne(d => d.Permission).WithMany(p => p.RolePermissions)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_rolepermissions_permission");

            entity.HasOne(d => d.Role).WithMany(p => p.RolePermissions)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_rolepermissions_role");
        });

        modelBuilder.Entity<SecurityLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User).WithMany(p => p.SecurityLogs)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_securitylogs_user");
        });

        modelBuilder.Entity<SkillBadge>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.HasOne(d => d.Category).WithMany(p => p.SkillBadges).HasConstraintName("fk_skillbadges_category");
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.StartedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'active'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User).WithMany(p => p.Subscriptions)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_subscriptions_user");
        });

        modelBuilder.Entity<SupportTicket>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'open'");

            entity.HasOne(d => d.ResolvedByNavigation).WithMany(p => p.SupportTickets).HasConstraintName("fk_supporttickets_resolvedby");

            entity.HasOne(d => d.User).WithMany(p => p.SupportTickets)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_supporttickets_user");
        });

        modelBuilder.Entity<SystemConfig>(entity =>
        {
            entity.HasKey(e => e.ConfigKey).HasName("PRIMARY");
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User).WithMany(p => p.Transactions).HasConstraintName("fk_transactions_user");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.AccountStatus).HasDefaultValueSql("'pending'");
            entity.Property(e => e.JoinedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.KycStatus).HasDefaultValueSql("'pending'");
            entity.Property(e => e.ReliabilityScore).HasDefaultValueSql("'100'");
            entity.Property(e => e.TokenVersion).HasDefaultValueSql("'1'");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_users_role");
        });

        modelBuilder.Entity<UserBadge>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.GrantedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Badge).WithMany(p => p.UserBadges)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_userbadges_badge");

            entity.HasOne(d => d.GrantedByNavigation).WithMany(p => p.UserBadges).HasConstraintName("fk_userbadges_grantedby");

            entity.HasOne(d => d.User).WithMany(p => p.UserBadges)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_userbadges_user");
        });

        modelBuilder.Entity<Wallet>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PRIMARY");

            entity.Property(e => e.UserId).ValueGeneratedNever();

            entity.HasOne(d => d.User).WithOne(p => p.Wallet)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_wallets_user");
        });

        modelBuilder.Entity<WithdrawalRequest>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.BankAccount).WithMany(p => p.WithdrawalRequests)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_withdrawalreq_bankaccount");

            entity.HasOne(d => d.OtpToken).WithMany(p => p.WithdrawalRequests).HasConstraintName("fk_withdrawalreq_otptoken");

            entity.HasOne(d => d.ProcessedByNavigation).WithMany(p => p.WithdrawalRequests).HasConstraintName("fk_withdrawalreq_processedby");

            entity.HasOne(d => d.Transaction).WithMany(p => p.WithdrawalRequests).HasConstraintName("fk_withdrawalreq_transaction");

            entity.HasOne(d => d.User).WithMany(p => p.WithdrawalRequests)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_withdrawalreq_user");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
