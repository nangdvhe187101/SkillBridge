import { useMemo, useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Pagination from '../Pagination';

const STATUS_LABEL = {
  active: 'Đang hoạt động',
  pending: 'Chờ xác thực',
  locked: 'Đã khoá',
  blacklisted: 'Blacklist'
};

const STATUS_STYLE = {
  active: { background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.2)' },
  pending: { background: 'rgba(234, 179, 8, 0.1)', color: '#d97706', border: '1px solid rgba(234, 179, 8, 0.2)' },
  locked: { background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)' },
  blacklisted: { background: 'rgba(0, 0, 0, 0.15)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' },
};

const KYC_LABEL = {
  verified: '✓ Đã xác thực',
  pending: '⏳ Chờ duyệt'
};

export default function AdminUsers() {
  const { users, blacklist, verifyUser, lockUser, blacklistUser, removeFromBlacklist, adjustReliability } = useAdmin();
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [modal, setModal] = useState(null); // { type: 'reliability'|'history'|'blacklist', user }
  const [relValue, setRelValue] = useState(0);
  const [relNote, setRelNote] = useState('');
  const [blReason, setBlReason] = useState('');
  const [blError, setBlError] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [q, roleF, statusF]);

  const list = useMemo(() => users.filter((u) =>
    (roleF === 'all' || u.role === roleF) &&
    (statusF === 'all' || u.status === statusF) &&
    (q === '' || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) || (u.school && u.school.toLowerCase().includes(q.toLowerCase())))
  ), [users, q, roleF, statusF]);

  const totalPages = Math.ceil(list.length / pageSize) || 1;
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, currentPage, pageSize]);

  const kpis = [
    { label: 'Tổng người dùng', value: users.length },
    { label: 'Sinh viên', value: users.filter((u) => u.role === 'student').length },
    { label: 'Nhà tuyển dụng', value: users.filter((u) => u.role === 'employer').length },
    { label: 'Chờ xác thực eKYC', value: users.filter((u) => u.kyc === 'pending' || u.status === 'pending').length },
  ];

  const openReliability = (u) => {
    setRelValue(u.reliability);
    setRelNote('');
    setModal({ type: 'reliability', user: u });
  };

  const openHistory = (u) => setModal({ type: 'history', user: u });

  const saveReliability = () => {
    adjustReliability(modal.user.id, Number(relValue), relNote.trim());
    setModal(null);
  };

  const saveBlacklist = () => {
    if (!blReason.trim()) {
      setBlError('Vui lòng nhập lý do để lưu vào nhật ký kiểm duyệt.');
      return;
    }
    blacklistUser(modal.user.id, blReason.trim());
    setModal(null);
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Quản lý người dùng & eKYC</h2>
        <p>Hồ sơ sinh viên & nhà tuyển dụng, phê duyệt định danh trường đại học, xử lý vi phạm, Blacklist và Reliability Score.</p>
      </div>

      <div className="adm-kpis">
        {kpis.map((k) => (
          <div className="adm-kpi" key={k.label}>
            <div className="k-lbl">{k.label}</div>
            <div className="k-val">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h4>Danh sách tài khoản hệ thống</h4>
          <span className="sub">Đang hiển thị {list.length} / {users.length} tài khoản</span>
        </div>

        <div className="adm-toolbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Tìm theo tên, email trường, tên trường..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <select value={roleF} onChange={(e) => setRoleF(e.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="student">🎓 Sinh viên</option>
            <option value="employer">🏢 Nhà tuyển dụng</option>
          </select>
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="pending">Chờ xác thực</option>
            <option value="locked">Đã khoá</option>
            <option value="blacklisted">Blacklist</option>
          </select>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ minWidth: 240 }}>Người dùng</th>
                <th style={{ minWidth: 120 }}>Vai trò</th>
                <th style={{ minWidth: 130 }}>Xác thực eKYC</th>
                <th style={{ minWidth: 110 }}>Reliability</th>
                <th style={{ minWidth: 130 }}>Trạng thái</th>
                <th style={{ minWidth: 280, textAlign: 'center' }}>Hành động quản trị</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.map((u) => (
                <tr key={u.id}>
                  {/* User Column with Avatar */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: u.role === 'employer' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 14,
                          flexShrink: 0
                        }}
                      >
                        {u.name.trim().charAt(0).toUpperCase()}
                      </div>
                      <div style={{ lineHeight: 1.35 }}>
                        <b>{u.name}</b>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          {u.email} {u.school && u.school !== '—' ? `· ${u.school}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role Column */}
                  <td>
                    <span
                      className="chip"
                      style={{
                        background: u.role === 'employer' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: u.role === 'employer' ? '#6366f1' : '#3b82f6',
                        fontSize: 12
                      }}
                    >
                      {u.role === 'student' ? '🎓 Sinh viên' : '🏢 Nhà tuyển dụng'}
                    </span>
                  </td>

                  {/* KYC Column */}
                  <td>
                    <span
                      className="chip"
                      style={{
                        background: u.kyc === 'verified' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: u.kyc === 'verified' ? '#16a34a' : '#d97706',
                        fontSize: 11.5
                      }}
                    >
                      {KYC_LABEL[u.kyc] || u.kyc}
                    </span>
                  </td>

                  {/* Reliability Score */}
                  <td>
                    <button
                      onClick={() => openReliability(u)}
                      style={{
                        border: 'none',
                        background: 'rgba(108, 76, 255, 0.1)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        fontSize: 12,
                      }}
                      title="Bấm để sửa điểm uy tín"
                    >
                      {u.reliability}/100 ✏️
                    </button>
                  </td>

                  {/* Status */}
                  <td>
                    <span
                      className="chip"
                      style={{
                        ...(STATUS_STYLE[u.status] || {}),
                        fontSize: 11.5
                      }}
                    >
                      {STATUS_LABEL[u.status] || u.status}
                    </span>
                  </td>

                  {/* Action Buttons (All 4 buttons neatly aligned) */}
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'nowrap' }}>
                      {u.kyc !== 'verified' && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => verifyUser(u.id)}
                        >
                          Duyệt eKYC
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => lockUser(u.id)}
                      >
                        {u.status === 'locked' ? 'Mở khoá' : 'Khoá'}
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => openHistory(u)}
                      >
                        Lịch sử
                      </button>
                      {u.status !== 'blacklisted' && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--coral)', borderColor: 'var(--coral)', padding: '4px 10px', fontSize: 12 }}
                          onClick={() => {
                            setBlReason('');
                            setBlError('');
                            setModal({ type: 'blacklist', user: u });
                          }}
                        >
                          Blacklist
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="adm-empty" style={{ textAlign: 'center', padding: '30px 0' }}>
                    Không tìm thấy người dùng phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={list.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20]}
          itemLabel="tài khoản"
        />
      </div>

      {/* Blacklist Board */}
      <div className="adm-card" style={{ marginTop: 24 }}>
        <div className="adm-card-head">
          <h4>🚫 Blacklist Board (Danh sách đen vi phạm)</h4>
          <span className="sub">Tài khoản bị cấm giao dịch do quỵt tiền hoặc bỏ ngang công việc</span>
        </div>
        {blacklist.length === 0 ? (
          <div className="adm-empty">Danh sách đen hiện đang trống.</div>
        ) : (
          blacklist.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <b style={{ color: 'var(--coral)', fontSize: 14 }}>{b.name}</b>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>Lý do: {b.reason}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Ngày thêm: {b.date}</span>
              <button className="btn btn-outline btn-sm" onClick={() => removeFromBlacklist(i)}>
                Gỡ khỏi Blacklist
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal Adjust Reliability */}
      {modal?.type === 'reliability' && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <h3>✏️ Điều chỉnh Reliability Score</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Điều chỉnh điểm uy tín của <b>{modal.user.name}</b> khi có khiếu nại hoặc xem xét lại vi phạm. Điểm hiện tại: <b>{modal.user.reliability}/100</b>.
            </p>
            <div className="field">
              <label>Điểm mới (0 – 100)</label>
              <input type="number" min="0" max="100" value={relValue} onChange={(e) => setRelValue(e.target.value)} />
            </div>
            <div className="field">
              <label>Ghi chú lý do điều chỉnh</label>
              <textarea value={relNote} onChange={(e) => setRelNote(e.target.value)} placeholder="Ví dụ: bồi thường và khắc phục lỗi bàn giao đúng hẹn..." />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={saveReliability}>Lưu thay đổi</button>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal User History Audit */}
      {modal?.type === 'history' && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <h3>📜 Hồ sơ & Lịch sử hoạt động</h3>
            <p style={{ marginBottom: 14, fontSize: 13.5, color: 'var(--ink-soft)' }}>
              <b>{modal.user.name}</b> · {modal.user.role === 'student' ? 'Sinh viên' : 'Nhà tuyển dụng'} {modal.user.school !== '—' ? `· ${modal.user.school}` : ''}
            </p>
            <div className="checkout-summary">
              <div className="cs-row"><span>Số công việc đã hoàn thành</span><span><b>{modal.user.jobsDone ?? Math.round(modal.user.reliability / 4)}</b></span></div>
              <div className="cs-row"><span>Reliability Score hiện tại</span><span><b>{modal.user.reliability}/100</b></span></div>
              <div className="cs-row"><span>Trạng thái xác thực eKYC</span><span><b>{KYC_LABEL[modal.user.kyc] || modal.user.kyc}</b></span></div>
              <div className="cs-row total"><span>Trạng thái tài khoản</span><span><b>{STATUS_LABEL[modal.user.status] || modal.user.status}</b></span></div>
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline btn-block" onClick={() => setModal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add to Blacklist */}
      {modal?.type === 'blacklist' && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <h3 style={{ color: 'var(--coral)' }}>🚫 Đưa vào Blacklist Board</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Bạn đang đưa tài khoản <b>{modal.user.name}</b> ({modal.user.email}) vào danh sách đen. Tài khoản này sẽ bị khoá quyền ứng tuyển và đăng tin.
            </p>
            <div className="field">
              <label>Lý do đưa vào Blacklist <span style={{ color: 'var(--coral)' }}>*</span></label>
              <textarea
                value={blReason}
                onChange={(e) => { setBlReason(e.target.value); setBlError(''); }}
                placeholder="Ví dụ: quỵt tiền sinh viên sau khi nhận sản phẩm hoàn chỉnh, không phản hồi đối soát..."
                rows={3}
              />
            </div>
            {blError && <div className="field-error" style={{ marginBottom: 12 }}>{blError}</div>}
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ background: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={saveBlacklist}>
                Xác nhận đưa vào Blacklist
              </button>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
