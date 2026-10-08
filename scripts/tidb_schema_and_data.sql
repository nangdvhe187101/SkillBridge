SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

-- -----------------------------------------------------
-- 1. Table structure for table `__EFMigrationsHistory`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `__EFMigrationsHistory`;
CREATE TABLE `__EFMigrationsHistory` (
  `MigrationId` varchar(150) NOT NULL,
  `ProductVersion` varchar(32) NOT NULL,
  PRIMARY KEY (`MigrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `__EFMigrationsHistory` VALUES 
('20260819100000_InitialBaseline','9.0.14'),
('20260901084355_AddJobAttachmentsCoverLetterAndUniqueApplicationIndex','9.0.14'),
('20260901095112_AddDeliverableVersionUniqueIndexAndJobFullText','9.0.14'),
('20260902085435_RemoveCategoryJobCountColumn','9.0.14'),
('20260912015323_AddPaymentOrdersAndWebhookLogs','9.0.14'),
('20260913020650_AddCancelledStatusToDeliverables','9.0.14'),
('20260913025820_AddUniqueConstraintToReceiptJobId','9.0.14'),
('20260913160143_AddDeadlineReminderTrackingToJobs','9.0.14'),
('20260914033224_AddBankAccountsAndSystemSettings','9.0.14'),
('20260915152633_AddBankVerificationRequests','9.0.14'),
('20260916005344_AddPendingUserUniqueIndexToBankVerificationRequests','9.0.14'),
('20260922050949_AddUniqueIndexConversationPairJob','9.0.14'),
('20260924095541_AddExtensionCountToJob','9.0.14');

-- -----------------------------------------------------
-- 2. Table structure for table `roles`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('user','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_code` (`code`),
  KEY `idx_roles_type_active` (`type`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` VALUES 
(1,'student','Sinh viên','Vai trò người tìm việc','user',1,'2026-08-10 09:02:30'),
(2,'employer','Nhà tuyển dụng','Vai trò đăng việc/doanh nghiệp nhỏ','user',1,'2026-08-10 09:02:30'),
(3,'super_admin','Super Admin','Toàn quyền quản trị hệ thống','admin',1,'2026-08-10 09:02:30'),
(4,'content_moderator','Content Moderator','Duyệt tin đăng, xử lý report','admin',1,'2026-08-10 09:02:30'),
(5,'dispute_officer','Dispute Officer','Xử lý tranh chấp','admin',1,'2026-08-10 09:02:30'),
(6,'finance_viewer','Finance Viewer','Xem báo cáo tài chính','admin',1,'2026-08-10 09:02:30'),
(7,'admin','Quản trị viên','Quản trị viên toàn quyền hệ thống','admin',1,'2026-09-16 01:27:51');

-- -----------------------------------------------------
-- 3. Table structure for table `admin_team_members`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `admin_team_members`;
CREATE TABLE `admin_team_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_adminteam_email` (`email`),
  KEY `idx_adminteam_role` (`role_id`),
  CONSTRAINT `fk_adminteam_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admin_team_members` VALUES 
(1,'Lê Quản Trị','admin@skillbridge.vn',3,1,'2026-08-10 09:02:30'),
(2,'Phạm Kiểm Duyệt','moderator@skillbridge.vn',4,1,'2026-08-10 09:02:30'),
(3,'Hoàng Tranh Chấp','dispute@skillbridge.vn',5,1,'2026-08-10 09:02:30'),
(4,'Quản Trị Viên','skillbridge.vn@gmail.com',7,1,'2026-09-16 01:30:29');

-- -----------------------------------------------------
-- 4. Table structure for table `users`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int NOT NULL,
  `school` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  `student_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `graduation_year` smallint DEFAULT NULL,
  `industry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_size` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_description` text COLLATE utf8mb4_unicode_ci,
  `headline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `tax_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `representative` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skills_json` text COLLATE utf8mb4_unicode_ci,
  `education_json` text COLLATE utf8mb4_unicode_ci,
  `experience_json` text COLLATE utf8mb4_unicode_ci,
  `social_links_json` text COLLATE utf8mb4_unicode_ci,
  `benefits_json` text COLLATE utf8mb4_unicode_ci,
  `office_images_json` text COLLATE utf8mb4_unicode_ci,
  `kyc_status` enum('pending','verified','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `kyc_reviewed_by` int DEFAULT NULL,
  `kyc_reviewed_at` datetime DEFAULT NULL,
  `kyc_rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `account_status` enum('active','pending','locked','blacklisted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reliability_score` int NOT NULL DEFAULT '100',
  `jobs_done_count` int NOT NULL DEFAULT '0',
  `blacklist_reason` text COLLATE utf8mb4_unicode_ci,
  `referral_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `failed_login_attempts` int NOT NULL DEFAULT '0',
  `lockout_until` datetime DEFAULT NULL,
  `token_version` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_phone` (`phone_number`),
  UNIQUE KEY `uq_users_referral_code` (`referral_code`),
  KEY `idx_users_role` (`role_id`),
  KEY `idx_users_role_status` (`role_id`,`account_status`),
  KEY `fk_users_kyc_reviewer` (`kyc_reviewed_by`),
  CONSTRAINT `fk_users_kyc_reviewer` FOREIGN KEY (`kyc_reviewed_by`) REFERENCES `admin_team_members` (`id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` VALUES 
(1,'Nguyễn Văn An','test@gmail.com','0901111111',NULL,'$2a$11$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ0123',1,'Đại học FPT','Lập trình web',NULL,NULL,'Sinh viên năm cuối ngành Kỹ thuật phần mềm Đại học FPT, chuyên lập trình Fullstack Web.','verified',NULL,NULL,NULL,'active',95,12,NULL,'AN2026REF','2026-01-15 08:00:00',0,NULL,1),
(2,'Trần Thị Bình','binh.tran@student.edu.vn','0902222222',NULL,'$2a$10$hashhashhashhashhashhashha',1,'Đại học FPT','Viết nội dung',NULL,NULL,'Sinh viên Đại học FPT, đam mê sáng tạo nội dung số, viết bài PR và kịch bản truyền thông.','verified',NULL,NULL,NULL,'active',88,6,NULL,'BINH2026REF','2026-02-20 09:30:00',0,NULL,1),
(3,'Công ty TNHH ABC Solutions','contact@abcsolutions.vn','0903333333',NULL,'$2a$10$hashhashhashhashhashhashha',2,NULL,'Công nghệ thông tin','10-50','https://abcsolutions.vn','Công ty giải pháp phần mềm cho SME','verified',NULL,NULL,NULL,'active',92,20,NULL,NULL,'2025-11-05 10:00:00',0,NULL,1),
(4,'Startup XYZ Creative','hello@xyzcreative.vn','0904444444',NULL,'$2a$10$hashhashhashhashhashhashha',2,NULL,'Marketing & Truyền thông','1-10','https://xyzcreative.vn','Studio sáng tạo nội dung số','pending',NULL,NULL,NULL,'pending',100,0,NULL,NULL,'2026-06-01 14:20:00',0,NULL,1),
(5,'Lê Hoàng Long','test@fpt.edu.vn','0987654321',NULL,'$2a$11$.UHe6MQbC19KYcpk9Qrf8ukxpTdy562wqlnjraZn3x5uWgCzCOcG6',1,'Đại học FPT','Lập trình web',NULL,NULL,'Sinh viên CNTT Đại học FPT, thế mạnh Frontend React và giao diện người dùng hiện đại.','pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-13 21:30:52',0,NULL,1),
(6,'Hoàng Minh Tuấn','test1@fpt.edu.vn','0897654321',NULL,'$2a$11$XDWLSyq22raaxeAGXj3wI.7aLN8GPP60mN9TEpfVIhJgt9yQdY6XW',1,'Đại học FPT','Thiết kế đồ hoạ',NULL,NULL,'Sinh viên Thiết kế Mỹ thuật số Đại học FPT, chuyên thiết kế ấn phẩm, banner và branding.','pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-13 21:45:29',0,NULL,1),
(7,'Vũ Quỳnh Mai','test2@fpt.edu.vn','0978654321',NULL,'$2a$11$pQzCf6v.dE4fwiVQ21ZkC.B66QkDT.53tW7V0Fq2xiRcidMGcFcLK',1,'Đại học FPT','Viết nội dung',NULL,NULL,'Sinh viên Đại học FPT, chuyên sáng tạo nội dung đa kênh, SEO content và quản lý fanpage.','pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-13 21:52:20',0,NULL,1),
(8,'Bùi Đức Anh','test3@fpt.edu.vn','0399999999',NULL,'$2a$11$G5atXLsJ.zLzWzkX.0tXuOnRvnPB7uMTCc1c6R5r51mUqTK8Y6ubm',1,'Đại học FPT','Dựng video',NULL,NULL,'Sinh viên Truyền thông Đa phương tiện Đại học FPT, chuyên dựng video ngắn TikTok, Reels và Motion Graphics.','pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-13 21:55:50',0,NULL,1),
(9,'Đỗ Thu Trang','test4@fpt.edu.vn','0796854321',NULL,'$2a$11$TVeF3S3sPnv7Vmndh16sOuxOYS.//dk/AUCJlVZtZR0ivQUsYmv3W',1,'Đại học FPT','Thiết kế đồ hoạ',NULL,NULL,'Sinh viên Thiết kế Mỹ thuật số Đại học FPT, thiết kế UI/UX và minh hoạ kỹ thuật số.','pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-13 21:59:44',0,NULL,1),
(10,'Nguyễn Hải Đăng','test5@fpt.edu.vn','0327724169',NULL,'$2a$11$gMU8G7d2IptLt6W0BovvP.ZzgTgLYUeQ0xiprNeiHne.sOrhMzSiG',1,'Đại học FPT','Lập trình web',NULL,NULL,'Sinh viên Kỹ thuật phần mềm Đại học FPT, phát triển Backend API và hệ thống cơ sở dữ liệu.','pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-13 22:03:26',0,NULL,1),
(11,'skillbridge','nang14gmai.com','0309000099',NULL,'$2a$11$Hk9umhVXzYJtBpUFHZz8jefeTnHmL4WxUiIWQPpPrJWIZul5UfO82',2,NULL,NULL,NULL,NULL,NULL,'pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-17 03:58:35',0,NULL,1),
(12,'skillbridge','nang14dz@gmai.com','0334403380',NULL,'$2a$11$AkOMrkR8TJmWSX3MUx4AC.OXceSkqhYxveYEFkRLDCZiBSJFchTwu',2,NULL,NULL,NULL,NULL,NULL,'pending',NULL,NULL,NULL,'pending',100,0,NULL,NULL,'2026-08-17 04:03:17',0,NULL,1),
(13,'Đào Văn Năng','nangdvhe187101@fpt.edu.vn','0999999212','avatars/2026/09/3588f4f35f62409fa5c076f9aac11dbb.jpeg','$2a$11$DybBCNAFmNUjxNHuk/r0FOJqtTnq6CkCfsSZb2UmoxGCln95t8lp6',1,'Đại học FPT','Lập trình web',NULL,NULL,'Sinh viên Kỹ thuật phần mềm Đại học FPT, Fullstack Web Developer & Video Editor.','pending',NULL,NULL,NULL,'active',100,4,NULL,NULL,'2026-08-18 05:45:49',0,NULL,3),
(14,'Công ty 1 thành viên','nang14dz@gmail.com','0334403381','avatars/2026/09/6f8b0c42039742c794b5156b6c081dcb.jpeg','$2a$11$krsiY1QbOgvt1qTVrdfxveCder/vuUlvxBrPi.QM8HQyonH4vHZEq',2,NULL,'Công nghệ thông tin / Phần mềm',NULL,NULL,NULL,'pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-19 07:51:07',0,NULL,1),
(15,'NTD Test Company','employer_test1@skillbridge.vn','0912345678',NULL,'$2a$11$0Ccnf4LvXVf/fhaRilpuRudI9Nk5AAbe8hWQxSJzu4JDpAL71BbHm',2,NULL,NULL,NULL,NULL,NULL,'pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-31 16:19:06',0,NULL,1),
(16,'Phan Gia Huy','student_test1@fpt.edu.vn','0987112233',NULL,'$2a$11$dVXe3F.1EjGkJhTMf0V.0eL3RTjfQcl0A/xS5JlqTjD2zq8JKZwWS',1,'Đại học FPT','Dịch thuật',NULL,NULL,'Sinh viên Ngôn ngữ Anh Đại học FPT, chuyên biên dịch tài liệu công nghệ và phụ đề video.','pending',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-08-31 16:21:49',0,NULL,1),
(22,'Quản Trị Viên','skillbridge.vn@gmail.com',NULL,NULL,'$2a$11$YbTtbeohEMMZvqhttxCHj.NFtAEZm.d47eDVN4pLK7ZGI8fGXlqA6',7,NULL,NULL,NULL,NULL,NULL,'verified',NULL,NULL,NULL,'active',100,0,NULL,NULL,'2026-09-16 01:30:29',0,NULL,1),
(23,'Nguyễn Trung Hiếu','hieunthe187126@fpt.edu.vn','0373552851',NULL,'$2a$11$g4gF4GOhmkC3MXa5e6LnJOrusMkGsxqk2wa3wQQ91pcUXf7GxQCge',1,'Đại học FPT','Dựng video',NULL,NULL,'Sinh viên Đại học FPT, chuyên dựng video quảng cáo, vlog và video ca nhạc ngắn.','pending',NULL,NULL,NULL,'active',100,1,NULL,NULL,'2026-09-17 09:08:32',0,NULL,2);

-- -----------------------------------------------------
-- 5. Table structure for table `auth_tokens`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `auth_tokens`;
CREATE TABLE `auth_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_type` enum('email_verify','password_reset','password_reset_otp','refresh','withdraw_otp','change_bank_otp','login_otp','sensitive_action') COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempt_count` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '5',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_authtokens_user_type` (`user_id`,`token_type`),
  CONSTRAINT `fk_authtokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1279 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 6. Table structure for table `categories`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_revision_limit` int NOT NULL DEFAULT '2',
  `preview_strategy` enum('watermark_image','watermark_video','partial_text','sample_rows') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'watermark_image',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` VALUES 
(1,'Thiết kế đồ hoạ',2,'watermark_image'),
(2,'Viết nội dung',2,'partial_text'),
(3,'Lập trình web',3,'sample_rows'),
(4,'Dựng video',2,'watermark_video'),
(5,'Dịch thuật',1,'partial_text');

-- -----------------------------------------------------
-- 7. Table structure for table `jobs` (FULLTEXT KEY đã được lược bỏ để tương thích 100% TiDB)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employer_id` int NOT NULL,
  `category_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `budget` decimal(12,0) NOT NULL,
  `is_urgent` tinyint(1) NOT NULL DEFAULT '0',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('open','filled','in_progress','submitted','revision_requested','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `hired_applicant_id` int DEFAULT NULL,
  `escrow_amount` decimal(12,0) DEFAULT NULL,
  `revision_limit` int NOT NULL DEFAULT '2',
  `revision_count` int NOT NULL DEFAULT '0',
  `deadline_at` datetime DEFAULT NULL,
  `auto_release_at` datetime DEFAULT NULL,
  `posted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deadline_overdue_sent_at` datetime DEFAULT NULL,
  `deadline_warning_sent_at` datetime DEFAULT NULL,
  `extension_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_jobs_status_category` (`status`,`category_id`),
  KEY `idx_jobs_employer_status` (`employer_id`,`status`),
  KEY `fk_jobs_category` (`category_id`),
  KEY `fk_jobs_hired_applicant` (`hired_applicant_id`),
  KEY `idx_jobs_title` (`title`(100)),
  CONSTRAINT `fk_jobs_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_jobs_employer` FOREIGN KEY (`employer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_jobs_hired_applicant` FOREIGN KEY (`hired_applicant_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `jobs` VALUES 
(1,3,3,'Xây dựng landing page giới thiệu sản phẩm','Cần sinh viên IT xây dựng landing page responsive bằng HTML/CSS/JS, tích hợp form liên hệ.','TP.HCM (remote)',1500000,0,1,'completed',1,1500000,3,1,'2026-07-10 23:59:59','2026-07-13 23:59:59','2026-07-01 08:00:00','2026-08-10 09:02:30',NULL,NULL,0),
(2,4,2,'Viết 10 bài blog SEO cho website mỹ phẩm','Viết nội dung chuẩn SEO, mỗi bài 800-1000 từ, giọng văn trẻ trung.','Remote',800000,1,0,'in_progress',2,800000,2,0,'2026-08-20 23:59:59',NULL,'2026-08-05 10:00:00','2026-09-13 23:39:01','2026-09-13 16:38:54',NULL,0),
(3,3,1,'Thiết kế bộ nhận diện thương hiệu mini','Logo + name card + 1 mẫu banner mạng xã hội.','TP.HCM',1200000,0,0,'open',NULL,NULL,2,0,NULL,NULL,'2026-08-08 15:00:00','2026-08-10 09:02:30',NULL,NULL,0),
(4,14,3,'test 1','nhanh 1','TP.HCM',200000,0,0,'completed',13,NULL,3,0,'2026-09-05 09:32:06',NULL,'2026-09-01 10:57:18','2026-09-03 23:26:23',NULL,NULL,0),
(5,14,1,'test','nhanh','TP.HCM',100000,0,0,'completed',13,NULL,2,2,'2026-09-06 13:30:49',NULL,'2026-09-01 11:18:07','2026-09-14 00:14:56','2026-09-13 16:38:54',NULL,0),
(6,14,4,'test 2','đẹp','TP.HCM',150000,0,0,'open',NULL,NULL,2,0,NULL,NULL,'2026-09-01 11:21:10','2026-09-03 21:54:44',NULL,NULL,0),
(7,14,1,'test 3','đẹp, nhanh','TP.HCM',160000,0,0,'completed',13,NULL,2,0,'2026-09-12 10:15:08',NULL,'2026-09-01 12:45:35','2026-09-14 00:14:47','2026-09-13 16:38:54',NULL,0),
(8,14,1,'edit video','Edit video tiktok','Hà Nội',200000,1,0,'open',NULL,NULL,2,0,'2026-09-11 09:28:00',NULL,'2026-09-10 09:28:00','2026-09-10 16:28:00',NULL,NULL,0),
(9,14,3,'làm video','Đẹp','Hà Nội',300000,0,0,'open',NULL,NULL,3,0,'2026-09-19 13:10:25',NULL,'2026-09-16 13:10:25','2026-09-16 20:10:25',NULL,NULL,0),
(10,14,1,'đẹp','đẹp','Hà Nội',50000,0,0,'completed',13,NULL,2,0,'2026-09-19 13:17:16',NULL,'2026-09-16 13:16:05','2026-09-16 23:54:06',NULL,NULL,0),
(11,14,4,'edit video','đẹp','Hà Nội',50000,0,0,'completed',23,NULL,2,0,'2026-09-20 09:12:33',NULL,'2026-09-17 09:07:46','2026-09-17 16:14:28',NULL,NULL,0),
(12,14,1,'test','đẹp','TP.HCM',50000,0,0,'open',NULL,NULL,2,0,'2026-09-17 21:29:17',NULL,'2026-09-17 09:29:17','2026-09-17 16:29:17',NULL,NULL,0);

-- -----------------------------------------------------
-- 8. Table structure for table `cv_files`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `cv_files`;
CREATE TABLE `cv_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `is_searchable` tinyint(1) NOT NULL DEFAULT '1',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_cvfiles_student` (`student_id`),
  KEY `fk_cvfiles_category` (`category_id`),
  CONSTRAINT `fk_cvfiles_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_cvfiles_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cv_files` VALUES 
(1,1,'CV_NguyenVanAn_WebDev.pdf','https://cdn.skillbridge.vn/cv/CV_NguyenVanAn_WebDev.pdf','CV_NguyenVanAn_WebDev_pdf',245000,'CV Lập trình web',3,1,'2026-08-10 09:02:30','2026-08-16 16:36:54'),
(2,2,'CV_TranThiBinh_ContentWriter.pdf','https://cdn.skillbridge.vn/cv/CV_TranThiBinh_ContentWriter.pdf','CV_TranThiBinh_ContentWriter_pdf',198000,'CV Viết nội dung',2,1,'2026-08-10 09:02:30','2026-08-16 16:36:54'),
(3,13,'CV- Đào Văn Năng.pdf','https://pub-9f4720d1c4e7e8e5658ab6487e1611e7.r2.dev/cvs/2026/08/1a81ed943c85401fbe9f48187fbcc218.pdf','cvs/2026/08/1a81ed943c85401fbe9f48187fbcc218.pdf',272859,'CV_VănNăngĐào_Video Editing',1,1,'2026-08-31 17:27:24','2026-09-01 00:27:24'),
(4,13,'SkillBridge-DB-Design.docx','cvs/2026/09/6896234a0924470f85ff8ecaf11d725d.docx','cvs/2026/09/6896234a0924470f85ff8ecaf11d725d.docx',61451,'SkillBridge-DB-Design.docx',NULL,1,'2026-09-14 11:06:30','2026-09-14 18:06:30'),
(5,13,'SkillBridge_EXE201.docx','cvs/2026/09/fe1f97c69433440ba06f38246ebecbd2.docx','cvs/2026/09/fe1f97c69433440ba06f38246ebecbd2.docx',13783,'SkillBridge_EXE201.docx',NULL,1,'2026-09-14 11:06:45','2026-09-14 18:06:45'),
(6,23,'CV- Đào Văn Năng.pdf','cvs/2026/09/f788203842ca40a0825ee744cdc58a3f.pdf','cvs/2026/09/f788203842ca40a0825ee744cdc58a3f.pdf',272859,'CV_NguyenTrungHieu_Dựng video',4,1,'2026-09-17 09:09:56','2026-09-17 16:09:55');

-- -----------------------------------------------------
-- 9. Table structure for table `applications`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `applications`;
CREATE TABLE `applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `student_id` int NOT NULL,
  `cv_file_id` int DEFAULT NULL,
  `status` enum('pending','hired','submitted','completed','rejected','cancelled','awaiting_verification') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cover_letter` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_applications_job_student` (`job_id`,`student_id`),
  KEY `fk_applications_student` (`student_id`),
  KEY `fk_applications_cvfile` (`cv_file_id`),
  CONSTRAINT `fk_applications_cvfile` FOREIGN KEY (`cv_file_id`) REFERENCES `cv_files` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_applications_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_applications_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `applications` VALUES 
(1,1,1,NULL,'completed','2026-07-01 09:00:00','2026-08-10 09:02:30',NULL),
(2,2,2,NULL,'submitted','2026-08-05 11:00:00','2026-08-10 09:02:30',NULL),
(3,4,13,3,'completed','2026-09-01 10:58:04','2026-09-03 23:26:23',NULL),
(4,5,13,3,'completed','2026-09-01 11:32:05','2026-09-14 00:14:56',NULL),
(5,6,13,3,'cancelled','2026-09-01 11:45:32','2026-09-03 21:54:44',NULL),
(6,7,13,3,'completed','2026-09-09 10:14:47','2026-09-14 00:14:47',NULL),
(7,9,13,3,'pending','2026-09-16 13:10:58','2026-09-16 20:10:58',NULL),
(8,10,13,3,'completed','2026-09-16 13:16:26','2026-09-16 23:54:06',NULL),
(9,11,23,6,'completed','2026-09-17 09:09:58','2026-09-17 16:14:27',NULL),
(10,12,23,6,'pending','2026-09-17 09:29:33','2026-09-17 16:29:32',NULL);

-- -----------------------------------------------------
-- 10. Table structure for table `ad_campaigns`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `ad_campaigns`;
CREATE TABLE `ad_campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `budget` decimal(12,0) NOT NULL,
  `spent` decimal(12,0) NOT NULL DEFAULT '0',
  `last_billed_spent` decimal(12,0) NOT NULL DEFAULT '0',
  `clicks` int NOT NULL DEFAULT '0',
  `status` enum('running','paused') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'running',
  PRIMARY KEY (`id`),
  KEY `idx_adcampaigns_status_spent` (`status`,`spent`,`last_billed_spent`),
  KEY `fk_adcampaigns_business` (`business_id`),
  CONSTRAINT `fk_adcampaigns_business` FOREIGN KEY (`business_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ad_campaigns` VALUES 
(1,3,1000000,450000,450000,300,'running');

-- -----------------------------------------------------
-- 11. Table structure for table `ad_content`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `ad_content`;
CREATE TABLE `ad_content` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaign_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `sponsor_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_audience` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cta_text` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Ứng tuyển 1 chạm',
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `clicks` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_adcontent_campaign` (`campaign_id`),
  CONSTRAINT `fk_adcontent_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ad_content` VALUES 
(1,1,'Đăng ký ngay - ABC Solutions tuyển sinh viên IT','Làm việc linh hoạt theo thời gian rảnh, nhận trợ cấp hấp dẫn + cấp chứng nhận thực tập chính quy.','ABC Solutions','Sinh viên Công nghệ thông tin / Lập trình','Ứng tuyển 1 chạm qua One-Touch','approved',300,'2026-07-20 09:00:00');

-- -----------------------------------------------------
-- 12. Table structure for table `affiliate_partners`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `affiliate_partners`;
CREATE TABLE `affiliate_partners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `commission_rate` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `affiliate_partners` VALUES 
(1,'Trung tâm hỗ trợ sinh viên ĐH Bách Khoa','university_partner','approved',5.00);

-- -----------------------------------------------------
-- 13. Table structure for table `affiliate_referrals`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `affiliate_referrals`;
CREATE TABLE `affiliate_referrals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `partner_id` int NOT NULL,
  `student_id` int DEFAULT NULL,
  `status` enum('clicked','converted','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'clicked',
  `commission_amount` decimal(12,0) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `converted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_affiliatereferrals_partner` (`partner_id`),
  KEY `fk_affiliatereferrals_student` (`student_id`),
  CONSTRAINT `fk_affiliatereferrals_partner` FOREIGN KEY (`partner_id`) REFERENCES `affiliate_partners` (`id`),
  CONSTRAINT `fk_affiliatereferrals_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `affiliate_referrals` VALUES 
(1,1,1,'converted',20000,'2026-01-14 08:00:00','2026-01-15 08:00:00');

-- -----------------------------------------------------
-- 14. Table structure for table `audit_log`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor_id` int NOT NULL,
  `action_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_auditlog_actor` (`actor_id`),
  CONSTRAINT `fk_auditlog_actor` FOREIGN KEY (`actor_id`) REFERENCES `admin_team_members` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `audit_log` VALUES 
(1,1,'Duyệt job #1 \"Xây dựng landing page giới thiệu sản phẩm\"','2026-07-01 08:00:00'),
(2,3,'Giải quyết dispute #1: chấp nhận khiếu nại, giải ngân cho sinh viên','2026-08-09 15:00:05');

-- -----------------------------------------------------
-- 15. Table structure for table `bank_accounts`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bank_accounts`;
CREATE TABLE `bank_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number_encrypted` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number_mask` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_holder_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bankaccounts_user_default` (`user_id`,`is_default`),
  CONSTRAINT `fk_bankaccounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `bank_accounts` VALUES 
(1,1,'Vietcombank','ENC[9x8f7a6b5c4d3e2f1a0b]','****4321','NGUYEN VAN AN',1,1,'2026-01-16 10:00:00','2026-08-10 09:02:30','2026-08-10 09:02:30'),
(2,2,'Techcombank','ENC[1a2b3c4d5e6f7g8h9i0j]','****8765','TRAN THI BINH',1,1,'2026-02-21 11:00:00','2026-08-10 09:02:30','2026-08-10 09:02:30');

-- -----------------------------------------------------
-- 16. Table structure for table `bank_verification_requests`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bank_verification_requests`;
CREATE TABLE `bank_verification_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number_mask` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by_admin_id` int DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `bank_returned_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `PendingUserId` int GENERATED ALWAYS AS ((case when (`status` = 'Pending') then `user_id` else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bank_verif_pending_user` (`PendingUserId`),
  KEY `idx_bank_verif_status_submitted` (`status`,`submitted_at`),
  KEY `idx_bank_verif_user_status` (`user_id`,`status`),
  KEY `IX_bank_verification_requests_reviewed_by_admin_id` (`reviewed_by_admin_id`),
  CONSTRAINT `fk_bank_verif_admin` FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admin_team_members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bank_verif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `bank_verification_requests` (`id`, `user_id`, `bank_name`, `bank_code`, `account_number`, `account_number_mask`, `status`, `submitted_at`, `reviewed_at`, `reviewed_by_admin_id`, `rejection_reason`, `bank_returned_name`, `request_ip_address`) VALUES 
(1,13,'TPBank','970423','fA18qpexRK4d7ZxzNqRU2jmqxnVEu4f8P+gUq/VisD8=','****2004','Pending','2026-09-20 05:56:21',NULL,NULL,NULL,NULL,'::1');

-- -----------------------------------------------------
-- 17. Table structure for table `conversations`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `conversations`;
CREATE TABLE `conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_a_id` int NOT NULL,
  `user_b_id` int NOT NULL,
  `job_id` int DEFAULT NULL,
  `last_message_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `unread_count_user_a` int NOT NULL DEFAULT '0',
  `unread_count_user_b` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read_only` tinyint(1) NOT NULL DEFAULT '0',
  `read_only_reason` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_archived_user_a` tinyint(1) NOT NULL DEFAULT '0',
  `is_archived_user_b` tinyint(1) NOT NULL DEFAULT '0',
  `request_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `request_initiated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_conversations_pair_job` (`user_a_id`,`user_b_id`,`job_id`),
  KEY `fk_conversations_userb` (`user_b_id`),
  KEY `fk_conversations_job` (`job_id`),
  KEY `fk_conversations_requester` (`request_initiated_by`),
  CONSTRAINT `fk_conversations_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_conversations_requester` FOREIGN KEY (`request_initiated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_conversations_usera` FOREIGN KEY (`user_a_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_conversations_userb` FOREIGN KEY (`user_b_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `conversations` VALUES 
(1,1,3,1,'2026-08-21 23:08:14',0,0,'2026-07-01 09:05:00',0,NULL,0,0,'active',NULL),
(2,14,23,11,'2026-09-24 07:12:01',0,1,'2026-09-17 12:25:44',0,NULL,0,0,'active',NULL),
(3,14,13,7,'2026-09-24 14:30:20',0,0,'2026-09-17 12:26:44',0,NULL,0,0,'active',NULL);

-- -----------------------------------------------------
-- 18. Table structure for table `chat_messages`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message_text` text COLLATE utf8mb4_unicode_ci,
  `attachment_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_chatmessages_conversation` (`conversation_id`),
  KEY `fk_chatmessages_sender` (`sender_id`),
  CONSTRAINT `fk_chatmessages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`),
  CONSTRAINT `fk_chatmessages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `chat_messages` VALUES 
(1,1,3,'Chào bạn, mình đã xem hồ sơ và muốn trao đổi thêm về job landing page.',NULL,NULL,'2026-07-01 09:06:00'),
(2,1,1,'Dạ chào anh/chị, em sẵn sàng trao đổi ạ.',NULL,NULL,'2026-07-01 09:10:00'),
(3,2,14,'hello',NULL,'text','2026-09-17 12:25:59'),
(4,2,23,NULL,'https://pub-9f4720d1c4e7e8e5658ab6487e1611e7.r2.dev/chat/2/2026/09/b62b0d14d3b14c129c94b70ec4d363eb.jpeg','image','2026-09-17 12:49:56'),
(5,2,14,'bạn hãy chỉnh lại màu sáng giúp tôi',NULL,'text','2026-09-17 12:57:21'),
(6,3,13,'hello',NULL,'text','2026-09-22 13:39:47'),
(7,3,14,'chào',NULL,'text','2026-09-22 13:40:15'),
(8,3,13,'hôm nay bạn thế nào',NULL,'text','2026-09-22 13:40:46'),
(9,3,14,'tôi khỏe',NULL,'text','2026-09-22 13:40:54'),
(10,3,13,'helllo',NULL,'text','2026-09-24 01:51:38'),
(11,2,23,'chào',NULL,'text','2026-09-24 07:11:48'),
(12,2,14,'😀',NULL,'text','2026-09-24 07:12:01'),
(13,3,14,'👍',NULL,'like','2026-09-24 09:06:01'),
(14,3,13,'hi',NULL,'text','2026-09-24 14:30:20');

-- -----------------------------------------------------
-- 19. Table structure for table `job_requirements`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `job_requirements`;
CREATE TABLE `job_requirements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `requirement_text` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_jobreq_job` (`job_id`),
  CONSTRAINT `fk_jobreq_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `job_requirements` VALUES 
(1,1,'Thành thạo HTML/CSS/JavaScript thuần',1),
(2,1,'Có kinh nghiệm làm landing page responsive',2),
(3,2,'Viết được nội dung chuẩn SEO',1),
(4,3,'Biết sử dụng Illustrator hoặc Figma',1),
(8,4,'Hoàn thành đúng tiến độ cam kết',1),
(9,4,'Bàn giao sản phẩm chất lượng',2),
(10,5,'Hoàn thành đúng tiến độ cam kết',1),
(11,5,'Bàn giao sản phẩm chất lượng',2),
(12,6,'Hoàn thành đúng tiến độ cam kết',1),
(13,6,'Bàn giao sản phẩm chất lượng',2),
(14,7,'Hoàn thành đúng tiến độ cam kết',1),
(15,7,'Bàn giao sản phẩm chất lượng',2),
(16,8,'đẹp',1),
(17,9,'Hoàn thành đúng tiến độ cam kết',1),
(18,9,'Bàn giao sản phẩm chất lượng',2),
(19,10,'Hoàn thành đúng tiến độ cam kết',1),
(20,10,'Bàn giao sản phẩm chất lượng',2),
(21,11,'Hoàn thành đúng tiến độ cam kết',1),
(22,11,'Bàn giao sản phẩm chất lượng',2),
(23,12,'Hoàn thành đúng tiến độ cam kết',1),
(24,12,'Bàn giao sản phẩm chất lượng',2);

-- -----------------------------------------------------
-- 20. Table structure for table `job_attachments`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `job_attachments`;
CREATE TABLE `job_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint NOT NULL,
  `file_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_job_attachments_job` (`job_id`),
  CONSTRAINT `fk_job_attachments_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `job_attachments` VALUES 
(1,4,'760B6E1B-2DB0-464F-95F6-A5090DC5BA1D_1_105_c.jpeg','https://pub-9f4720d1c4e7e8e5658ab6487e1611e7.r2.dev/jobs/4/attachments/2026/09/dbcd4c6f1e134856b21813d64805a5b9.jpeg',261278,'image/jpeg','2026-09-01 10:57:20'),
(2,5,'EA37F993-411E-4A16-9E66-0801822FA172_1_105_c.jpeg','https://pub-9f4720d1c4e7e8e5658ab6487e1611e7.r2.dev/jobs/5/attachments/2026/09/0b2b182dcbe2448ba1c026cb02972782.jpeg',297765,'image/jpeg','2026-09-01 11:18:09'),
(3,6,'z7899768705460_ee57f9ef4e942f877038b227bb3e2756.jpeg','https://pub-9f4720d1c4e7e8e5658ab6487e1611e7.r2.dev/jobs/6/attachments/2026/09/ce0935d4bd844683bae5c9d0f148585e.jpeg',172965,'image/jpeg','2026-09-01 11:21:11'),
(4,8,'753281987_1370064141999427_4813542162278009490_n.jpeg','jobs/8/attachments/2026/09/964b1044feca4512831a3dfe20a10e3d.jpeg',149458,'image/jpeg','2026-09-10 09:28:01'),
(5,9,'SkillBridge.docx','jobs/9/attachments/2026/09/fd6ca0e418b04b90b94f851410bf780e.docx',13845,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','2026-09-16 13:10:27'),
(6,11,'SkillBridge.docx','jobs/11/attachments/2026/09/3226ef67b8b8454289162cef41a9bc3e.docx',13845,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','2026-09-17 09:07:47'),
(7,12,'SkillBridge.docx','jobs/12/attachments/2026/09/7eaf015a9378451497a96a67128495b5.docx',13845,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','2026-09-17 09:29:19');

-- -----------------------------------------------------
-- 21. Table structure for table `job_deliverables`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `job_deliverables`;
CREATE TABLE `job_deliverables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `student_id` int NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `preview_file_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `final_file_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `status` enum('submitted','revision_requested','accepted','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'submitted',
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_deliverables_job_version` (`job_id`,`version`),
  KEY `fk_deliverables_student` (`student_id`),
  CONSTRAINT `fk_deliverables_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_deliverables_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `job_deliverables` VALUES 
(1,1,1,1,'https://cdn.skillbridge.vn/preview/lp_v1_watermark.png','https://cdn.skillbridge.vn/final/lp_v1.zip',NULL,'landing_page_v1.zip','application/zip','Đã hoàn thành theo yêu cầu, đã test responsive trên mobile.','accepted','2026-07-09 20:00:00','2026-07-10 09:00:00'),
(2,5,13,1,NULL,NULL,NULL,'z7899740648445_47d982a733244eb9be815380580d98b0.jpeg','jpeg',NULL,'revision_requested','2026-09-03 15:14:33','2026-09-03 15:26:35'),
(3,5,13,2,NULL,NULL,NULL,'6:8.mp4','mp4',NULL,'submitted','2026-09-03 15:38:42',NULL),
(4,4,13,1,'job-deliverables/4/2026/09/587a3f98f90046fb954397903f758482.docx','job-deliverables/4/2026/09/587a3f98f90046fb954397903f758482.docx',NULL,'SkillBridge-DB-Design.docx','docx',NULL,'submitted','2026-09-03 15:51:37',NULL),
(5,5,13,3,NULL,NULL,NULL,'760B6E1B-2DB0-464F-95F6-A5090DC5BA1D_1_105_c.jpeg','jpeg',NULL,'revision_requested','2026-09-03 16:05:56','2026-09-07 01:31:11'),
(6,4,13,2,'job-deliverables/4/2026/09/22498867d66049b28455376bac4e9ef1.docx','job-deliverables/4/2026/09/22498867d66049b28455376bac4e9ef1.docx',NULL,'SkillBridge-DB-Design.docx','docx',NULL,'accepted','2026-09-03 16:14:01','2026-09-03 16:26:24'),
(7,5,13,4,NULL,NULL,NULL,'copy_FF6D33D5-3EA9-42F2-B68F-A03D376093ED.mov','mov',NULL,'submitted','2026-09-07 01:37:54',NULL),
(8,5,13,5,NULL,NULL,NULL,'att.s0m3rLZJdnYP4l3Zl1t3y2mptvgDN80xaQMSe_4cXR0.jpeg','jpeg',NULL,'submitted','2026-09-07 16:25:30',NULL),
(9,5,13,6,NULL,NULL,NULL,'AssDoc-SWD_Gx.docx','docx',NULL,'submitted','2026-09-07 16:28:33',NULL),
(10,5,13,7,NULL,'job-deliverables/5/2026/09/6d4a66171bc54966be1b4bd644e024c6.jpeg',NULL,'760B6E1B-2DB0-464F-95F6-A5090DC5BA1D_1_105_c.jpeg','jpeg',NULL,'accepted','2026-09-08 04:48:31','2026-09-13 17:14:56'),
(11,7,13,1,NULL,NULL,NULL,'FDown.vn_Tai_video_Facebook_720p (HD)_b34f.mp4','mp4',NULL,'submitted','2026-09-09 10:15:42',NULL),
(12,7,13,2,NULL,NULL,NULL,'FDown.vn_Tai_video_Facebook_720p__HD__b34f.mp4','mp4',NULL,'submitted','2026-09-09 10:37:19',NULL),
(13,7,13,3,NULL,NULL,NULL,'SkillBridge_Job7_v3.mp4','mp4',NULL,'submitted','2026-09-09 10:44:25',NULL),
(14,7,13,4,NULL,'job-deliverables/7/2026/09/cc433c2c830c4ee59a039304c870d28e.jpeg',NULL,'SkillBridge_Job7_v4.jpeg','jpeg',NULL,'accepted','2026-09-10 09:29:23','2026-09-13 17:14:47'),
(15,10,13,1,NULL,NULL,NULL,'SkillBridge_Job10_v1.jpeg','jpeg','nộp sản phẩm','submitted','2026-09-16 13:19:09',NULL),
(16,10,13,2,NULL,'job-deliverables/10/2026/09/e1fa3637436b40b197f30aed7d2bfb3d.docx',NULL,'SkillBridge_Job10_v2.docx','docx','nộp sản phẩm','accepted','2026-09-16 13:21:40','2026-09-16 16:54:07'),
(17,11,23,1,NULL,'job-deliverables/11/2026/09/7430df77c72347c193170232175a5495.jpeg',NULL,'SkillBridge_Job11_v1.jpeg','jpeg',NULL,'accepted','2026-09-17 09:13:07','2026-09-17 09:14:28');

-- -----------------------------------------------------
-- 22. Table structure for table `deliverable_feedback`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `deliverable_feedback`;
CREATE TABLE `deliverable_feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `deliverable_id` int NOT NULL,
  `employer_id` int NOT NULL,
  `feedback_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_delivfeedback_deliverable` (`deliverable_id`),
  KEY `fk_delivfeedback_employer` (`employer_id`),
  CONSTRAINT `fk_delivfeedback_deliverable` FOREIGN KEY (`deliverable_id`) REFERENCES `job_deliverables` (`id`),
  CONSTRAINT `fk_delivfeedback_employer` FOREIGN KEY (`employer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `deliverable_feedback` VALUES 
(1,1,3,'Sản phẩm đẹp, đúng yêu cầu, cảm ơn bạn!','2026-08-10 09:02:30'),
(2,2,14,'cần nét hơn','2026-09-03 15:26:35'),
(3,5,14,'màu không đẹp','2026-09-07 01:31:11');

-- -----------------------------------------------------
-- 23. Table structure for table `disputes`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `disputes`;
CREATE TABLE `disputes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `student_id` int NOT NULL,
  `employer_id` int NOT NULL,
  `deliverable_id` int DEFAULT NULL,
  `amount` decimal(12,0) NOT NULL,
  `filed_by` enum('student','employer') COLLATE utf8mb4_unicode_ci NOT NULL,
  `origin` enum('manual','revision_limit_exceeded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('open','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `decision` enum('accept','reject') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payout_amount` decimal(12,0) DEFAULT NULL,
  `payout_to_role` enum('student','employer') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolved_note` text COLLATE utf8mb4_unicode_ci,
  `filed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_disputes_job` (`job_id`),
  KEY `fk_disputes_student` (`student_id`),
  KEY `fk_disputes_employer` (`employer_id`),
  KEY `fk_disputes_deliverable` (`deliverable_id`),
  KEY `fk_disputes_resolvedby` (`resolved_by`),
  CONSTRAINT `fk_disputes_deliverable` FOREIGN KEY (`deliverable_id`) REFERENCES `job_deliverables` (`id`),
  CONSTRAINT `fk_disputes_employer` FOREIGN KEY (`employer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_disputes_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_disputes_resolvedby` FOREIGN KEY (`resolved_by`) REFERENCES `admin_team_members` (`id`),
  CONSTRAINT `fk_disputes_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `disputes` VALUES 
(1,2,2,4,NULL,800000,'student','manual','NTD không phản hồi sau khi nhận bài viết quá 5 ngày.','closed','accept',800000,'student','Xác minh NTD im lặng quá hạn, giải ngân cho sinh viên.','2026-08-09 09:00:00','2026-08-09 15:00:00',3);

-- -----------------------------------------------------
-- 24. Table structure for table `dispute_evidence`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `dispute_evidence`;
CREATE TABLE `dispute_evidence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dispute_id` int NOT NULL,
  `submitted_by` int NOT NULL,
  `evidence_text` text COLLATE utf8mb4_unicode_ci,
  `file_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_disputeevidence_dispute` (`dispute_id`),
  KEY `fk_disputeevidence_submitter` (`submitted_by`),
  CONSTRAINT `fk_disputeevidence_dispute` FOREIGN KEY (`dispute_id`) REFERENCES `disputes` (`id`),
  CONSTRAINT `fk_disputeevidence_submitter` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `dispute_evidence` VALUES 
(1,1,2,'Ảnh chụp màn hình cuộc trò chuyện không có phản hồi từ NTD trong 5 ngày.','https://cdn.skillbridge.vn/evidence/dispute1_chat.png','image/png','2026-08-10 09:02:30');

-- -----------------------------------------------------
-- 25. Table structure for table `featured_requests`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `featured_requests`;
CREATE TABLE `featured_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `employer_id` int NOT NULL,
  `paid_amount` decimal(12,0) NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_featuredreq_job` (`job_id`),
  KEY `fk_featuredreq_employer` (`employer_id`),
  CONSTRAINT `fk_featuredreq_employer` FOREIGN KEY (`employer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_featuredreq_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `featured_requests` VALUES 
(1,1,3,50000,'approved','2026-07-01 08:05:00',NULL);

-- -----------------------------------------------------
-- 26. Table structure for table `identity_documents`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `identity_documents`;
CREATE TABLE `identity_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `doc_type` enum('national_id','student_card','business_license','company_logo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verification_request_id` int DEFAULT NULL,
  `side` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_sha256` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purge_after` datetime DEFAULT NULL,
  `purged_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_identitydocs_user_type` (`user_id`,`doc_type`),
  KEY `idx_identitydocs_verification_request` (`verification_request_id`),
  CONSTRAINT `fk_identitydocs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `identity_documents` VALUES 
(1,1,'student_card','the_sv_an.jpg','https://cdn.skillbridge.vn/identity/the_sv_an.jpg','the_sv_an_jpg','image/jpeg',512000,'2026-08-10 09:02:30'),
(2,1,'national_id','cccd_an.jpg','https://cdn.skillbridge.vn/identity/cccd_an.jpg','cccd_an_jpg','image/jpeg',480000,'2026-08-10 09:02:30'),
(3,3,'business_license','gpkd_abc.pdf','https://cdn.skillbridge.vn/identity/gpkd_abc.pdf','gpkd_abc_pdf','application/pdf',890000,'2026-08-10 09:02:30');

-- -----------------------------------------------------
-- 27. Table structure for table `insurance_fund_claims`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `insurance_fund_claims`;
CREATE TABLE `insurance_fund_claims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `claimant_id` int NOT NULL,
  `claimant_role` enum('student','employer') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payout_amount` decimal(12,0) DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_insuranceclaims_job` (`job_id`),
  KEY `fk_insuranceclaims_claimant` (`claimant_id`),
  CONSTRAINT `fk_insuranceclaims_claimant` FOREIGN KEY (`claimant_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_insuranceclaims_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `insurance_fund_claims` VALUES 
(1,2,2,'student','Yêu cầu bồi thường từ quỹ bảo hiểm do NTD không phản hồi.',800000,'approved','2026-08-09 09:10:00',NULL);

-- -----------------------------------------------------
-- 28. Table structure for table `insurance_fund_ledger`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `insurance_fund_ledger`;
CREATE TABLE `insurance_fund_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('contribution','payout') COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_type` enum('subscription','affiliate','ad_campaign') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  `claim_id` int DEFAULT NULL,
  `dispute_id` int DEFAULT NULL,
  `amount` decimal(12,0) NOT NULL,
  `balance_after` decimal(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_insuranceledger_created` (`created_at` DESC),
  KEY `fk_insuranceledger_claim` (`claim_id`),
  KEY `fk_insuranceledger_dispute` (`dispute_id`),
  CONSTRAINT `fk_insuranceledger_claim` FOREIGN KEY (`claim_id`) REFERENCES `insurance_fund_claims` (`id`),
  CONSTRAINT `fk_insuranceledger_dispute` FOREIGN KEY (`dispute_id`) REFERENCES `disputes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `insurance_fund_ledger` VALUES 
(1,'contribution','subscription',1,NULL,NULL,29900,29900,'2026-08-01 00:00:05'),
(2,'payout',NULL,NULL,1,1,-800000,-770100,'2026-08-09 15:00:05');

-- -----------------------------------------------------
-- 29. Table structure for table `job_deadline_extensions`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `job_deadline_extensions`;
CREATE TABLE `job_deadline_extensions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `student_id` int NOT NULL,
  `additional_days` int NOT NULL,
  `current_deadline` datetime NOT NULL,
  `proposed_deadline` datetime NOT NULL,
  `reason_category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail_reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','accepted','rejected','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` datetime DEFAULT NULL,
  `responded_by_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_job_deadline_extensions_student` (`student_id`),
  KEY `idx_job_deadline_extensions_job_status` (`job_id`,`status`),
  KEY `IX_job_deadline_extensions_responded_by_user_id` (`responded_by_user_id`),
  CONSTRAINT `fk_job_deadline_extensions_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_deadline_extensions_responder` FOREIGN KEY (`responded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_job_deadline_extensions_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 30. Table structure for table `moderation_queue`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `moderation_queue`;
CREATE TABLE `moderation_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `flag_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_modqueue_job` (`job_id`),
  KEY `fk_modqueue_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_modqueue_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_modqueue_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `admin_team_members` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `moderation_queue` VALUES 
(1,3,NULL,'2026-08-10 09:02:30','approved','2026-08-08 16:00:00',2);

-- -----------------------------------------------------
-- 31. Table structure for table `notifications`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `icon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_text` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read` (`user_id`,`is_read`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `notifications` VALUES 
(1,1,'💰','Bạn vừa nhận được 1.350.000đ từ job \"Xây dựng landing page giới thiệu sản phẩm\"',NULL,1,'2026-07-10 09:05:05'),
(2,3,'⭐','Sinh viên Nguyễn Văn An vừa đánh giá bạn 5 sao',NULL,0,'2026-07-10 10:00:05'),
(3,2,'⚠️','Công việc \"Viết 10 bài blog SEO cho website mỹ phẩm\" đã quá hạn hoàn thành (06:59 21/08/2026). Vui lòng kiểm tra và liên hệ nhà tuyển dụng.','/mywork',0,'2026-09-13 16:38:55'),
(4,4,'⚠️','Công việc \"Viết 10 bài blog SEO cho website mỹ phẩm\" đã quá hạn bàn giao (06:59 21/08/2026). Vui lòng liên hệ sinh viên hoặc gửi khiếu nại nếu cần.','/jobs/2',0,'2026-09-13 16:38:58'),
(5,13,'⚠️','Công việc \"test\" đã quá hạn hoàn thành (20:30 06/09/2026). Vui lòng kiểm tra và liên hệ nhà tuyển dụng.','/mywork',0,'2026-09-13 16:39:02'),
(6,14,'⚠️','Công việc \"test\" đã quá hạn bàn giao (20:30 06/09/2026). Vui lòng liên hệ sinh viên hoặc gửi khiếu nại nếu cần.','/jobs/5',1,'2026-09-13 16:39:05'),
(7,13,'⚠️','Công việc \"test 3\" đã quá hạn hoàn thành (17:15 12/09/2026). Vui lòng kiểm tra và liên hệ nhà tuyển dụng.','/mywork',0,'2026-09-13 16:39:08'),
(8,14,'⚠️','Công việc \"test 3\" đã quá hạn bàn giao (17:15 12/09/2026). Vui lòng liên hệ sinh viên hoặc gửi khiếu nại nếu cần.','/jobs/7',1,'2026-09-13 16:39:11'),
(9,13,'🎉','Sản phẩm bàn giao cho công việc \"test 3\" đã được nghiệm thu thành công! Thù lao 144.000đ (đã trừ phí sàn 16.000đ) đã được chuyển vào ví của bạn.','/mywork',0,'2026-09-13 17:14:47'),
(10,13,'🎉','Sản phẩm bàn giao cho công việc \"test\" đã được nghiệm thu thành công! Thù lao 90.000đ (đã trừ phí sàn 10.000đ) đã được chuyển vào ví của bạn.','/mywork',0,'2026-09-13 17:14:56'),
(11,13,'🎉','Chúc mừng! Bạn đã được chọn thực hiện công việc \"đẹp\".','/mywork',0,'2026-09-16 13:17:16'),
(12,14,'📤','Sinh viên đã nộp sản phẩm bàn giao v1 cho công việc \"đẹp\".','/jobs/10/applicants',0,'2026-09-16 13:19:09'),
(13,14,'📤','Sinh viên đã nộp sản phẩm bàn giao v2 cho công việc \"đẹp\".','/jobs/10/applicants',0,'2026-09-16 13:21:40'),
(14,13,'🎉','Sản phẩm bàn giao cho công việc \"đẹp\" đã được nghiệm thu thành công! Thù lao 48.500đ (đã trừ phí sàn 1.500đ) đã được chuyển vào ví của bạn.','/mywork',0,'2026-09-16 16:54:07'),
(15,23,'🎉','Chúc mừng! Bạn đã được chọn thực hiện công việc \"edit video\".','/mywork',1,'2026-09-17 09:12:33'),
(16,14,'📤','Sinh viên đã nộp sản phẩm bàn giao v1 cho công việc \"edit video\".','/jobs/11/applicants',0,'2026-09-17 09:13:07'),
(17,23,'🎉','Sản phẩm bàn giao cho công việc \"edit video\" đã được nghiệm thu thành công! Thù lao 45.000đ (đã trừ phí sàn 5.000đ) đã được chuyển vào ví của bạn.','/mywork',1,'2026-09-17 09:14:28'),
(18,23,'star','Công ty 1 thành viên đã đánh giá 5⭐ cho bạn trong công việc \"edit video\".','/student/my-work',1,'2026-09-18 15:28:30'),
(19,13,'star','Công ty 1 thành viên đã đánh giá 5⭐ cho bạn trong công việc \"test 3\".','/student/my-work',1,'2026-09-18 23:42:22'),
(20,14,'check','Bạn đã gửi đánh giá 5⭐ cho sinh viên Dao Van Nang trong công việc \"test 3\".','/employer/jobs/7',0,'2026-09-18 23:42:22');

-- -----------------------------------------------------
-- 32. Table structure for table `payment_orders`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `payment_orders`;
CREATE TABLE `payment_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `order_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,0) NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `gateway_transaction_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raw_webhook_payload` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_orders_order_code` (`order_code`),
  UNIQUE KEY `uq_payment_orders_gateway_txn` (`gateway_transaction_id`),
  KEY `idx_payment_orders_status_expires` (`status`,`expires_at`),
  KEY `idx_payment_orders_user_created` (`user_id`,`created_at` DESC),
  CONSTRAINT `fk_paymentorders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `payment_orders` VALUES 
(1,14,'SB202609120551101465','SEPAY',200000,'expired',NULL,NULL,'2026-09-12 05:51:10','2026-09-12 06:06:10',NULL),
(2,14,'SB202609120551271459','SEPAY',20000,'expired',NULL,NULL,'2026-09-12 05:51:28','2026-09-12 06:06:28',NULL),
(3,14,'SB202609120552451466','SEPAY',200000,'expired',NULL,NULL,'2026-09-12 05:52:45','2026-09-12 06:07:45',NULL),
(4,14,'SB202609120552581494','SEPAY',10000,'expired',NULL,NULL,'2026-09-12 05:52:59','2026-09-12 06:07:59',NULL),
(5,14,'SB202609120610441475','SEPAY',10000,'paid','81144622','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-12 13:11:03\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609120610441475\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609120610441475\",\"transferAmount\":10000,\"referenceCode\":\"669V501262550406\",\"accumulated\":30061,\"id\":81144622}','2026-09-12 06:10:44','2026-09-12 06:25:44','2026-09-12 06:11:07'),
(6,14,'SB202609120613591493','SEPAY',10000,'expired',NULL,NULL,'2026-09-12 06:14:00','2026-09-12 06:29:00',NULL),
(7,14,'SB202609120651221425','SEPAY',200000,'cancelled',NULL,NULL,'2026-09-12 06:51:23','2026-09-12 07:06:23',NULL),
(8,14,'SB202609120651431427','SEPAY',10000,'paid','81153704','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-12 13:52:08\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609120651431427\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609120651431427\",\"transferAmount\":10000,\"referenceCode\":\"669V501262550449\",\"accumulated\":40061,\"id\":81153704}','2026-09-12 06:51:44','2026-09-12 07:06:44','2026-09-12 06:52:12'),
(9,14,'SB202609120709181433','SEPAY',10000,'cancelled',NULL,NULL,'2026-09-12 07:09:19','2026-09-12 07:24:19',NULL),
(10,14,'SB202609120940131471','SEPAY',200000,'cancelled',NULL,NULL,'2026-09-12 09:40:13','2026-09-12 09:55:13',NULL),
(11,14,'SB202609120940371493','SEPAY',10000,'paid','81188564','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-12 16:41:19\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609120940371493\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609120940371493\",\"transferAmount\":10000,\"referenceCode\":\"669V501262550601\",\"accumulated\":50061,\"id\":81188564}','2026-09-12 09:40:37','2026-09-12 09:55:37','2026-09-12 09:41:23'),
(12,14,'SB202609131853531451','SEPAY',49000,'cancelled',NULL,NULL,'2026-09-13 18:53:53','2026-09-13 19:08:53',NULL),
(13,14,'SB202609131901081477','SEPAY',49000,'expired',NULL,NULL,'2026-09-13 19:01:09','2026-09-13 19:16:09',NULL),
(14,14,'SB202609161312471420','SEPAY',200000,'cancelled',NULL,NULL,'2026-09-16 13:12:47','2026-09-16 13:27:47',NULL),
(15,14,'SB202609161313331462','SEPAY',10000,'paid','82289911','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-16 20:14:02\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609161313331462\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609161313331462\",\"transferAmount\":10000,\"referenceCode\":\"669V501262590929\",\"accumulated\":10000,\"id\":82289911}','2026-09-16 13:13:34','2026-09-16 13:28:34','2026-09-16 13:14:04'),
(16,14,'SB202609161316471433','SEPAY',100000,'cancelled',NULL,NULL,'2026-09-16 13:16:47','2026-09-16 13:31:47',NULL),
(17,14,'SB202609161316521436','SEPAY',10000,'paid','82290652','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-16 20:17:05\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609161316521436\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609161316521436\",\"transferAmount\":10000,\"referenceCode\":\"669V501262590931\",\"accumulated\":20000,\"id\":82290652}','2026-09-16 13:16:52','2026-09-16 13:31:52','2026-09-16 13:17:07'),
(18,14,'SB202609170911451454','SEPAY',50000,'paid','82481462','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-17 16:12:01\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609170911451454\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609170911451454\",\"transferAmount\":50000,\"referenceCode\":\"669V501262600629\",\"accumulated\":50000,\"id\":82481462}','2026-09-17 09:11:46','2026-09-17 09:26:46','2026-09-17 09:12:05'),
(19,14,'SB202609170929431493','SEPAY',50000,'expired',NULL,NULL,'2026-09-17 09:29:43','2026-09-17 09:44:43',NULL),
(20,13,'SB202609240151531388','SEPAY',20000,'expired',NULL,NULL,'2026-09-24 01:51:53','2026-09-24 02:06:53',NULL),
(21,14,'SB202609240915481494','SEPAY',200000,'expired',NULL,NULL,'2026-09-24 09:15:48','2026-09-24 09:30:48',NULL),
(22,14,'SB202609241516581464','SEPAY',100000,'expired',NULL,NULL,'2026-09-24 15:16:59','2026-09-24 15:31:59',NULL);

-- -----------------------------------------------------
-- 33. Table structure for table `permissions`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` enum('GET','POST','PUT','PATCH','DELETE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permissions` VALUES 
(1,'Xem danh sách job','jobs','GET','/api/jobs','Xem danh sách việc làm'),
(2,'Duyệt job','jobs','PATCH','/api/admin/jobs/:id/approve','Duyệt tin đăng việc làm'),
(3,'Xử lý tranh chấp','disputes','PATCH','/api/admin/disputes/:id/resolve','Giải quyết tranh chấp'),
(4,'Xem báo cáo tài chính','finance','GET','/api/admin/finance/reports','Xem báo cáo doanh thu');

-- -----------------------------------------------------
-- 34. Table structure for table `portfolio_uploads`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `portfolio_uploads`;
CREATE TABLE `portfolio_uploads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_portfolio_student` (`student_id`),
  CONSTRAINT `fk_portfolio_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `portfolio_uploads` VALUES 
(1,1,'landing_page_demo.png','image/png','https://cdn.skillbridge.vn/portfolio/landing_page_demo.png','2026-08-10 09:02:30'),
(2,2,'bai_viet_mau_seo.pdf','application/pdf','https://cdn.skillbridge.vn/portfolio/bai_viet_mau_seo.pdf','2026-08-10 09:02:30');

-- -----------------------------------------------------
-- 35. Table structure for table `receipts`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `receipts`;
CREATE TABLE `receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `student_id` int NOT NULL,
  `employer_id` int NOT NULL,
  `budget` decimal(12,0) NOT NULL,
  `commission` decimal(12,0) NOT NULL,
  `total` decimal(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_receipts_job` (`job_id`),
  KEY `fk_receipts_student` (`student_id`),
  KEY `fk_receipts_employer` (`employer_id`),
  CONSTRAINT `fk_receipts_employer` FOREIGN KEY (`employer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_receipts_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_receipts_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `receipts` VALUES 
(1,1,1,3,1500000,150000,1500000,'2026-07-10 09:05:00'),
(2,7,13,14,160000,16000,160000,'2026-09-13 17:14:47'),
(3,5,13,14,100000,10000,100000,'2026-09-13 17:14:56'),
(4,10,13,14,50000,1500,50000,'2026-09-16 16:54:02'),
(5,11,23,14,50000,5000,50000,'2026-09-17 09:14:24');

-- -----------------------------------------------------
-- 36. Table structure for table `referrals`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `referrals`;
CREATE TABLE `referrals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referrer_id` int NOT NULL,
  `referred_id` int NOT NULL,
  `status` enum('pending','completed','rewarded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reward_amount` decimal(12,0) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `rewarded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_referrals_referred` (`referred_id`),
  KEY `fk_referrals_referrer` (`referrer_id`),
  CONSTRAINT `fk_referrals_referred` FOREIGN KEY (`referred_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_referrals_referrer` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `referrals` VALUES 
(1,1,2,'rewarded',20000,'2026-02-19 08:00:00','2026-02-20 09:30:00','2026-02-21 09:00:00');

-- -----------------------------------------------------
-- 37. Table structure for table `reliability_events`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `reliability_events`;
CREATE TABLE `reliability_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `job_id` int DEFAULT NULL,
  `change_amount` int NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reliabilityevents_user_created` (`user_id`,`created_at` DESC),
  KEY `fk_reliabilityevents_job` (`job_id`),
  CONSTRAINT `fk_reliabilityevents_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_reliabilityevents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `reliability_events` VALUES 
(1,1,1,5,'Hoàn thành job đúng hạn, được đánh giá 5 sao','2026-07-10 09:05:00'),
(2,3,1,3,'Thanh toán đúng hạn, phản hồi nhanh','2026-07-10 09:05:00');

-- -----------------------------------------------------
-- 38. Table structure for table `reports`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reporter_id` int NOT NULL,
  `target_user_id` int DEFAULT NULL,
  `target_job_id` int DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','reviewed','dismissed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_targetjob` (`target_job_id`),
  KEY `fk_reports_reporter` (`reporter_id`),
  KEY `fk_reports_targetuser` (`target_user_id`),
  CONSTRAINT `fk_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_reports_targetjob` FOREIGN KEY (`target_job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_reports_targetuser` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `reports` VALUES 
(1,2,NULL,2,'Nghi vấn lừa đảo','NTD không phản hồi sau khi nhận bài, nghi ngờ quỵt tiền.','reviewed','2026-08-09 08:30:00');

-- -----------------------------------------------------
-- 39. Table structure for table `reviews`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `reviewer_id` int NOT NULL,
  `reviewee_id` int NOT NULL,
  `stars` tinyint NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_reviews_job` (`job_id`),
  KEY `fk_reviews_reviewer` (`reviewer_id`),
  KEY `fk_reviews_reviewee` (`reviewee_id`),
  CONSTRAINT `fk_reviews_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_reviews_reviewee` FOREIGN KEY (`reviewee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_reviews_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_reviews_stars` CHECK ((`stars` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `reviews` VALUES 
(1,1,3,1,5,'Sản phẩm chất lượng, giao đúng hạn, giao tiếp chuyên nghiệp.','2026-07-10 09:10:00'),
(2,1,1,3,5,'NTD thanh toán nhanh, mô tả yêu cầu rõ ràng.','2026-07-10 10:00:00'),
(3,11,14,23,5,'Sinh viên làm việc rất có trách nhiệm, đúng tiến độ và chất lượng tốt!','2026-09-18 15:28:30'),
(4,7,14,13,5,'Sinh viên làm việc rất có trách nhiệm, đúng tiến độ và chất lượng tốt!','2026-09-18 23:42:22');

-- -----------------------------------------------------
-- 40. Table structure for table `role_permissions`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `granted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `granted_by` int DEFAULT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_rolepermissions_permission` (`permission_id`),
  KEY `fk_rolepermissions_grantedby` (`granted_by`),
  CONSTRAINT `fk_rolepermissions_grantedby` FOREIGN KEY (`granted_by`) REFERENCES `admin_team_members` (`id`),
  CONSTRAINT `fk_rolepermissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`),
  CONSTRAINT `fk_rolepermissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `role_permissions` VALUES 
(3,1,'2026-08-10 09:02:30',1),
(3,2,'2026-08-10 09:02:30',1),
(3,3,'2026-08-10 09:02:30',1),
(3,4,'2026-08-10 09:02:30',1),
(4,1,'2026-08-10 09:02:30',1),
(4,2,'2026-08-10 09:02:30',1),
(5,1,'2026-08-10 09:02:30',1),
(5,3,'2026-08-10 09:02:30',1),
(6,1,'2026-08-10 09:02:30',1),
(6,4,'2026-08-10 09:02:30',1);

-- -----------------------------------------------------
-- 41. Table structure for table `saved_jobs`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `saved_jobs`;
CREATE TABLE `saved_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `job_id` int NOT NULL,
  `saved_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_saved_jobs_student_job` (`student_id`,`job_id`),
  KEY `fk_saved_jobs_student` (`student_id`),
  KEY `fk_saved_jobs_job` (`job_id`),
  CONSTRAINT `fk_saved_jobs_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_saved_jobs_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 42. Table structure for table `security_logs`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `security_logs`;
CREATE TABLE `security_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_securitylogs_user_created` (`user_id`,`created_at` DESC),
  CONSTRAINT `fk_securitylogs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `security_logs` VALUES 
(1,1,'login','113.161.1.20',NULL,'{\"city\": \"Ho Chi Minh City\", \"device\": \"iPhone 15\"}','2026-08-10 09:02:30'),
(2,1,'withdraw_request','113.161.1.20',NULL,'{\"withdrawal_request_id\": 1}','2026-08-10 09:02:30');

-- -----------------------------------------------------
-- 43. Table structure for table `skill_badges`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `skill_badges`;
CREATE TABLE `skill_badges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_skillbadges_category` (`category_id`),
  CONSTRAINT `fk_skillbadges_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `skill_badges` VALUES 
(1,'Verified Coder',3,'Đã xác minh kỹ năng lập trình qua bài test'),
(2,'Top Writer',2,'Top 10 sinh viên viết nội dung được đánh giá cao nhất tháng');

-- -----------------------------------------------------
-- 44. Table structure for table `subscription_plan_configs`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `subscription_plan_configs`;
CREATE TABLE `subscription_plan_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tagline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `badge_text` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `price_sub` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commission_rate` decimal(5,4) NOT NULL,
  `tier_rank` int NOT NULL DEFAULT '0',
  `max_active_jobs` int DEFAULT NULL,
  `max_weekly_applications` int DEFAULT NULL,
  `max_cv_files` int NOT NULL DEFAULT '5',
  `default_revision_limit` int NOT NULL DEFAULT '2',
  `free_featured_pins` int NOT NULL DEFAULT '0',
  `free_direct_invites` int NOT NULL DEFAULT '0',
  `features_json` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_popular` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subscription_plan_configs` VALUES 
(1,'FREE_STUDENT','student','Sinh Viên Cơ Bản','Khởi đầu không rủi ro','Miễn phí',0.00,'Dành cho người mới',0.1000,0,NULL,5,1,2,0,0,'[\"Phí sàn tiêu chuẩn: 10%\", \"5 đơn ứng tuyển / tuần\", \"Hồ sơ 1 bản CV cơ bản\", \"Bảo vệ quỹ tương hỗ an toàn\", \"Rút tiền tiêu chuẩn 24 – 48h\"]',1,0,'2026-09-24 12:13:20','2026-09-24 12:13:20'),
(2,'STU_STARTER','student','Sinh Viên Tích Cực','Gấp 3 cơ hội nhận việc','Khởi đầu',29000.00,'Chỉ 1.000đ / ngày',0.0800,1,NULL,15,3,2,0,0,'[\"Phí sàn giảm còn 8% (tiết kiệm ngay)\", \"15 đơn nộp hồ sơ / tuần\", \"Quản lý 3 CV chuyên ngành\", \"Huy hiệu Tích Cực\", \"Rút tiền ưu tiên trong 12h\"]',1,0,'2026-09-24 12:13:20','2026-09-24 12:13:20'),
(3,'STU_PRO','student','Freelance Pro','Lựa chọn bứt phá thu nhập','Phổ biến',49000.00,'Tiết kiệm 50% phí sàn',0.0500,2,NULL,NULL,5,2,0,0,'[\"Phí sàn siêu ưu đãi chỉ 5%\", \"Không giới hạn lượt nộp hồ sơ\", \"Ưu tiên Top 50% danh sách ứng viên\", \"Huy hiệu PRO\", \"Rút tiền siêu tốc trong 1 – 2h\"]',1,1,'2026-09-24 12:13:20','2026-09-24 12:13:20'),
(4,'STU_MASTER','student','Master Talent','Thu nhập tối đa · Đặc quyền VIP','VIP',99000.00,'Thu hồi vốn sau 1 dự án',0.0300,3,NULL,NULL,5,2,0,0,'[\"Phí sàn thấp nhất: Duy nhất 3%\", \"Ghim đơn Top 1 có viền sáng hút mắt\", \"Huy hiệu VIP Talent\", \"Đặc quyền ưu tiên phỏng vấn\", \"Rút tiền tức thì 24/7 (5 – 15 phút)\"]',1,0,'2026-09-24 12:13:20','2026-09-24 12:13:20'),
(5,'FREE_EMPLOYER','employer','Nhà tuyển dụng Cơ Bản','Tuyển dụng an toàn 100%','Miễn phí',0.00,'Cho nhu cầu tuyển việc lẻ',0.1000,0,1,NULL,5,2,0,0,'[\"01 tin tuy\\u1EC3n d\\u1EE5ng ch\\u1EA1y \\u0111\\u1ED3ng th\\u1EDDi\",\"T\\u1ED1i \\u0111a 2 l\\u1EA7n y\\u00EAu c\\u1EA7u ch\\u1EC9nh s\\u1EEDa\",\"K\\u00FD qu\\u1EF9 Escrow an to\\u00E0n 100%\",\"Nghi\\u1EC7m thu 0\\u0111 ph\\u00ED s\\u00E0n\",\"H\\u1ED7 tr\\u1EE3 tranh ch\\u1EA5p c\\u01A1 b\\u1EA3n\"]',1,0,'2026-09-24 12:13:20','2026-09-24 12:42:55'),
(6,'EMP_STARTER','employer','Tuyển Dụng Nhanh','Tăng tốc chốt nhân sự','Tuyển nhanh',49000.00,'Dành cho Shop & Cá nhân',0.1000,1,3,NULL,5,3,1,0,'[\"Tối đa 3 tin tuyển dụng đồng thời\", \"Tặng 1 lượt Ghim tin Hot (48h)\", \"Huy hiệu Đã xác thực\", \"Tăng lên 3 lần yêu cầu sửa bài\", \"Báo ứng viên mới tức thì qua App\"]',1,0,'2026-09-24 12:13:20','2026-09-24 12:13:20'),
(7,'EMP_GROWTH','employer','Doanh Nghiệp Tiêu Chuẩn','Chủ động săn sinh viên giỏi','Tăng trưởng',89000.00,'Cho Startup & Agency',0.1000,2,7,NULL,5,4,3,10,'[\"Tối đa 7 tin tuyển dụng đồng thời\", \"Tặng 3 lượt Ghim tin nổi bật\", \"Mở khóa Danh bạ Sinh viên\", \"Tặng 10 lượt mời làm việc trực tiếp\", \"Sửa bài 4 lần · Hỗ trợ ưu tiên trong 12h\"]',1,0,'2026-09-24 12:13:20','2026-09-24 12:13:20'),
(8,'EMP_VIP','employer','VIP Business Suite','Đặc quyền hút nhân tài số 1','Khuyên dùng',149000.00,'Giải pháp tuyển dụng VIP',0.0500,3,NULL,NULL,5,5,5,25,'[\"Đăng tin KHÔNG GIỚI HẠN\", \"Tặng 5 Ghim Hot + nhãn Tuyển Gấp\", \"SV làm việc chỉ chịu 5% phí sàn\", \"Tặng 25 lượt mời ứng viên VIP\", \"Huy hiệu VIP\"]',1,1,'2026-09-24 12:13:20','2026-09-24 12:13:20'),
(9,'EMP_STANDARD','employer','Nhà Tuyển Dụng Tiêu Chuẩn','Dành cho cá nhân & Shop bán lẻ','Tiết kiệm',149000.00,'tháng',0.0800,1,8,NULL,5,3,1,3,'[\"Tối đa 8 tin tuyển dụng mở cùng lúc\", \"Phí sàn giảm còn 8%\", \"Hạn mức 3 lần yêu cầu sửa đổi sản phẩm\", \"1 lượt Ghim tin Tuyển Gấp miễn phí\", \"3 lượt mời sinh viên trực tiếp\", \"Hỗ trợ duyệt tin trong 2 giờ\"]',1,0,'2026-09-24 20:23:26','2026-09-24 20:23:26'),
(10,'EMP_PRO','employer','Doanh Nghiệp Tăng Tốc','Giải pháp hoàn hảo cho SME & Agency','Khuyên Dùng',299000.00,'tháng',0.0600,2,20,NULL,5,4,3,10,'[\"Tối đa 20 tin tuyển dụng mở cùng lúc\", \"Phí sàn ưu đãi chỉ 6%\", \"Hạn mức 4 lần yêu cầu sửa bài\", \"3 lượt Ghim tin Tuyển Gấp miễn phí\", \"10 lượt mời làm việc trực tiếp\", \"Huy hiệu Doanh nghiệp uy tín\", \"Chuyên viên hỗ trợ riêng qua Zalo\"]',1,1,'2026-09-24 20:23:26','2026-09-24 20:23:26');

-- -----------------------------------------------------
-- 45. Table structure for table `subscriptions`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `plan_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_paid` decimal(12,0) NOT NULL,
  `renewal_date` date DEFAULT NULL,
  `status` enum('active','expiring','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_subscriptions_user` (`user_id`),
  CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subscriptions` VALUES 
(1,3,'Employer Pro',299000,'2026-09-01','cancelled','2026-08-01 00:00:00','2026-09-13 16:33:54'),
(2,13,'Master Talent',99000,'2026-10-16','active','2026-09-16 02:31:13','2026-09-16 09:31:12'),
(3,23,'Student Starter',29000,'2026-10-24','active','2026-09-24 07:09:27','2026-09-24 14:09:26');

-- -----------------------------------------------------
-- 46. Table structure for table `support_tickets`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `support_tickets`;
CREATE TABLE `support_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('open','resolved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `resolved_by` int DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_supporttickets_user` (`user_id`),
  KEY `fk_supporttickets_resolvedby` (`resolved_by`),
  CONSTRAINT `fk_supporttickets_resolvedby` FOREIGN KEY (`resolved_by`) REFERENCES `admin_team_members` (`id`),
  CONSTRAINT `fk_supporttickets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `support_tickets` VALUES 
(1,2,'Không rút được tiền','Em bấm rút tiền nhưng không nhận được OTP.','resolved',1,'2026-08-06 10:00:00','2026-08-06 09:00:00');

-- -----------------------------------------------------
-- 47. Table structure for table `system_config`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `config_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `system_config` VALUES 
('commission_rate','10','Tỷ lệ hoa hồng nền tảng trên mỗi job (%)'),
('cpc_price','1500','Giá mỗi click quảng cáo (VNĐ)'),
('featured_job_price','50000','Phí ghim tin tuyển dụng (VNĐ)'),
('insurance_fund_rate','10','Tỷ lệ trích quỹ bảo hiểm từ subscription (%)'),
('withdraw_fee_flat','6000','Phí rút tiền cố định mỗi lần rút (VNĐ)');

-- -----------------------------------------------------
-- 48. Table structure for table `system_settings`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 49. Table structure for table `transactions`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `type` enum('topup','withdraw_hold','withdraw_refund','withdraw_fee','subscription','escrow_hold','escrow_release','escrow_refund','commission','featured_fee','ad_spend','insurance_payout','referral_bonus') COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,0) NOT NULL,
  `sign` tinyint NOT NULL,
  `reference_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transactions_user_created` (`user_id`,`created_at` DESC),
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_transactions_sign` CHECK ((`sign` in (-(1),1)))
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `transactions` VALUES 
(1,3,'escrow_hold','Ký quỹ cho job #1 - Landing page',1500000,-1,1,'2026-07-01 08:00:05'),
(2,1,'escrow_release','Nhận thanh toán job #1 - Landing page',1350000,1,1,'2026-07-10 09:05:00'),
(3,NULL,'commission','Hoa hồng nền tảng job #1',150000,-1,1,'2026-07-10 09:05:00'),
(4,1,'withdraw_hold','Khoá tiền cho yêu cầu rút #1',300000,-1,1,'2026-07-15 10:00:00'),
(5,NULL,'withdraw_fee','Phí rút tiền yêu cầu #1',6000,-1,1,'2026-07-15 11:00:00'),
(6,14,'topup','Nạp tiền qua SEPAY (Đơn SB202609120610441475)',10000,1,5,'2026-09-12 06:11:07'),
(7,14,'topup','Nạp tiền qua SEPAY (Đơn SB202609120651431427)',10000,1,8,'2026-09-12 06:52:12'),
(8,14,'topup','Nạp tiền qua SEPAY (Đơn SB202609120940371493)',10000,1,11,'2026-09-12 09:41:23'),
(9,13,'escrow_release','Nhận thù lao giải ngân công việc #7 · test 3 (Phí sàn 10%)',144000,1,7,'2026-09-13 17:14:47'),
(10,13,'commission','Phí nền tảng (10%) · test 3',16000,-1,7,'2026-09-13 17:14:47'),
(11,13,'escrow_release','Nhận thù lao giải ngân công việc #5 · test (Phí sàn 10%)',90000,1,5,'2026-09-13 17:14:56'),
(12,13,'commission','Phí nền tảng (10%) · test',10000,-1,5,'2026-09-13 17:14:56'),
(13,13,'subscription','Đăng ký gói Master Talent (1 tháng)',99000,-1,NULL,'2026-09-16 02:31:13'),
(14,14,'topup','Nạp tiền qua SEPAY (Đơn SB202609161313331462)',10000,1,15,'2026-09-16 13:14:04'),
(15,14,'topup','Nạp tiền qua SEPAY (Đơn SB202609161316521436)',10000,1,17,'2026-09-16 13:17:07'),
(16,14,'escrow_hold','Tạm giữ Ký quỹ Escrow — Job #10 · đẹp',50000,-1,10,'2026-09-16 13:17:16'),
(17,13,'escrow_release','Nhận thù lao giải ngân công việc #10 · đẹp (Phí sàn 3%)',48500,1,10,'2026-09-16 16:54:02'),
(18,13,'commission','Phí nền tảng (3%) · đẹp',1500,-1,10,'2026-09-16 16:54:02'),
(19,14,'topup','Nạp tiền qua SEPAY (Đơn SB202609170911451454)',50000,1,18,'2026-09-17 09:12:05'),
(20,14,'escrow_hold','Tạm giữ Ký quỹ Escrow — Job #11 · edit video',50000,-1,11,'2026-09-17 09:12:33'),
(21,23,'escrow_release','Nhận thù lao giải ngân công việc #11 · edit video (Phí sàn 10%)',45000,1,11,'2026-09-17 09:14:24'),
(22,23,'commission','Phí nền tảng (10%) · edit video',5000,-1,11,'2026-09-17 09:14:24'),
(23,23,'subscription','Đăng ký gói Student Starter (1 tháng)',29000,-1,NULL,'2026-09-24 07:09:27');

-- -----------------------------------------------------
-- 50. Table structure for table `user_badges`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `user_badges`;
CREATE TABLE `user_badges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `badge_id` int NOT NULL,
  `granted_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `granted_by` int DEFAULT NULL,
  `granted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_userbadges_user` (`user_id`),
  KEY `fk_userbadges_badge` (`badge_id`),
  KEY `fk_userbadges_grantedby` (`granted_by`),
  CONSTRAINT `fk_userbadges_badge` FOREIGN KEY (`badge_id`) REFERENCES `skill_badges` (`id`),
  CONSTRAINT `fk_userbadges_grantedby` FOREIGN KEY (`granted_by`) REFERENCES `admin_team_members` (`id`),
  CONSTRAINT `fk_userbadges_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_badges` VALUES 
(1,1,1,'Hoàn thành 10 job lập trình với rating trung bình 4.8/5',1,'2026-08-10 09:02:30'),
(2,2,2,'Top writer tháng 7/2026',1,'2026-08-10 09:02:30');

-- -----------------------------------------------------
-- 51. Table structure for table `wallets`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `user_id` int NOT NULL,
  `balance` decimal(12,0) NOT NULL DEFAULT '0',
  `account_holder` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_bin` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_branch` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_linked_at` datetime(6) DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_bank_verified` tinyint(1) NOT NULL DEFAULT '0',
  `withdraw_hold_reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `withdraw_hold_until` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_wallets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `wallets` VALUES 
(1,350000,NULL,NULL,NULL,NULL,NULL,NULL,0),
(2,400000,NULL,NULL,NULL,NULL,NULL,NULL,0),
(3,5000000,NULL,NULL,NULL,NULL,NULL,NULL,0),
(4,2000000,NULL,NULL,NULL,NULL,NULL,NULL,0),
(13,183500,'DAO VAN NANG','36614042006','970423','Hà Nội','2026-09-15 15:43:34.854848','TPBank',0),
(14,0,NULL,NULL,NULL,NULL,NULL,NULL,0),
(23,16000,NULL,NULL,NULL,NULL,NULL,NULL,0);

-- -----------------------------------------------------
-- 52. Table structure for table `webhook_logs`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `webhook_logs`;
CREATE TABLE `webhook_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `http_method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `raw_payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_valid_signature` tinyint(1) NOT NULL,
  `processed_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `error_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_webhook_logs_provider_created` (`provider`,`created_at` DESC),
  KEY `idx_webhook_logs_status` (`processed_status`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `webhook_logs` VALUES 
(1,'SEPAY','POST','/api/payments/sepay-webhook','','2405:4802:1f05:a390:2cb6:9723:b27d:6cb',0,'invalid_signature','Missing Authorization header','2026-09-12 06:07:01'),
(2,'SEPAY','POST','/api/payments/sepay-webhook','{\"content\": \"SB123456\"}','2405:4802:1f05:a390:2cb6:9723:b27d:6cb',1,'unmatched','Không tìm thấy mã đơn hàng trong nội dung chuyển khoản: SB123456','2026-09-12 06:07:11'),
(3,'SEPAY','POST','/api/payments/sepay-webhook','{\"content\": \"SB123456\"}','2405:4802:1f05:a390:2cb6:9723:b27d:6cb',1,'unmatched','Không tìm thấy mã đơn hàng trong nội dung chuyển khoản: SB123456','2026-09-12 06:09:37'),
(4,'SEPAY','POST','/api/payments/sepay-webhook','{\"content\": \"SB123456\"}','2405:4802:1f05:a390:2cb6:9723:b27d:6cb',0,'invalid_signature','API Key không hợp lệ','2026-09-12 06:09:45'),
(5,'SEPAY','POST','/api/payments/sepay-webhook','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-12 13:11:03\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609120610441475\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609120610441475\",\"transferAmount\":10000,\"referenceCode\":\"669V501262550406\",\"accumulated\":30061,\"id\":81144622}','171.244.35.2',1,'success',NULL,'2026-09-12 06:11:08'),
(6,'SEPAY','POST','/api/payments/sepay-webhook','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-12 13:52:08\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609120651431427\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609120651431427\",\"transferAmount\":10000,\"referenceCode\":\"669V501262550449\",\"accumulated\":40061,\"id\":81153704}','171.244.35.2',1,'success',NULL,'2026-09-12 06:52:12'),
(7,'SEPAY','POST','/api/payments/sepay-webhook','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-12 16:41:19\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609120940371493\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609120940371493\",\"transferAmount\":10000,\"referenceCode\":\"669V501262550601\",\"accumulated\":50061,\"id\":81188564}','171.244.35.2',1,'success',NULL,'2026-09-12 09:41:23'),
(8,'SEPAY','POST','/api/payments/sepay-webhook','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-16 20:14:02\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609161313331462\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609161313331462\",\"transferAmount\":10000,\"referenceCode\":\"669V501262590929\",\"accumulated\":10000,\"id\":82289911}','171.244.35.2',1,'success',NULL,'2026-09-16 13:14:04'),
(9,'SEPAY','POST','/api/payments/sepay-webhook','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-16 20:17:05\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609161316521436\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609161316521436\",\"transferAmount\":10000,\"referenceCode\":\"669V501262590931\",\"accumulated\":20000,\"id\":82290652}','171.244.35.2',1,'success',NULL,'2026-09-16 13:17:07'),
(10,'SEPAY','POST','/api/payments/sepay-webhook','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-17 15:44:32\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"DAO VAN NANG chuyen tien\",\"transferType\":\"out\",\"description\":\"BankAPINotify DAO VAN NANG chuyen tien\",\"transferAmount\":20000,\"referenceCode\":\"066CTMB262600310\",\"accumulated\":0,\"id\":82475949}','2600:3c15::2000:8aff:fedd:874b',1,'unmatched','Giao dịch không phải tiền vào (transferType: out)','2026-09-17 08:44:35'),
(11,'SEPAY','POST','/api/payments/sepay-webhook','{\"gateway\":\"TPBank\",\"transactionDate\":\"2026-09-17 16:12:01\",\"accountNumber\":\"00000807297\",\"subAccount\":null,\"code\":null,\"content\":\"SB202609170911451454\",\"transferType\":\"in\",\"description\":\"BankAPINotify SB202609170911451454\",\"transferAmount\":50000,\"referenceCode\":\"669V501262600629\",\"accumulated\":50000,\"id\":82481462}','2600:3c15::2000:8aff:fedd:874b',1,'success',NULL,'2026-09-17 09:12:05');

-- -----------------------------------------------------
-- 53. Table structure for table `withdrawal_requests`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `withdrawal_requests`;
CREATE TABLE `withdrawal_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `bank_account_id` int NOT NULL,
  `amount` decimal(12,0) NOT NULL,
  `fee` decimal(12,0) NOT NULL DEFAULT '0',
  `net_amount` decimal(12,0) NOT NULL,
  `status` enum('pending','otp_pending','processing','completed','rejected','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `otp_token_id` int DEFAULT NULL,
  `reject_reason` text COLLATE utf8mb4_unicode_ci,
  `otp_verified_at` datetime DEFAULT NULL,
  `processed_by` int DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `transaction_id` int DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_withdrawalreq_user_status_created` (`user_id`,`status`,`created_at` DESC),
  KEY `idx_withdrawalreq_status` (`status`),
  KEY `idx_withdrawalreq_otptoken` (`otp_token_id`),
  KEY `fk_withdrawalreq_bankaccount` (`bank_account_id`),
  KEY `fk_withdrawalreq_processedby` (`processed_by`),
  KEY `fk_withdrawalreq_transaction` (`transaction_id`),
  CONSTRAINT `fk_withdrawalreq_bankaccount` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`),
  CONSTRAINT `fk_withdrawalreq_otptoken` FOREIGN KEY (`otp_token_id`) REFERENCES `auth_tokens` (`id`),
  CONSTRAINT `fk_withdrawalreq_processedby` FOREIGN KEY (`processed_by`) REFERENCES `admin_team_members` (`id`),
  CONSTRAINT `fk_withdrawalreq_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`),
  CONSTRAINT `fk_withdrawalreq_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `withdrawal_requests` VALUES 
(1,1,1,300000,6000,294000,'completed',1,NULL,'2026-07-15 10:05:00',1,'2026-07-15 11:00:00',4,'113.161.1.20','2026-07-15 10:00:00','2026-08-10 09:02:30');

-- -----------------------------------------------------
-- 54. Table structure for table `schools`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `schools`;
CREATE TABLE `schools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `domain` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schools_name` (`name`),
  KEY `idx_schools_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `schools` (`id`, `code`, `name`, `short_name`, `domain`, `is_active`) VALUES
(1, 'FPT_UNIVERSITY', 'Đại học FPT', 'FPTU', 'fpt.edu.vn', 1);

-- -----------------------------------------------------
-- 55. Table structure for table `student_verification_requests`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `student_verification_requests`;
CREATE TABLE `student_verification_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `request_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'initial',
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `school_id` int NOT NULL,
  `student_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_code_normalized` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name_on_card` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `graduation_year` smallint NOT NULL,
  `ocr_result_json` json DEFAULT NULL,
  `risk_flags_json` json DEFAULT NULL,
  `reason_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_message` text COLLATE utf8mb4_unicode_ci,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `need_info_deadline` datetime DEFAULT NULL,
  `resubmit_allowed` tinyint(1) NOT NULL DEFAULT '1',
  `resubmit_after` datetime DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by_admin_id` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `PendingUserId` int GENERATED ALWAYS AS ((case when (`status` = 'pending') then `user_id` else NULL end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_svr_pending_user` (`PendingUserId`),
  KEY `idx_svr_user` (`user_id`),
  KEY `idx_svr_school_code` (`school_id`,`student_code_normalized`),
  KEY `idx_svr_status_submitted` (`status`,`submitted_at`),
  CONSTRAINT `fk_svr_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  CONSTRAINT `fk_svr_reviewer` FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admin_team_members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_svr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 56. Table structure for table `student_profiles`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `student_profiles`;
CREATE TABLE `student_profiles` (
  `user_id` int NOT NULL,
  `school_id` int NOT NULL,
  `student_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_code_normalized` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verified_full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `graduation_year` smallint NOT NULL,
  `verified_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `source_request_id` int NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_student_profiles_school_code` (`school_id`,`student_code_normalized`),
  CONSTRAINT `fk_sp_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  CONSTRAINT `fk_sp_request` FOREIGN KEY (`source_request_id`) REFERENCES `student_verification_requests` (`id`),
  CONSTRAINT `fk_sp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 57. Table structure for table `external_logins`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `external_logins`;
CREATE TABLE `external_logins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `provider` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provider_uid` (`provider`,`provider_user_id`),
  KEY `idx_el_user` (`user_id`),
  CONSTRAINT `fk_extlogin_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
