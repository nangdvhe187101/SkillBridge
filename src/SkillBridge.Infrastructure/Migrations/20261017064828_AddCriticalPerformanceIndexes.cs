using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCriticalPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Critical indexes identified in audit report
            // MySQL không hỗ trợ CREATE INDEX IF NOT EXISTS, nên dùng stored procedure pattern

            migrationBuilder.Sql(@"
                -- Helper procedure để tạo index nếu chưa tồn tại
                DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
                CREATE PROCEDURE AddIndexIfNotExists(
                    IN tableName VARCHAR(128),
                    IN indexName VARCHAR(128),
                    IN indexDefinition TEXT
                )
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = tableName
                          AND index_name = indexName
                    ) THEN
                        SET @sql = indexDefinition;
                        PREPARE stmt FROM @sql;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;

                -- Users table indexes
                CALL AddIndexIfNotExists('users', 'idx_users_email',
                    'CREATE INDEX idx_users_email ON users (email)');
                CALL AddIndexIfNotExists('users', 'idx_users_phone',
                    'CREATE INDEX idx_users_phone ON users (phone_number)');
                CALL AddIndexIfNotExists('users', 'idx_users_role',
                    'CREATE INDEX idx_users_role ON users (role)');
                CALL AddIndexIfNotExists('users', 'idx_users_status',
                    'CREATE INDEX idx_users_status ON users (account_status)');

                -- Jobs table indexes
                CALL AddIndexIfNotExists('jobs', 'idx_jobs_category_status',
                    'CREATE INDEX idx_jobs_category_status ON jobs (category_id, status)');
                CALL AddIndexIfNotExists('jobs', 'idx_jobs_employer_status',
                    'CREATE INDEX idx_jobs_employer_status ON jobs (employer_id, status)');

                -- Transactions table indexes
                CALL AddIndexIfNotExists('transactions', 'idx_transactions_created',
                    'CREATE INDEX idx_transactions_created ON transactions (created_at)');
                CALL AddIndexIfNotExists('transactions', 'idx_transactions_user_type',
                    'CREATE INDEX idx_transactions_user_type ON transactions (user_id, type)');

                -- Applications table indexes (table name: applications, field: student_id)
                CALL AddIndexIfNotExists('applications', 'idx_applications_job_status',
                    'CREATE INDEX idx_applications_job_status ON applications (job_id, status)');
                CALL AddIndexIfNotExists('applications', 'idx_applications_student_status',
                    'CREATE INDEX idx_applications_student_status ON applications (student_id, status)');

                -- Student verification requests index
                CALL AddIndexIfNotExists('student_verification_requests', 'idx_verification_user_status',
                    'CREATE INDEX idx_verification_user_status ON student_verification_requests (user_id, status)');

                -- Wallets table index
                CALL AddIndexIfNotExists('wallets', 'idx_wallets_user',
                    'CREATE INDEX idx_wallets_user ON wallets (user_id)');

                -- Cleanup helper procedure
                DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback: drop all indexes (idempotent với IF EXISTS)
            migrationBuilder.Sql(@"
                DROP INDEX IF EXISTS idx_users_email ON users;
                DROP INDEX IF EXISTS idx_users_phone ON users;
                DROP INDEX IF EXISTS idx_users_role ON users;
                DROP INDEX IF EXISTS idx_users_status ON users;
                DROP INDEX IF EXISTS idx_jobs_category_status ON jobs;
                DROP INDEX IF EXISTS idx_jobs_employer_status ON jobs;
                DROP INDEX IF EXISTS idx_transactions_created ON transactions;
                DROP INDEX IF EXISTS idx_transactions_user_type ON transactions;
                DROP INDEX IF EXISTS idx_applications_job_status ON applications;
                DROP INDEX IF EXISTS idx_applications_student_status ON applications;
                DROP INDEX IF EXISTS idx_verification_user_status ON student_verification_requests;
                DROP INDEX IF EXISTS idx_wallets_user ON wallets;
            ");
        }
    }
}
