import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Pagination from './Pagination';
import AdminModal from './AdminModal';
import { useToast } from '../context/ToastContext';
import { resolveAvatarUrl } from '../utils/avatarHelper';
import {
  getAdminUsers,
  getAdminUserStats,
  getAdminUserDetail,
  toggleLockUser,
  blacklistUser,
  removeFromBlacklist,
  adjustUserReliability,
  verifyUserKyc,
} from '../api/adminApi';

const STATUS_CONFIG = {
  active: { label: 'Đang hoạt động', dot: '#16a34a', text: '#15803d' },
  pending: { label: 'Chờ xác thực', dot: '#d97706', text: '#b45309' },
  locked: { label: 'Đã khoá', dot: '#dc2626', text: '#b91c1c' },
  blacklisted: { label: 'Blacklist', dot: '#4b5563', text: '#1f2937' },
};

function UserAvatar({ name, avatarUrl, size = 30, fontSize = 12, role = 'student' }) {
  const [imgError, setImgError] = useState(false);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const resolvedUrl = resolveAvatarUrl(avatarUrl);

  const roleStyles = {
    admin: { bg: '#eff6ff', color: '#1d4ed8' },
    employer: { bg: '#f0fdf4', color: '#15803d' },
    student: { bg: '#f9fafb', color: '#4b5563' },
  };
  const roleStyle = roleStyles[role] || roleStyles.student;

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name || 'Avatar'}
        onError={() => setImgError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid #e5e7eb',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: roleStyle.bg,
        color: roleStyle.color,
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

export default function AdminUsers() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Filter & Pagination States
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' | 'kyc' | 'blacklist'
  const [q, setQ] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);

  // Data States
  const [users, setUsers] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalUsers: 0,
    studentsCount: 0,
    employersCount: 0,
    pendingKycCount: 0,
    blacklistedCount: 0,
    averageReliability: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state: { type: 'reliability' | 'history' | 'blacklist' | 'lockConfirm', user }
  const [modal, setModal] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal form states
  const [relValue, setRelValue] = useState(0);
  const [relNote, setRelNote] = useState('');
  const [relError, setRelError] = useState('');
  const [blReason, setBlReason] = useState('');
  const [blError, setBlError] = useState('');
  const [lockReason, setLockReason] = useState('');
  const [lockError, setLockError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(q.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  // Load stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await getAdminUserStats();
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.error('Lỗi tải thống kê người dùng:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load user list
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminUsers({
        page: currentPage,
        pageSize,
        query: searchDebounce,
        role: roleF,
        status: statusF,
        subTab: activeSubTab,
      });

      if (res) {
        setUsers(res.items || []);
        setTotalItems(res.totalCount ?? res.totalItems ?? 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng:', err);
      setError(err.message || 'Không thể tải danh sách tài khoản từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchDebounce, roleF, statusF, activeSubTab]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when switching tabs or filters
  const handleTabChange = (tab) => {
    setActiveSubTab(tab);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleRoleChange = (e) => {
    setRoleF(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusF(e.target.value);
    setCurrentPage(1);
  };

  // Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Open Modals
  const openReliability = (u) => {
    setRelValue(u.reliability);
    setRelNote('');
    setRelError('');
    setModal({ type: 'reliability', user: u });
  };

  const openHistory = async (u) => {
    setModal({ type: 'history', user: u });
    setUserDetail(null);
    setDetailLoading(true);
    try {
      const detail = await getAdminUserDetail(u.id);
      setUserDetail(detail);
    } catch (err) {
      showToast(err.message || 'Không thể tải chi tiết người dùng.', 'ban');
    } finally {
      setDetailLoading(false);
    }
  };

  const openBlacklist = (u) => {
    setBlReason('');
    setBlError('');
    setModal({ type: 'blacklist', user: u });
  };

  const openLockConfirm = (u) => {
    setLockReason('');
    setLockError('');
    setModal({ type: 'lockConfirm', user: u });
  };

  // Actions
  const handleVerifyKyc = async (userId) => {
    try {
      await verifyUserKyc(userId);
      showToast('Đã phê duyệt eKYC thành công!', 'check');
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Lỗi phê duyệt eKYC.', 'ban');
    }
  };

  const handleUnblacklist = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn gỡ tài khoản này khỏi danh sách Blacklist?')) return;
    try {
      await removeFromBlacklist(userId);
      showToast('Đã gỡ khỏi Blacklist thành công!', 'check');
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Lỗi gỡ blacklist.', 'ban');
    }
  };

  const saveReliability = async () => {
    setRelError('');
    const newScore = Number(relValue);
    const originalScore = modal?.user?.reliability ?? 100;
    const delta = Math.abs(newScore - originalScore);

    // Business Rule BR-ADM-07: Max change +-20
    if (delta > 20) {
      setRelError(`Quy tắc kiểm duyệt: Điểm điều chỉnh không được vượt quá ±20 điểm/lần (Hiện tại chênh lệch ${delta} điểm).`);
      return;
    }

    if (!relNote.trim() || relNote.trim().length < 10) {
      setRelError('Căn cứ điều chỉnh bắt buộc phải nhập tối thiểu 10 ký tự để lưu vết kiểm toán.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustUserReliability(modal.user.id, newScore, relNote.trim());
      showToast('Đã cập nhật Reliability Score thành công!', 'check');
      setModal(null);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setRelError(err.message || 'Lỗi điều chỉnh điểm uy tín.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveBlacklist = async () => {
    setBlError('');
    if (!blReason.trim() || blReason.trim().length < 10) {
      setBlError('Vui lòng nêu rõ lý do vi phạm tối thiểu 10 ký tự để lưu vết vào nhật ký kiểm toán.');
      return;
    }

    setIsSubmitting(true);
    try {
      await blacklistUser(modal.user.id, blReason.trim());
      showToast('Đã đưa tài khoản vào Blacklist Board!', 'ban');
      setModal(null);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setBlError(err.message || 'Lỗi khi đưa vào Blacklist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmToggleLock = async () => {
    setLockError('');
    setIsSubmitting(true);
    try {
      await toggleLockUser(modal.user.id, lockReason.trim());
      const isLocking = modal?.user?.status !== 'locked';
      showToast(isLocking ? 'Đã khóa tài khoản và hủy các phiên đăng nhập!' : 'Đã mở khóa tài khoản thành công.', 'check');
      setModal(null);
      fetchUsers();
      fetchStats();
    } catch (err) {
      const msg = err.message || 'Lỗi thay đổi trạng thái khóa tài khoản.';
      setLockError(msg);
      showToast(msg, 'ban');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Horizontal Stats Data Cards
  const statsCards = [
    { label: 'Tổng người dùng', value: statsLoading ? '—' : stats.totalUsers, note: 'Tổng số tài khoản trong hệ thống' },
    { label: 'Sinh viên (Talents)', value: statsLoading ? '—' : stats.studentsCount, note: 'Tài khoản sinh viên tìm việc' },
    { label: 'Nhà tuyển dụng', value: statsLoading ? '—' : stats.employersCount, note: 'Doanh nghiệp & cá nhân đăng tin' },
    { label: 'Chờ duyệt eKYC', value: statsLoading ? '—' : stats.pendingKycCount, note: 'Hồ sơ chờ đối soát định danh' },
    { label: 'Blacklist vi phạm', value: statsLoading ? '—' : stats.blacklistedCount, note: 'Bị cấm vĩnh viễn do vi phạm nghiêm trọng' },
    { label: 'Reliability TB', value: statsLoading ? '—' : `${stats.averageReliability} / 100`, note: 'Điểm tín nhiệm trung bình toàn sàn' },
  ];

  return (
    <div>
      {/* Sub-tabs phẳng chuẩn Cloudflare (Objects | Metrics | Settings) */}
      <div className="cf-tabs-row">
        <button
          className={`cf-tab-btn ${activeSubTab === 'all' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          Danh sách tài khoản ({stats.totalUsers})
        </button>
        <button
          className={`cf-tab-btn ${activeSubTab === 'kyc' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('kyc')}
        >
          Chờ duyệt eKYC ({stats.pendingKycCount})
        </button>
        <button
          className={`cf-tab-btn ${activeSubTab === 'blacklist' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('blacklist')}
        >
          Blacklist vi phạm ({stats.blacklistedCount})
        </button>
      </div>

      {/* Cloudflare Horizontal Stats Row */}
      <div className="cf-stats-row">
        {statsCards.map((s) => (
          <div className="cf-stat-col" key={s.label}>
            <span className="cf-stat-lbl">
              <span>{s.label}</span>
              <span style={{ fontSize: 11, color: '#9ca3af', cursor: 'help' }} title={s.note}>ⓘ</span>
            </span>
            <span className="cf-stat-val">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Cloudflare Search & Filter Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280, maxWidth: 680 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản theo tên, email, trường học..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                outline: 'none',
                background: '#ffffff',
              }}
            />
          </div>
          {q && (
            <button
              className="cf-btn-secondary"
              onClick={() => setQ('')}
              style={{ padding: '7px 10px', fontSize: 12 }}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}

          <select
            value={roleF}
            onChange={handleRoleChange}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
              background: '#ffffff',
              color: '#374151',
            }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="student">Sinh viên</option>
            <option value="employer">Nhà tuyển dụng</option>
          </select>

          <select
            value={statusF}
            onChange={handleStatusChange}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
              background: '#ffffff',
              color: '#374151',
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="pending">Chờ xác thực</option>
            <option value="locked">Đã khoá</option>
            <option value="blacklisted">Blacklist</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: '#6b7280' }}>
            Tìm thấy <b style={{ color: '#111827' }}>{totalItems}</b> tài khoản
          </span>
          <button
            className="cf-btn-secondary"
            onClick={() => {
              fetchUsers();
              fetchStats();
            }}
            title="Làm mới dữ liệu từ máy chủ"
            style={{ padding: '6px 11px', fontSize: 12.5 }}
            disabled={loading}
          >
            ↻ Làm mới
          </button>
        </div>
      </div>

      {/* Error Alert with Retry */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 6,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={fetchUsers}
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Selected Items Action Bar */}
      {selectedIds.length > 0 && (
        <div
          style={{
            padding: '8px 14px',
            marginBottom: 12,
            borderRadius: 6,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            color: '#1e40af',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✓</span>
            <span>
              Đã chọn <b>{selectedIds.length}</b> tài khoản trên trang này
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="cf-btn-secondary"
              onClick={() => setSelectedIds([])}
              style={{ padding: '3px 10px', fontSize: 12 }}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Cloudflare Flat Data Table */}
      <div className="cf-table-container">
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite' }}>⏳</div>
            <div style={{ fontSize: 14 }}>Đang tải danh sách người dùng từ hệ thống...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
              No accounts match the current filter
            </div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc hiện tại.
            </div>
            <button
              className="cf-btn-secondary"
              onClick={() => { setQ(''); setRoleF('all'); setStatusF('all'); }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <table className="cf-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ minWidth: 260 }}>Objects (Tên / Email / SĐT)</th>
                <th style={{ minWidth: 140 }}>Role</th>
                <th style={{ minWidth: 130 }}>eKYC Status</th>
                <th style={{ minWidth: 120 }}>Reliability</th>
                <th style={{ minWidth: 140 }}>Account Status</th>
                <th style={{ minWidth: 320, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const statusConf = STATUS_CONFIG[u.status] || { label: u.status, color: '#4b5563', bg: '#f3f4f6', border: '#e5e7eb' };
                const isSelected = selectedIds.includes(u.id);

                return (
                  <tr key={u.id} style={{ background: isSelected ? '#f0fdf4' : undefined }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(u.id)}
                      />
                    </td>

                    {/* Object Name (Folder link style) */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <UserAvatar
                          name={u.name}
                          avatarUrl={u.avatarUrl}
                          size={32}
                          fontSize={12}
                          role={u.role}
                        />
                        <div>
                          <span
                            className="cf-folder-link"
                            onClick={() => openHistory(u)}
                            style={{ cursor: 'pointer', fontWeight: 600, color: '#0051c3' }}
                          >
                            {u.name}
                          </span>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                            {u.email} {u.phone ? `· ${u.phone}` : ''} {u.school && u.school !== '—' ? `· ${u.school}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                        {u.role === 'student' ? 'Sinh viên' : u.role === 'employer' ? 'Nhà tuyển dụng' : 'Quản trị viên'}
                      </span>
                    </td>

                    {/* eKYC */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          color:
                            u.kyc === 'verified'
                              ? '#15803d'
                              : u.kyc === 'pending'
                              ? '#b45309'
                              : u.kyc === 'rejected'
                              ? '#b91c1c'
                              : '#6b7280',
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ fontSize: 11 }}>
                          {u.kyc === 'verified' ? '●' : u.kyc === 'pending' ? '○' : u.kyc === 'rejected' ? '✕' : '—'}
                        </span>
                        <span>
                          {u.kyc === 'verified'
                            ? 'Đã xác thực'
                            : u.kyc === 'pending'
                            ? 'Chờ duyệt'
                            : u.kyc === 'rejected'
                            ? 'Từ chối'
                            : 'Chưa nộp'}
                        </span>
                      </span>
                    </td>

                    {/* Reliability Score */}
                    <td>
                      <button
                        onClick={() => openReliability(u)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0051c3',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        title="Bấm để điều chỉnh điểm uy tín (±20 điểm)"
                      >
                        {u.reliability}/100 ✎
                      </button>
                    </td>

                    {/* Status Tag */}
                    <td>
                      <span className="cf-status-pill">
                        <span className="cf-status-dot" style={{ background: statusConf.dot }} />
                        <span style={{ color: statusConf.text }}>{statusConf.label}</span>
                      </span>
                    </td>

                    {/* Row Actions */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <button
                          className="cf-btn-ghost"
                          onClick={() => openHistory(u)}
                          title="Xem chi tiết & lịch sử tài khoản"
                          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          Chi tiết
                        </button>

                        {u.kyc === 'pending' && (
                          <button
                            className="cf-btn-secondary"
                            onClick={() => navigate('/student-verification')}
                            style={{ padding: '3px 8px', fontSize: 12, color: '#0051c3', borderColor: '#bfdbfe', background: '#eff6ff', whiteSpace: 'nowrap', flexShrink: 0 }}
                            title="Chuyển đến màn hình Duyệt thẻ sinh viên để xem ảnh thẻ & kết quả OCR"
                          >
                            Duyệt thẻ SV ↗
                          </button>
                        )}

                        {u.status === 'blacklisted' ? (
                          <button
                            className="cf-btn-secondary"
                            onClick={() => handleUnblacklist(u.id)}
                            style={{ padding: '3px 8px', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
                            title="Gỡ khỏi danh sách đen"
                          >
                            Ân xá
                          </button>
                        ) : (
                          <div className="cf-btn-group" style={{ display: 'inline-flex', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => openLockConfirm(u)}
                              title={u.status === 'locked' ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
                              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                              {u.status === 'locked' ? 'Mở khoá' : 'Khoá'}
                            </button>
                            <button
                              onClick={() => openBlacklist(u)}
                              style={{ color: '#991b1b', whiteSpace: 'nowrap', flexShrink: 0 }}
                              title="Đưa vào danh sách đen"
                            >
                              Blacklist
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        pageSizeOptions={[10, 20, 50]}
        itemLabel="accounts"
      />

      {/* --- Accessible Modals --- */}

      {/* Modal Reliability */}
      <AdminModal
        isOpen={modal?.type === 'reliability'}
        onClose={() => setModal(null)}
        title="Điều chỉnh Điểm Uy Tín (Reliability)"
        icon="edit"
        iconColor="#0051c3"
      >
        <p style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 16 }}>
          Điều chỉnh điểm uy tín của <b>{modal?.user?.name}</b>. Điểm hiện tại: <b>{modal?.user?.reliability}/100</b>.
          <br />
          <span style={{ fontSize: 12, color: '#b45309' }}>
            ⚠️ Quy tắc kiểm duyệt BR-ADM-07: Biên độ thay đổi tối đa ±20 điểm/lần. Bắt buộc có lý do tối thiểu 10 ký tự.
          </span>
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Điểm mới (0 – 100)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={relValue}
            onChange={(e) => setRelValue(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Ghi chú căn cứ điều chỉnh <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={relNote}
            onChange={(e) => setRelNote(e.target.value)}
            placeholder="Ví dụ: Đã khắc phục lỗi hoàn chỉnh sản phẩm và bồi thường đúng cam kết..."
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }}
          />
        </div>

        {relError && (
          <div style={{ color: '#dc2626', fontSize: 12.5, marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
            ⚠️ {relError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="cf-btn-secondary" onClick={() => setModal(null)} disabled={isSubmitting}>
            Huỷ
          </button>
          <button className="cf-btn-primary" onClick={saveReliability} disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </AdminModal>

      {/* Modal Lock/Unlock */}
      <AdminModal
        isOpen={modal?.type === 'lockConfirm'}
        onClose={() => setModal(null)}
        title={modal?.user?.status === 'locked' ? 'Mở khoá tài khoản' : 'Xác nhận khoá tài khoản'}
        icon={modal?.user?.status === 'locked' ? 'check' : 'lock'}
        iconColor={modal?.user?.status === 'locked' ? '#16a34a' : '#dc2626'}
      >
        <p style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 14, lineHeight: 1.5 }}>
          {modal?.user?.status === 'locked' ? (
            <>Bạn có chắc chắn muốn mở khoá lại cho tài khoản <b>{modal?.user?.name}</b>? Người dùng này sẽ có thể đăng nhập và hoạt động bình thường.</>
          ) : (
            <>Bạn có chắc chắn muốn khoá tài khoản của <b>{modal?.user?.name}</b> ({modal?.user?.email})? Mọi phiên đăng nhập hiện tại sẽ bị thu hồi và hủy lập tức (`TokenVersion++`).</>
          )}
        </p>
        {modal?.user?.status !== 'locked' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Lý do khoá tài khoản (tuỳ chọn)
            </label>
            <textarea
              autoFocus
              value={lockReason}
              onChange={(e) => {
                setLockReason(e.target.value);
                setLockError('');
              }}
              placeholder="Ví dụ: Nghi ngờ có hành vi gian lận thanh toán, vi phạm điều khoản cộng đồng..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#111827',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}
        {lockError && (
          <div style={{ color: '#dc2626', fontSize: 12.5, marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
            ⚠️ {lockError}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="cf-btn-secondary" onClick={() => setModal(null)} disabled={isSubmitting}>
            Huỷ
          </button>
          <button
            className={modal?.user?.status === 'locked' ? 'cf-btn-primary' : 'cf-btn-secondary'}
            style={modal?.user?.status !== 'locked' ? { color: '#dc2626', borderColor: '#fca5a5' } : {}}
            onClick={confirmToggleLock}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang cập nhật...' : modal?.user?.status === 'locked' ? 'Xác nhận mở khoá' : 'Xác nhận khoá tài khoản'}
          </button>
        </div>
      </AdminModal>

      {/* Modal Blacklist */}
      <AdminModal
        isOpen={modal?.type === 'blacklist'}
        onClose={() => setModal(null)}
        title="Đưa vào Blacklist Board"
        icon="ban"
        iconColor="#dc2626"
      >
        <p style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 14 }}>
          Bạn đang đưa tài khoản <b>{modal?.user?.name}</b> ({modal?.user?.email}) vào danh sách đen vĩnh viễn. Tài khoản này sẽ bị cấm toàn diện mọi hành vi giao dịch và đăng tin.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Lý do vi phạm nghiêm trọng <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={blReason}
            onChange={(e) => { setBlReason(e.target.value); setBlError(''); }}
            placeholder="Ví dụ: Quỵt tiền lương dự án của sinh viên, giả mạo CCCD đối soát..."
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }}
          />
        </div>
        {blError && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 14 }}>⚠️ {blError}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="cf-btn-secondary" onClick={() => setModal(null)} disabled={isSubmitting}>
            Huỷ
          </button>
          <button
            className="cf-btn-secondary"
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            onClick={saveBlacklist}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Blacklist'}
          </button>
        </div>
      </AdminModal>

      {/* Modal Profile / History Detail */}
      <AdminModal
        isOpen={modal?.type === 'history'}
        onClose={() => setModal(null)}
        title="Hồ sơ & Lịch sử tài khoản"
        icon="file-text"
        iconColor="#0051c3"
      >
        {detailLoading ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>⏳</div>
            <div>Đang tải thông tin chi tiết hồ sơ...</div>
          </div>
        ) : (
          <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <UserAvatar
                name={modal?.user?.name}
                avatarUrl={userDetail?.avatarUrl || modal?.user?.avatarUrl}
                size={48}
                fontSize={18}
                role={modal?.user?.role}
              />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{modal?.user?.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{modal?.user?.email}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Số điện thoại (Unmasked)</span>
                <b>{userDetail?.unmaskedPhone || modal?.user?.phone || '—'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Số CCCD / Định danh</span>
                <b>{userDetail?.unmaskedIdCard || '—'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Vai trò hệ thống</span>
                <b>{modal?.user?.role === 'student' ? 'Sinh viên' : modal?.user?.role === 'employer' ? 'Nhà tuyển dụng' : 'Quản trị viên'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Số dư ví Escrow</span>
                <b style={{ color: '#16a34a' }}>
                  {userDetail?.walletBalance != null ? Number(userDetail.walletBalance).toLocaleString('vi-VN') + ' đ' : '0 đ'}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Trường ĐH / Tổ chức</span>
                <b>{modal?.user?.school || userDetail?.website || '—'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6b7280' }}>Xác thực eKYC</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b style={{ color: modal?.user?.kyc === 'verified' ? '#16a34a' : '#d97706' }}>
                    {modal?.user?.kyc === 'verified' ? 'Đã xác thực' : 'Chờ xác thực thẻ SV'}
                  </b>
                  {modal?.user?.kyc === 'pending' && (
                    <button
                      onClick={() => {
                        setModal(null);
                        navigate('/student-verification');
                      }}
                      style={{
                        background: '#eff6ff',
                        color: '#0051c3',
                        border: '1px solid #bfdbfe',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      title="Mở hồ sơ thẻ sinh viên để duyệt"
                    >
                      Mở duyệt thẻ SV ↗
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Reliability Score</span>
                <b style={{ color: '#0051c3' }}>{modal?.user?.reliability} / 100</b>
              </div>
            </div>

            {/* Audit History Timeline */}
            <div style={{ marginTop: 18, borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📋</span> Lịch sử kiểm toán & Thao tác quản trị
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>Ghi nhận tự động từ hệ thống</span>
              </div>

              {userDetail?.history && userDetail.history.length > 0 ? (
                <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                  {userDetail.history.map((h, i) => {
                    const isReliability = (h.action || '').toLowerCase().includes('uy tín') || (h.action || '').toLowerCase().includes('reliability');
                    const isDanger = (h.action || '').toLowerCase().includes('khóa') || (h.action || '').toLowerCase().includes('blacklist');
                    const isSuccess = (h.action || '').toLowerCase().includes('ekyc') || (h.action || '').toLowerCase().includes('mở khóa') || (h.action || '').toLowerCase().includes('xác thực');

                    const badgeStyle = isDanger
                      ? { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
                      : isSuccess
                      ? { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }
                      : isReliability
                      ? { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }
                      : { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' };

                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          padding: '8px 12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              background: badgeStyle.bg,
                              color: badgeStyle.color,
                              border: `1px solid ${badgeStyle.border}`,
                              borderRadius: 4,
                              padding: '2px 7px',
                              display: 'inline-block',
                            }}
                          >
                            {h.action}
                          </span>
                          <span style={{ color: '#9ca3af', fontSize: 11 }}>{h.time}</span>
                        </div>
                        {h.note && (
                          <div style={{ color: '#374151', fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>
                            {h.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#9ca3af', padding: '12px 0', textAlign: 'center', background: '#f9fafb', borderRadius: 6 }}>
                  Chưa có lịch sử kiểm toán cho tài khoản này.
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="cf-btn-primary" onClick={() => setModal(null)}>
            Đóng
          </button>
        </div>
      </AdminModal>
    </div>
  );
}
