import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import AdminUsers from '../components/AdminUsers';
import AdminContent from '../components/AdminContent';
import AdminDisputes from '../components/AdminDisputes';
import AdminFinance from '../components/AdminFinance';
import AdminPartners from '../components/AdminPartners';
import AdminAnalytics from '../components/AdminAnalytics';
import AdminOps from '../components/AdminOps';
import AdminRoles from '../components/AdminRoles';
import AdminMessages from '../components/AdminMessages';
import AdminBankVerification from '../components/AdminBankVerification';
import AdminPlans from '../components/AdminPlans';
import AdminContracts from '../components/AdminContracts';
import IdleLockOverlay from '../components/security/IdleLockOverlay';
import Icon from '../components/Icon';
import { adminLogout } from '../api/authApi';

const ROLE_MODULES = {
  super: ['users', 'contracts', 'bank-verification', 'finance', 'disputes', 'content', 'plans', 'analytics', 'partners', 'messages', 'ops', 'roles'],
  moderator: ['content', 'messages'],
  dispute: ['contracts', 'disputes', 'messages'],
  finance: ['contracts', 'finance', 'plans', 'bank-verification'],
};

const ROLE_WHOAMI = {
  super: 'Super Admin',
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
      { id: 'disputes', path: '/disputes', icon: 'scale', label: 'Xử lý tranh chấp', sub: 'Claims & Escrow' },
    ]
  },
  {
    title: 'Observe & Manage',
    items: [
      { id: 'bank-verification', path: '/bank-verification', icon: 'shield-check', label: 'Duyệt ngân hàng' },
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
  'bank-verification': 'Duyệt tài khoản ngân hàng',
  finance: 'Tài chính & Lệnh rút tiền',
  disputes: 'Trung tâm xử lý tranh chấp',
  content: 'Kiểm duyệt bài đăng tuyển dụng',
  messages: 'Giám sát tin nhắn & cảnh báo',
  analytics: 'Báo cáo số liệu & phân tích',
  plans: 'Quản lý gói bán & bảng giá',
  partners: 'Đối tác liên kết & quảng cáo',
  ops: 'Hỗ trợ vận hành & CS Tickets',
  roles: 'Phân quyền & Ma trận bảo mật',
};

function AdminInner({ forcedTab }) {
  const { viewRole, setViewRole, queue, disputes, tickets, adminChats } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const counts = {
    content: queue.length,
    disputes: disputes.filter((d) => d.status === 'open').length,
    ops: tickets.filter((t) => t.status === 'open').length,
    messages: adminChats.filter((c) => c.status === 'warned').length,
  };

  const handleTabClick = (item) => {
    navigate(item.path);
  };

  return (
    <div className="cf-layout">
      {/* Tự động khóa màn hình mờ sau 15 phút không thao tác theo Q-002 */}
      <IdleLockOverlay />

      {/* Cột Sidebar bên trái (Full-Height phong cách Cloudflare) */}
      <aside className="cf-sidebar" style={{ width: isSidebarCollapsed ? 64 : 260 }}>
        {/* Account Selector Pill */}
        <div className="cf-sidebar-header">
          {!isSidebarCollapsed ? (
            <div className="cf-account-pill" title="Tài khoản Quản trị SkillBridge">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    background: '#f38020',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    flexShrink: 0
                  }}
                >
                  ⚡
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    admin@skillbridge.vn
                  </span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>SkillBridge Production</span>
                </div>
              </div>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>▲▼</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: '#f38020', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                ⚡
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
                  const count = counts[item.id] || 0;

                  return (
                    <button
                      key={item.id}
                      className={`cf-nav-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleTabClick(item)}
                      title={item.label}
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

                      {!isSidebarCollapsed && count > 0 && (
                        <span className="cf-nav-badge">{count}</span>
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
          {!isSidebarCollapsed && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>SkillBridge v2.2</span>
          )}
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
            {/* Role Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#4b5563' }}>
              <span>Vai trò:</span>
              <select
                className="cf-role-select"
                value={viewRole}
                onChange={(e) => setViewRole(e.target.value)}
                aria-label="Mô phỏng vai trò"
              >
                <option value="super">Super Admin</option>
                <option value="moderator">Content Moderator</option>
                <option value="dispute">Dispute Officer</option>
                <option value="finance">Finance Viewer</option>
              </select>
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
                title="Tài khoản quản trị viên"
              >
                AD
              </div>
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
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'contracts' && <AdminContracts />}
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
          {activeTab === 'finance' && <AdminFinance />}
          {activeTab === 'disputes' && <AdminDisputes />}
          {activeTab === 'content' && <AdminContent />}
          {activeTab === 'plans' && <AdminPlans />}
          {activeTab === 'analytics' && <AdminAnalytics />}
          {activeTab === 'partners' && <AdminPartners />}
          {activeTab === 'messages' && <AdminMessages />}
          {activeTab === 'ops' && <AdminOps />}
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
