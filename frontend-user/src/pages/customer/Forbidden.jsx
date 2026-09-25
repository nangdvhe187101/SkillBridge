import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

const ROLE_LABELS = {
  student: 'Sinh viên Freelancer',
  employer: 'Nhà tuyển dụng / Doanh nghiệp',
  recruiter: 'Nhà tuyển dụng',
  business: 'Doanh nghiệp',
  admin: 'Quản trị viên hệ thống',
  super_admin: 'Super Admin'
};

export default function Forbidden({ requiredRoles, currentRole, attemptedPath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useStore();

  const user = state.currentUser;
  const effectiveRole = (currentRole || user?.roleCode || state.role || 'guest').toLowerCase();
  const effectiveRoleName = ROLE_LABELS[effectiveRole] || (effectiveRole === 'guest' ? 'Khách (Chưa đăng nhập)' : effectiveRole);

  const targetRoles = requiredRoles && requiredRoles.length > 0 
    ? requiredRoles.map(r => ROLE_LABELS[r.toLowerCase()] || r).join(' hoặc ')
    : 'vai trò được chỉ định';

  const isStudent = effectiveRole === 'student';
  const isEmployer = effectiveRole === 'employer' || effectiveRole === 'recruiter' || effectiveRole === 'business';

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'radial-gradient(ellipse at top, rgba(239, 68, 68, 0.05) 0%, transparent 70%)'
    }}>
      <div style={{
        maxWidth: 580,
        width: '100%',
        background: 'var(--surface, #ffffff)',
        border: '1px solid var(--border, rgba(0,0,0,0.1))',
        borderRadius: 20,
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.1)',
        padding: '36px 32px',
        textAlign: 'center'
      }}>
        {/* Visual Badge / Icon */}
        <div style={{
          width: 76,
          height: 76,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          marginBottom: 20
        }}>
          <Icon name="shield-alert" width={38} height={38} />
        </div>

        {/* Status Tag */}
        <div style={{ marginBottom: 12 }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.5
          }}>
            HTTP 403 · ACCESS DENIED
          </span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          color: 'var(--ink, #111827)',
          margin: '0 0 10px 0',
          letterSpacing: -0.5
        }}>
          Giới Hạn Quyền Truy Cập
        </h1>

        <p style={{
          fontSize: 14.5,
          color: 'var(--ink-soft, #4b5563)',
          lineHeight: 1.6,
          margin: '0 0 24px 0'
        }}>
          Tài khoản của bạn hiện không có thẩm quyền truy cập vào đường dẫn{' '}
          <code style={{
            padding: '2px 6px',
            borderRadius: 6,
            background: 'var(--bg-subtle, rgba(0,0,0,0.05))',
            color: '#dc2626',
            fontSize: 13,
            fontFamily: 'monospace'
          }}>
            {attemptedPath || location.pathname}
          </code>
        </p>

        {/* Role Comparison Details Box */}
        <div style={{
          background: 'var(--bg-subtle, rgba(0,0,0,0.025))',
          border: '1px solid var(--border, rgba(0,0,0,0.08))',
          borderRadius: 14,
          padding: '16px 18px',
          marginBottom: 28,
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, fontSize: 13.5 }}>
            <span style={{ color: 'var(--ink-subtle, #6b7280)' }}>Vai trò tài khoản của bạn:</span>
            <span style={{
              fontWeight: 700,
              color: isStudent ? '#2563eb' : (isEmployer ? '#059669' : 'var(--ink)'),
              background: isStudent ? 'rgba(37, 99, 235, 0.1)' : (isEmployer ? 'rgba(5, 150, 105, 0.1)' : 'rgba(0,0,0,0.05)'),
              padding: '2px 8px',
              borderRadius: 6
            }}>
              {effectiveRoleName}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5 }}>
            <span style={{ color: 'var(--ink-subtle, #6b7280)' }}>Yêu cầu quyền truy cập:</span>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>
              {targetRoles}
            </span>
          </div>
        </div>

        {/* Smart Contextual CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isStudent && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/jobs')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Icon name="search" width={16} height={16} />
                <span>Xem danh sách việc làm phù hợp cho Sinh viên</span>
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate('/mywork')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Icon name="folder" width={16} height={16} />
                <span>Xem các dự án của tôi</span>
              </button>
            </>
          )}

          {isEmployer && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/employer/dashboard')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Icon name="layout-dashboard" width={16} height={16} />
                <span>Về Bảng điều khiển Tuyển dụng</span>
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate('/employer/post-job')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Icon name="plus" width={16} height={16} />
                <span>Đăng tin tuyển việc làm mới</span>
              </button>
            </>
          )}

          {!isStudent && !isEmployer && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Icon name="home" width={16} height={16} />
              <span>Về Trang chủ</span>
            </button>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(-1)}
              style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
            >
              <span>← Quay lại trang trước</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/contact')}
              style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
            >
              <span>Liên hệ hỗ trợ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
