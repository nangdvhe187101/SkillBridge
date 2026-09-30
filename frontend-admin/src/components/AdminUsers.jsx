import { useMemo, useState, useEffect } from 'react';
import Icon from './Icon';
import { useAdmin } from '../context/AdminContext';
import Pagination from './Pagination';
import AdminModal from './AdminModal';

const STATUS_CONFIG = {
  active: { label: 'Đang hoạt động', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)', border: 'rgba(22, 163, 74, 0.2)' },
  pending: { label: 'Chờ xác thực', color: '#d97706', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.2)' },
  locked: { label: 'Đã khoá', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
  blacklisted: { label: 'Blacklist', color: '#1f2937', bg: 'rgba(31, 41, 55, 0.1)', border: 'rgba(31, 41, 55, 0.2)' }
};

export default function AdminUsers() {
  const { users, blacklist, verifyUser, lockUser, blacklistUser, removeFromBlacklist, adjustReliability } = useAdmin();
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' | 'kyc' | 'blacklist'
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state: { type: 'reliability' | 'history' | 'blacklist' | 'lockConfirm', user }
  const [modal, setModal] = useState(null);
  const [relValue, setRelValue] = useState(0);
  const [relNote, setRelNote] = useState('');
  const [blReason, setBlReason] = useState('');
  const [blError, setBlError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, roleF, statusF, activeSubTab]);

  const list = useMemo(() => users.filter((u) => {
    const matchesTab = activeSubTab === 'all'
      ? true
      : activeSubTab === 'kyc'
      ? (u.kyc === 'pending' || u.status === 'pending')
      : u.status === 'blacklisted';

    const matchesRole = roleF === 'all' || u.role === roleF;
    const matchesStatus = statusF === 'all' || u.status === statusF;
    const matchesQuery = q === '' ||
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      (u.school && u.school.toLowerCase().includes(q.toLowerCase()));

    return matchesTab && matchesRole && matchesStatus && matchesQuery;
  }), [users, q, roleF, statusF, activeSubTab]);

  const totalPages = Math.ceil(list.length / pageSize) || 1;
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, currentPage, pageSize]);

  // Cloudflare Horizontal Stats Bar
  const stats = [
    { label: 'Tổng người dùng', value: users.length, note: 'Tài khoản hoạt động' },
    { label: 'Sinh viên (Talents)', value: users.filter((u) => u.role === 'student').length, note: 'Đã xác minh thẻ' },
    { label: 'Nhà tuyển dụng', value: users.filter((u) => u.role === 'employer').length, note: 'Doanh nghiệp / Cá nhân' },
    { label: 'Chờ duyệt eKYC', value: users.filter((u) => u.kyc === 'pending' || u.status === 'pending').length, note: 'Cần đối soát ngay' },
    { label: 'Reliability TB', value: '88.5 / 100', note: 'Điểm tín nhiệm hệ thống' },
  ];

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(pagedList.map((u) => u.id));
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

  const openReliability = (u) => {
    setRelValue(u.reliability);
    setRelNote('');
    setModal({ type: 'reliability', user: u });
  };

  const openHistory = (u) => setModal({ type: 'history', user: u });

  const openBlacklist = (u) => {
    setBlReason('');
    setBlError('');
    setModal({ type: 'blacklist', user: u });
  };

  const openLockConfirm = (u) => {
    setModal({ type: 'lockConfirm', user: u });
  };

  const saveReliability = async () => {
    setIsSubmitting(true);
    try {
      await adjustReliability(modal.user.id, Number(relValue), relNote.trim());
      setModal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveBlacklist = async () => {
    if (!blReason.trim()) {
      setBlError('Vui lòng nhập lý do cụ thể để lưu vết vào nhật ký kiểm duyệt.');
      return;
    }
    setIsSubmitting(true);
    try {
      await blacklistUser(modal.user.id, blReason.trim());
      setModal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmToggleLock = async () => {
    setIsSubmitting(true);
    try {
      await lockUser(modal.user.id);
      setModal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Sub-tabs phẳng chuẩn Cloudflare (Objects | Metrics | Settings) */}
      <div className="cf-tabs-row">
        <button
          className={`cf-tab-btn ${activeSubTab === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveSubTab('all')}
        >
          Danh sách tài khoản ({users.length})
        </button>
        <button
          className={`cf-tab-btn ${activeSubTab === 'kyc' ? 'is-active' : ''}`}
          onClick={() => setActiveSubTab('kyc')}
        >
          Chờ duyệt eKYC ({users.filter((u) => u.kyc === 'pending' || u.status === 'pending').length})
        </button>
        <button
          className={`cf-tab-btn ${activeSubTab === 'blacklist' ? 'is-active' : ''}`}
          onClick={() => setActiveSubTab('blacklist')}
        >
          Blacklist vi phạm ({blacklist.length})
        </button>
      </div>

      {/* Cloudflare Horizontal Stats Row (Hàng chỉ số ngang đặc trưng) */}
      <div className="cf-stats-row">
        {stats.map((s) => (
          <div className="cf-stat-col" key={s.label}>
            <span className="cf-stat-lbl">
              <span>{s.label}</span>
              <span style={{ fontSize: 11, color: '#9ca3af', cursor: 'help' }} title={s.note}>ⓘ</span>
            </span>
            <span className="cf-stat-val">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Cloudflare Search Objects Toolbar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 540 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search accounts by name, email, university..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
            </div>
            <button
              className="cf-btn-secondary"
              onClick={() => {}}
              style={{ padding: '7px 14px' }}
            >
              <span>🔍</span>
              <span>Search</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={roleF}
              onChange={(e) => setRoleF(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                background: '#ffffff',
                color: '#374151'
              }}
            >
              <option value="all">All Roles (Tất cả vai trò)</option>
              <option value="student">Sinh viên</option>
              <option value="employer">Nhà tuyển dụng</option>
            </select>

            <select
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                background: '#ffffff',
                color: '#374151'
              }}
            >
              <option value="all">All Statuses (Tất cả trạng thái)</option>
              <option value="active">Đang hoạt động</option>
              <option value="pending">Chờ xác thực</option>
              <option value="locked">Đã khoá</option>
              <option value="blacklisted">Blacklist</option>
            </select>
          </div>
        </div>

        {/* Path Breadcrumb & Actions Bar */}
        <div className="cf-action-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#374151' }}>
            <span style={{ fontWeight: 600 }}>skillbridge-users /</span>
            <button
              onClick={() => navigator.clipboard?.writeText('skillbridge-users')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 12 }}
              title="Copy path"
            >
              📋
            </button>
            <span style={{ fontSize: 12.5, color: '#6b7280', marginLeft: 8 }}>
              ({list.length} accounts found)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="cf-btn-secondary"
              onClick={() => alert('Xuất danh sách tài khoản')}
              title="Tải bảng tính Excel"
            >
              <span>📥</span>
              <span>Export</span>
            </button>

            <button
              className="cf-btn-primary"
              onClick={() => alert('Tạo tài khoản mới')}
            >
              <span>+</span>
              <span>Add account</span>
            </button>

            <button
              className="cf-btn-secondary"
              onClick={() => { setQ(''); setRoleF('all'); setStatusF('all'); }}
              title="Làm mới dữ liệu"
              style={{ padding: '7px 10px' }}
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* Cloudflare Flat Data Table */}
      <div className="cf-table-container">
        {pagedList.length === 0 ? (
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
                    checked={selectedIds.length === pagedList.length && pagedList.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ minWidth: 260 }}>Objects (Tên / Email)</th>
                <th style={{ minWidth: 140 }}>Role</th>
                <th style={{ minWidth: 130 }}>eKYC Status</th>
                <th style={{ minWidth: 120 }}>Reliability</th>
                <th style={{ minWidth: 140 }}>Account Status</th>
                <th style={{ minWidth: 180, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.map((u) => {
                const statusConf = STATUS_CONFIG[u.status] || { label: u.status, color: '#4b5563', bg: '#f3f4f6' };
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
                        <span style={{ fontSize: 18, color: '#0051c3' }}>
                          {u.role === 'employer' ? '🏢' : '👤'}
                        </span>
                        <div>
                          <span
                            className="cf-folder-link"
                            onClick={() => openHistory(u)}
                          >
                            {u.name}
                          </span>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                            {u.email} {u.school && u.school !== '—' ? `· ${u.school}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                        {u.role === 'student' ? 'Sinh viên' : 'Nhà tuyển dụng'}
                      </span>
                    </td>

                    {/* eKYC */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: u.kyc === 'verified' ? '#16a34a' : '#d97706',
                          fontWeight: 500
                        }}
                      >
                        <span>{u.kyc === 'verified' ? '✓' : '⏳'}</span>
                        <span>{u.kyc === 'verified' ? 'Verified' : 'Pending'}</span>
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
                          padding: 0
                        }}
                        title="Bấm để sửa điểm uy tín"
                      >
                        {u.reliability}/100 ✎
                      </button>
                    </td>

                    {/* Status Tag */}
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: statusConf.color,
                          background: statusConf.bg,
                          border: `1px solid ${statusConf.border}`
                        }}
                      >
                        {statusConf.label}
                      </span>
                    </td>

                    {/* Row Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {u.kyc !== 'verified' && (
                          <button
                            className="cf-btn-secondary"
                            onClick={() => verifyUser(u.id)}
                            style={{ padding: '3px 8px', fontSize: 12, color: '#16a34a' }}
                            title="Duyệt eKYC"
                          >
                            ✓ Duyệt
                          </button>
                        )}

                        <button
                          className="cf-btn-secondary"
                          onClick={() => openLockConfirm(u)}
                          style={{
                            padding: '3px 8px',
                            fontSize: 12,
                            color: u.status === 'locked' ? '#16a34a' : '#dc2626'
                          }}
                          title={u.status === 'locked' ? 'Mở khoá' : 'Khoá tài khoản'}
                        >
                          {u.status === 'locked' ? 'Mở khoá' : 'Khoá'}
                        </button>

                        <button
                          className="cf-btn-secondary"
                          onClick={() => openBlacklist(u)}
                          style={{ padding: '3px 8px', fontSize: 12 }}
                          title="Tùy chọn khác"
                        >
                          •••
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Drag and Drop Zone chuẩn Cloudflare */}
        <div
          style={{
            padding: '22px 16px',
            textAlign: 'center',
            fontSize: 13,
            color: '#6b7280',
            borderTop: '1px dashed #e5e7eb',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <span>☁️</span>
          <span>Drag and drop CSV/Excel to import accounts or sync university batches</span>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={list.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 20, 50]}
        itemLabel="accounts"
      />

      {/* --- Accessible Modals --- */}
      <AdminModal
        isOpen={modal?.type === 'reliability'}
        onClose={() => setModal(null)}
        title="Điều chỉnh Điểm Uy Tín (Reliability)"
        icon="edit"
        iconColor="#0051c3"
      >
        <p style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 16 }}>
          Điều chỉnh điểm uy tín của <b>{modal?.user?.name}</b> khi có khiếu nại hoặc đối soát lại. Điểm hiện tại: <b>{modal?.user?.reliability}/100</b>.
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
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Ghi chú căn cứ điều chỉnh
          </label>
          <textarea
            value={relNote}
            onChange={(e) => setRelNote(e.target.value)}
            placeholder="Ví dụ: Đã bồi thường và hoàn tất sản phẩm đúng cam kết..."
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }}
          />
        </div>
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
        <p style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 20, lineHeight: 1.5 }}>
          {modal?.user?.status === 'locked' ? (
            <>Bạn có chắc chắn muốn mở khoá lại cho tài khoản <b>{modal?.user?.name}</b>? Người dùng này sẽ có thể đăng nhập và hoạt động bình thường.</>
          ) : (
            <>Bạn có chắc chắn muốn khoá tài khoản của <b>{modal?.user?.name}</b> ({modal?.user?.email})? Tài khoản sẽ bị đình chỉ quyền đăng nhập và giao dịch trên sàn.</>
          )}
        </p>
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
          Bạn đang đưa tài khoản <b>{modal?.user?.name}</b> ({modal?.user?.email}) vào danh sách đen. Tài khoản này sẽ bị khoá quyền ứng tuyển và đăng tin.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Lý do vi phạm <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={blReason}
            onChange={(e) => { setBlReason(e.target.value); setBlError(''); }}
            placeholder="Ví dụ: Quỵt tiền sinh viên sau khi nhận sản phẩm hoàn chỉnh, không phản hồi..."
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

      {/* Modal Profile / History */}
      <AdminModal
        isOpen={modal?.type === 'history'}
        onClose={() => setModal(null)}
        title="Hồ sơ & Chi tiết tài khoản"
        icon="file-text"
        iconColor="#0051c3"
      >
        <div style={{ padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0051c3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
              {modal?.user?.name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{modal?.user?.name}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{modal?.user?.email}</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Vai trò</span>
              <b>{modal?.user?.role === 'student' ? 'Sinh viên' : 'Nhà tuyển dụng'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Trường ĐH / Tổ chức</span>
              <b>{modal?.user?.school || '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Xác thực eKYC</span>
              <b style={{ color: modal?.user?.kyc === 'verified' ? '#16a34a' : '#d97706' }}>
                {modal?.user?.kyc === 'verified' ? 'Đã xác thực' : 'Chờ xác thực'}
              </b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Reliability Score</span>
              <b style={{ color: '#0051c3' }}>{modal?.user?.reliability} / 100</b>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="cf-btn-primary" onClick={() => setModal(null)}>
            Đóng
          </button>
        </div>
      </AdminModal>
    </div>
  );
}
