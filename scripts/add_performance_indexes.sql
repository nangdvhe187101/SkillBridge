-- =====================================================================
-- Critical Performance Indexes
-- Dựa trên Full Project Audit Report (2026-10-17)
-- 
-- QUAN TRỌNG: Chạy script này trong off-peak hours vì tạo index
-- trên bảng lớn có thể lock table hàng phút.
-- 
-- Kiểm tra trước khi chạy:
--   SELECT COUNT(*) FROM users;     -- Nếu > 100k rows, nên chạy lúc 2-4am
--   SELECT COUNT(*) FROM jobs;      -- Tương tự
--   SELECT COUNT(*) FROM transactions;
-- =====================================================================

-- Users table: tăng tốc login, search user, filter by role/status
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_code);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);

-- Jobs table: tăng tốc job listing, filter by category + status
CREATE INDEX IF NOT EXISTS idx_jobs_category_status ON jobs(category_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_status ON jobs(employer_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);

-- Applications table: tăng tốc job applicants list, student applications
CREATE INDEX IF NOT EXISTS idx_applications_job_student ON applications(job_id, student_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_status ON applications(student_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_status_created ON applications(status, created_at DESC);

-- Transactions table: tăng tốc transaction history, admin financial reports
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_created ON transactions(transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- Wallets table: đảm bảo wallet lookup nhanh (thường đã có FK index)
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- Reviews table: tăng tốc review lookup by job/student/employer
CREATE INDEX IF NOT EXISTS idx_reviews_job ON reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student ON reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_reviews_employer ON reviews(employer_id);

-- =====================================================================
-- Kiểm tra kết quả sau khi chạy:
-- SHOW INDEX FROM users WHERE Key_name LIKE 'idx_%';
-- SHOW INDEX FROM jobs WHERE Key_name LIKE 'idx_%';
-- SHOW INDEX FROM applications WHERE Key_name LIKE 'idx_%';
-- SHOW INDEX FROM transactions WHERE Key_name LIKE 'idx_%';
-- =====================================================================
