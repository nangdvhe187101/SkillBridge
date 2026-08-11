import { useState } from 'react';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import AdminUsers from '../components/admin/AdminUsers';
import AdminContent from '../components/admin/AdminContent';
import AdminDisputes from '../components/admin/AdminDisputes';
import AdminFinance from '../components/admin/AdminFinance';
import AdminPartners from '../components/admin/AdminPartners';
import AdminAnalytics from '../components/admin/AdminAnalytics';
import AdminOps from '../components/admin/AdminOps';
import AdminRoles from '../components/admin/AdminRoles';

const ROLE_MODULES = {
  super: ['users', 'content', 'disputes', 'finance', 'partners', 'analytics', 'ops', 'roles'],
  moderator: ['content'],
  dispute: ['disputes'],
  finance: ['finance'],
};
const ROLE_WHOAMI = {
  super: 'Super Admin', moderator: 'Content Moderator', dispute: 'Dispute Officer', finance: 'Finance Viewer',
};

const TABS = [
  { id: 'users', ic: '👥', label: 'Người dùng' },
  { id: 'content', ic: '🛡️', label: 'Kiểm duyệt nội dung' },
  { id: 'disputes', ic: '⚖️', label: 'Tranh chấp' },
  { id: 'finance', ic: '💰', label: 'Tài chính' },
  { id: 'partners', ic: '🤝', label: 'Đối tác & Quảng cáo' },
  { id: 'analytics', ic: '📊', label: 'Báo cáo & Phân tích' },
  { id: 'ops', ic: '🎧', label: 'Vận hành & CS' },
  { id: 'roles', ic: '🔑', label: 'Phân quyền' },
];

function AdminInner() {
  const { viewRole, setViewRole, queue, disputes, tickets } = useAdmin();
  const allowed = ROLE_MODULES[viewRole];
  const [tab, setTab] = useState(allowed[0]);
  const activeTab = allowed.includes(tab) ? tab : allowed[0];

  const counts = {
    content: queue.length,
    disputes: disputes.filter((d) => d.status === 'open').length,
    ops: tickets.filter((t) => t.status === 'open').length,
  };

  return (
    <div className="page active">
      <div className="admin-topbar">
        <div className="wrap">
          <div>
            <h1>Bảng điều khiển Quản trị SkillBridge</h1>
            <p>Đăng nhập với vai trò: {ROLE_WHOAMI[viewRole]}</p>
          </div>
          <div className="admin-role-switch">
            <span style={{ paddingLeft: 10, fontSize: 12, color: '#A9A4CC' }}>Vai trò xem thử</span>
            <select value={viewRole} onChange={(e) => setViewRole(e.target.value)}>
              <option value="super">Super Admin (toàn quyền)</option>
              <option value="moderator">Content Moderator</option>
              <option value="dispute">Dispute Officer</option>
              <option value="finance">Finance Viewer</option>
            </select>
          </div>
        </div>
      </div>

      <div className="wrap admin-shell">
        <nav className="admin-side">
          {TABS.filter((t) => allowed.includes(t.id)).map((t) => (
            <button key={t.id} className={'admin-tab' + (activeTab === t.id ? ' is-active' : '')} onClick={() => setTab(t.id)}>
              <span className="adm-ic">{t.ic}</span> {t.label}
              {counts[t.id] > 0 && <span className="adm-count">{counts[t.id]}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-main">
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'content' && <AdminContent />}
          {activeTab === 'disputes' && <AdminDisputes />}
          {activeTab === 'finance' && <AdminFinance />}
          {activeTab === 'partners' && <AdminPartners />}
          {activeTab === 'analytics' && <AdminAnalytics />}
          {activeTab === 'ops' && <AdminOps />}
          {activeTab === 'roles' && <AdminRoles />}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <AdminProvider>
      <AdminInner />
    </AdminProvider>
  );
}
