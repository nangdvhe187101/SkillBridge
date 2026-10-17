import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import AdminUsers from '../components/AdminUsers';
import AdminContent from '../components/AdminContent';
import AdminDisputes from '../components/AdminDisputes';
import AdminFinance from '../components/AdminFinance';
import AdminTransactions from '../components/AdminTransactions';
import AdminPartners from '../components/AdminPartners';
import AdminAnalytics from '../components/AdminAnalytics';
import AdminOps from '../components/AdminOps';
import AdminRoles from '../components/AdminRoles';
import AdminMessages from '../components/AdminMessages';
import AdminChat from '../components/AdminChat';
import AdminBankVerification from '../components/AdminBankVerification';
import AdminStudentVerification from '../components/AdminStudentVerification';
import AdminSchools from '../components/AdminSchools';
import AdminStudentDetail from '../components/AdminStudentDetail';
import AdminEmployerDetail from '../components/AdminEmployerDetail';
import AdminLoginAudit from '../components/AdminLoginAudit';
import AdminPlans from '../components/AdminPlans';
import AdminContracts from '../components/AdminContracts';
import IdleLockOverlay from '../components/security/IdleLockOverlay';
import TwoFactorAuthModal from '../components/security/TwoFactorAuthModal';
import Icon from '../components/Icon';
import { adminLogout } from '../api/authApi';
import { getPendingStudentVerifications, getAdminBankVerifications } from '../api/adminApi';

const ROLE_MODULES = {
  super: ['users', 'contracts', 'student-verification', 'schools', 'bank-verification', 'login-audit', 'finance', 'transactions', 'disputes', 'content', 'plans', 'analytics', 'partners', 'messages', 'support-chat', 'tickets', 'ops', 'roles'],
  super_admin: ['users', 'contracts', 'student-verification', 'schools', 'bank-verification', 'login-audit', 'finance', 'transactions', 'disputes', 'content', 'plans', 'analytics', 'partners', 'messages', 'support-chat', 'tickets', 'ops', 'roles'],
  business_admin: ['student-verification', 'schools', 'login-audit', 'content', 'plans', 'partners', 'messages', 'support-chat', 'tickets', 'analytics'],
  business: ['student-verification', 'schools', 'login-audit', 'content', 'plans', 'partners', 'messages', 'support-chat', 'tickets', 'analytics'],
  moderator: ['content', 'messages', 'support-chat', 'student-verification', 'login-audit'],
  dispute: ['contracts', 'disputes', 'messages', 'support-chat'],
  finance: ['contracts', 'finance', 'transactions', 'plans', 'bank-verification', 'support-chat'],
};

const ROLE_WHOAMI = {
  super: 'Super Admin',
  super_admin: 'Super Admin',
  business_admin: 'Business Admin',
  business: 'Business Admin',
  moderator: 'Content Moderator',
  dispute: 'Dispute Officer',
  finance: 'Finance Viewer',
};

// Cấu trúc phân nhóm Navigation chuẩn Cloudflare Dashboard
const CF_NAV_SECTIONS = [
  {
    title: 'Recents',
    items: [
      { id: 'users', path: '/users', icon: 'users', label: 'Người dùng & eKYC', sub: 'Talents & Employers' },
      { id: 'contracts', path: '/contracts', icon: 'file-text', label: 'Hợp đồng & Escrow', sub: 'Live Contracts & Escrow' },
      { id: 'finance', path: '/finance', icon: 'bank', label: 'Tài chính & Rút tiền', sub: 'Payouts & Balance' },
      { id: 'transactions', path: '/transactions', icon: 'receipt', label: 'Quản lý giao dịch', sub: 'Toàn bộ dòng tiền hệ thống' },
      { id: 'disputes', path: '/disputes', icon: 'scale', label: 'Xử lý tranh chấp', sub: 'Claims & Escrow' },
    ]
  },
  {
    title: 'Observe & Manage',
    items: [
      { id: 'tickets', path: '/tickets', icon: 'ticket', label: 'Ticket hỗ trợ (CSKH)', sub: 'Hộp thư yêu cầu & Khiếu nại' },
      { id: 'support-chat', path: '/support-chat', icon: 'chat', label: 'Tin nhắn hỗ trợ (CSKH)', sub: 'Hội thoại trực tiếp với User/NTD' },
      { id: 'student-verification', path: '/student-verification', icon: 'shield-check', label: 'Duyệt thẻ sinh viên' },
      { id: 'schools', path: '/schools', icon: 'graduation', label: 'Quản lý trường học' },
      { id: 'bank-verification', path: '/bank-verification', icon: 'shield-check', label: 'Duyệt ngân hàng' },
      { id: 'login-audit', path: '/login-audit', icon: 'shield-check', label: 'Giám sát đăng nhập', sub: 'Lịch sử phiên truy cập' },
      { id: 'content', path: '/content', icon: 'file-text', label: 'Kiểm duyệt bài đăng' },
      { id: 'messages', path: '/messages', icon: 'chat', label: 'Giám sát tin nhắn' },
      { id: 'analytics', path: '/analytics', icon: 'chart-bar', label: 'Báo cáo & Phân tích' },
    ]
  },
  {
    title: 'Build & Services',
    items: [
      { id: 'plans', path: '/plans', icon: 'star', label: 'Gói bán & Bảng giá' },
      { id: 'partners', path: '/partners', icon: 'handshake', label: 'Đối tác & Quảng cáo' },
    ]
  },
  {
    title: 'Settings & Governance',
    items: [
      { id: 'ops', path: '/ops', icon: 'headset', label: 'Vận hành & Hỗ trợ CS' },
      { id: 'roles', path: '/roles', icon: 'key', label: 'Phân quyền & URL Matrix' },
    ]
  }
];

const MODULE_TITLES = {
  users: 'Người dùng & eKYC',
  contracts: 'Giám sát Hợp đồng & Ký quỹ Escrow',
  'student-verification': 'Duyệt thẻ sinh viên & Đối soát MSSV',
  schools: 'Quản lý trường đại học/cao đẳng',
  'bank-verification': 'Duyệt tài khoản ngân hàng',
  'login-audit': 'Giám sát Đăng nhập & An ninh Tài khoản',
  finance: 'Tài chính & Lệnh rút tiền',
  transactions: 'Quản lý giao dịch',
  disputes: 'Trung tâm xử lý tranh chấp',
  content: 'Kiểm duyệt bài đăng tuyển dụng',
  'support-chat': 'Tin nhắn hỗ trợ trực tuyến (CSKH)',
  messages: 'Giám sát tin nhắn & cảnh báo',
  analytics: 'Báo cáo số liệu & phân tích',
  plans: 'Quản lý gói bán & bảng giá',
  partners: 'Đối tác liên kết & quảng cáo',
  tickets: 'Hộp Ticket hỗ trợ & Khiếu nại (CSKH)',
  ops: 'Hỗ trợ vận hành & CS Tickets',
  roles: 'Phân quyền & Ma trận bảo mật',
};

function AdminInner({ forcedTab }) {
  const { viewRole, queue, disputes, tickets, adminChats } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [badgeCounts, setBadgeCounts] = useState({
    'student-verification': 0,
    'bank-verification': 0,
  });

  const fetchBadgeCounts = useCallback(async () => {
    try {
      const [studentRes, bankRes] = await Promise.allSettled([
        getPendingStudentVerifications(),
        getAdminBankVerifications('pending', 1, 1),
      ]);

      const studentPending =
        studentRes.status === 'fulfilled' && Array.isArray(studentRes.value)
          ? studentRes.value.length
          : 0;

      const bankPending =
        bankRes.status === 'fulfilled' && bankRes.value?.total
          ? bankRes.value.total
          : (bankRes.status === 'fulfilled' && Array.isArray(bankRes.value?.items)
              ? bankRes.value.items.length
              : 0);

      setBadgeCounts({
        'student-verification': studentPending,
        'bank-verification': bankPending,
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000);
    window.addEventListener('admin-badges-refresh', fetchBadgeCounts);
    return () => {
      clearInterval(interval);
      window.removeEventListener('admin-badges-refresh', fetchBadgeCounts);
    };
  }, [fetchBadgeCounts]);

  const currentAdmin = useMemo(() => {
    try {
      const raw = localStorage.getItem('admin_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const avatarInitials = useMemo(() => {
    const name = currentAdmin?.fullName || currentAdmin?.email || 'AD';
    return name.substring(0, 2).toUpperCase();
  }, [currentAdmin]);

  const allowed = ROLE_MODULES[viewRole] || ROLE_MODULES.super;

  const currentTabId = useMemo(() => {
    if (forcedTab) return forcedTab;
    if (params.module) return params.module;
    const p = location.pathname.replace('/', '');
    if (p && allowed.includes(p)) return p;
    const queryTab = searchParams.get('tab');
    if (queryTab && allowed.includes(queryTab)) return queryTab;
    return allowed[0] || 'users';
  }, [forcedTab, params.module, location.pathname, searchParams, allowed]);

  const activeTab = allowed.includes(currentTabId) ? currentTabId : allowed[0];

  const handleTabClick = (item) => {
    setSelectedUser(null);
    navigate(item.path);
  };

  // Trang chi tiết nằm trên URL (?user=&role=) để nút Back trình duyệt / touchpad / chuột quay về danh sách,
  // F5 vẫn giữ trang chi tiết, và có thể gửi link chi tiết cho người khác
  const detailUserId = activeTab === 'users' ? Number(searchParams.get('user')) || null : null;
  const detailRole = searchParams.get('role');
  const detailInitialUser = selectedUser?.id === detailUserId ? selectedUser : null;

  // Mở chi tiết thì cuộn lên đầu; quay lại danh sách thì trả về đúng vị trí đang xem
  const listScrollY = useRef(0);
  useEffect(() => {
    window.scrollTo(0, detailUserId ? 0 : listScrollY.current);
  }, [detailUserId]);

  const openUserDetail = (u) => {
    listScrollY.current = window.scrollY;
    setSelectedUser(u);
    navigate(`/users?user=${u.id}&role=${encodeURIComponent(u.role || '')}`, { state: { fromList: true } });
  };

  const closeUserDetail = () => {
    // Mở từ danh sách thì lùi 1 bước để giữ nguyên lịch sử; mở thẳng bằng link thì thay bằng trang danh sách
    if (location.state?.fromList) navigate(-1);
    else navigate('/users', { replace: true });
  };

  return (
    <div className="cf-layout">
      {/* Tự động khóa màn hình mờ sau 15 phút không thao tác theo Q-002 */}
      <IdleLockOverlay />

      {/* Modal Cài đặt Xác thực 2 bước (Google Authenticator) */}
      <TwoFactorAuthModal isOpen={twoFactorModalOpen} onClose={() => setTwoFactorModalOpen(false)} />

      {/* Cột Sidebar bên trái (Full-Height phong cách Cloudflare) */}
      <aside className="cf-sidebar" style={{ width: isSidebarCollapsed ? 64 : 260 }}>
        {/* Brand Header */}
        <div className="cf-sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isSidebarCollapsed ? '12px 0' : '14px 16px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #0051c3, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 13,
              flexShrink: 0
            }}
          >
            ⚡
          </span>
          {!isSidebarCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#111827', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                SkillBridge
              </span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                Hệ thống Quản trị
              </span>
            </div>
          )}
        </div>

        {/* Quick Search */}
        {!isSidebarCollapsed && (
          <div className="cf-quick-search-box">
            <div className="cf-search-input-wrap">
              <span className="cf-search-icon">
                <Icon name="search" style={{ width: 14, height: 14 }} />
              </span>
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="cf-search-kbd">⌘K</span>
            </div>
          </div>
        )}

        {/* Navigation Body */}
        <div className="cf-nav-body">
          {/* Account Home Link */}
          <button
            className={`cf-nav-item ${activeTab === 'users' ? 'is-active' : ''}`}
            onClick={() => handleTabClick({ path: '/users' })}
            style={{ marginBottom: 6 }}
          >
            <div className="cf-nav-item-left">
              <Icon name="home" style={{ width: 15, height: 15, color: '#4b5563' }} />
              {!isSidebarCollapsed && <span>Account home</span>}
            </div>
          </button>

          {/* Render Sections */}
          {CF_NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => {
              const isAllowed = allowed.includes(item.id);
              const matchesSearch = !searchQuery.trim() || item.label.toLowerCase().includes(searchQuery.toLowerCase());
              return isAllowed && matchesSearch;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} style={{ marginBottom: 10 }}>
                {!isSidebarCollapsed && (
                  <div className="cf-nav-section-title">{section.title}</div>
                )}
                {visibleItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const badge = badgeCounts[item.id] || 0;

                  return (
                    <button
                      key={item.id}
                      className={`cf-nav-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleTabClick(item)}
                      title={isSidebarCollapsed ? (badge > 0 ? `${item.label} (${badge})` : item.label) : undefined}
                      style={{ position: 'relative' }}
                    >
                      <div className="cf-nav-item-left">
                        <Icon
                          name={item.icon}
                          style={{
                            width: 15,
                            height: 15,
                            color: isActive ? '#0051c3' : '#6b7280'
                          }}
                        />
                        {!isSidebarCollapsed && (
                          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                            <span>{item.label}</span>
                            {item.sub && (
                              <span style={{ fontSize: 10.5, color: '#9ca3af', fontWeight: 400 }}>
                                {item.sub}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {!isSidebarCollapsed && badge > 0 && (
                        <span className="cf-nav-badge">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}

                      {isSidebarCollapsed && badge > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 6,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: '1.5px solid #fff',
                          }}
                          title={`${badge} yêu cầu chờ duyệt`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer Collapse Button */}
        <div className="cf-sidebar-footer">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              padding: '4px 6px',
              borderRadius: 6
            }}
            title={isSidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            <span>{isSidebarCollapsed ? '▶' : '◀'}</span>
            {!isSidebarCollapsed && <span>Thu gọn</span>}
          </button>
        </div>
      </aside>

      {/* Cột nội dung chính bên phải */}
      <div className="cf-content-area">
        {/* Topbar mỏng thanh lịch */}
        <header className="cf-topbar">
          {/* Breadcrumbs chuẩn Cloudflare */}
          <div className="cf-breadcrumb">
            <span className="cf-breadcrumb-item">
              <span style={{ color: '#0051c3', fontWeight: 600 }}>SkillBridge</span>
            </span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span className="cf-breadcrumb-item">
              <Icon name="database" style={{ width: 14, height: 14, color: '#6b7280' }} />
              <span className="cf-breadcrumb-current">{MODULE_TITLES[activeTab] || activeTab}</span>
            </span>
          </div>

          {/* Right Toolbar Actions */}
          <div className="cf-topbar-actions">
            {/* Role Badge (Cố định theo tài khoản đăng nhập) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#4b5563' }}>
              <span>Vai trò:</span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 12,
                  background: viewRole === 'super' || viewRole === 'super_admin' ? '#eff6ff' : '#ecfdf5',
                  color: viewRole === 'super' || viewRole === 'super_admin' ? '#1d4ed8' : '#047857',
                  border: viewRole === 'super' || viewRole === 'super_admin' ? '1px solid #bfdbfe' : '1px solid #a7f3d0',
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {ROLE_WHOAMI[viewRole] || currentAdmin?.roleName || 'Quản trị viên'}
              </span>
            </div>

            {/* User Profile Info & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10, borderLeft: '1px solid #e5e7eb' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600
                }}
                title={currentAdmin?.email || 'Tài khoản quản trị viên'}
              >
                {avatarInitials}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: '#374151', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentAdmin?.fullName || currentAdmin?.email || 'Quản trị viên'}
              </span>
              <button
                onClick={() => setTwoFactorModalOpen(true)}
                className="cf-btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  fontSize: 12,
                  color: '#1d4ed8',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Cài đặt xác thực 2 bước Google Authenticator"
              >
                <span>🛡️</span>
                <span>Bảo mật 2FA</span>
              </button>
              <button
                onClick={adminLogout}
                className="cf-btn-secondary"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  color: '#4b5563'
                }}
                title="Đăng xuất khỏi hệ thống"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="cf-main">
          {/* Danh sách luôn được giữ (chỉ ẩn khi xem chi tiết) để quay lại không mất bộ lọc, trang, vị trí cuộn */}
          {activeTab === 'users' && (
            <div style={{ display: detailUserId ? 'none' : 'block' }}>
              <AdminUsers onViewDetail={openUserDetail} />
            </div>
          )}
          {activeTab === 'users' && (
            detailUserId && (
              detailRole === 'employer' ? (
                <AdminEmployerDetail
                  key={detailUserId}
                  userId={detailUserId}
                  initialUser={detailInitialUser}
                  onBack={closeUserDetail}
                />
              ) : (
                <AdminStudentDetail
                  key={detailUserId}
                  userId={detailUserId}
                  initialUser={detailInitialUser}
                  onBack={closeUserDetail}
                />
              )
            )
          )}
          {activeTab === 'contracts' && <AdminContracts />}
          {activeTab === 'student-verification' && <AdminStudentVerification />}
          {activeTab === 'schools' && <AdminSchools />}
          {activeTab === 'bank-verification' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>
                  Xác thực tài khoản ngân hàng
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                  Đối soát và phê duyệt / từ chối thông tin tài khoản ngân hàng thụ hưởng của sinh viên và doanh nghiệp.
                </p>
              </div>
              <AdminBankVerification />
            </div>
          )}
          {activeTab === 'login-audit' && <AdminLoginAudit />}
          {activeTab === 'finance' && <AdminFinance />}
          {activeTab === 'transactions' && <AdminTransactions />}
          {activeTab === 'disputes' && <AdminDisputes />}
          {activeTab === 'content' && <AdminContent />}
          {activeTab === 'plans' && <AdminPlans />}
          {activeTab === 'analytics' && <AdminAnalytics />}
          {activeTab === 'partners' && <AdminPartners />}
          {activeTab === 'messages' && <AdminMessages />}
          {activeTab === 'support-chat' && <AdminChat />}
          {(activeTab === 'ops' || activeTab === 'tickets') && <AdminOps />}
          {activeTab === 'roles' && <AdminRoles />}
        </main>

        {/* Footer chuẩn Cloudflare */}
        <footer className="cf-footer">
          <div className="cf-footer-links">
            <a href="#support">Support</a>
            <a href="#status">System Status</a>
            <a href="#terms">Terms of Use</a>
            <a href="#security">Report Security Issues</a>
            <a href="#privacy">Privacy Policy</a>
          </div>
          <div>
            © 2026 SkillBridge, Inc. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function Admin({ forcedTab }) {
  return (
    <AdminProvider>
      <AdminInner forcedTab={forcedTab} />
    </AdminProvider>
  );
}
