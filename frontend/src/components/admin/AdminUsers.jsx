import { useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

const STATUS_LABEL = { active: 'Đang hoạt động', pending: 'Chờ xác thực', locked: 'Đã khoá', blacklisted: 'Blacklist' };
const KYC_LABEL = { verified: 'Đã xác thực', pending: 'Chờ duyệt' };

export default function AdminUsers() {
  const { users, blacklist, verifyUser, lockUser, blacklistUser, removeFromBlacklist, adjustReliability } = useAdmin();
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [modal, setModal] = useState(null); // { type: 'reliability'|'history', user }
  const [relValue, setRelValue] = useState(0);
  const [relNote, setRelNote] = useState('');
  const [blReason, setBlReason] = useState('');

  const list = useMemo(() => users.filter((u) =>
    (roleF === 'all' || u.role === roleF) &&
    (statusF === 'all' || u.status === statusF) &&
    (q === '' || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) || u.school.toLowerCase().includes(q.toLowerCase()))
  ), [users, q, roleF, statusF]);

  const kpis = [
    { label: 'Tổng người dùng', value: users.length },
    { label: 'Sinh viên', value: users.filter((u) => u.role === 'student').length },
    { label: 'Nhà tuyển dụng', value: users.filter((u) => u.role === 'employer').length },
    { label: 'Chờ xác thực', value: users.filter((u) => u.status === 'pending').length },
  ];

  const openReliability = (u) => { setRelValue(u.reliability); setRelNote(''); setModal({ type: 'reliability', user: u }); };
  const openHistory = (u) => setModal({ type: 'history', user: u });
  const saveReliability = () => { adjustReliability(modal.user.id, Number(relValue), relNote.trim()); setModal(null); };
  const [blError, setBlError] = useState('');
  const saveBlacklist = () => {
    if (!blReason.trim()) { setBlError('Vui lòng nhập lý do để lưu vào audit trail.'); return; }
    blacklistUser(modal.user.id, blReason.trim());
    setModal(null);
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Quản lý người dùng</h2>
        <p>Danh sách sinh viên & nhà tuyển dụng, xác thực eKYC, khoá tài khoản, Blacklist và Reliability Score.</p>
      </div>
      <div className="adm-kpis">
        {kpis.map((k) => <div className="adm-kpi" key={k.label}><div className="k-lbl">{k.label}</div><div className="k-val">{k.value}</div></div>)}
      </div>
      <div className="adm-card">
        <div className="adm-card-head"><h4>Danh sách tài khoản</h4></div>
        <div className="adm-toolbar">
          <input type="text" placeholder="Tìm theo tên, email, trường..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={roleF} onChange={(e) => setRoleF(e.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="student">Sinh viên</option>
            <option value="employer">Nhà tuyển dụng</option>
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
            <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Xác thực</th><th>Reliability</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b><br /><span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{u.email} · {u.school}</span></td>
                  <td>{u.role === 'student' ? 'Sinh viên' : 'Nhà tuyển dụng'}</td>
                  <td>{u.kyc === 'verified' ? '✓ Đã xác thực' : '⏳ Chờ duyệt'}</td>
                  <td>
                    <button onClick={() => openReliability(u)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--primary)', textDecoration: 'underline' }}>
                      {u.reliability}/100
                    </button>
                  </td>
                  <td><span className="chip">{STATUS_LABEL[u.status]}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                      {u.kyc !== 'verified' && <button className="btn btn-outline btn-sm" onClick={() => verifyUser(u.id)}>Xác thực</button>}
                      <button className="btn btn-outline btn-sm" onClick={() => lockUser(u.id)}>{u.status === 'locked' ? 'Mở khoá' : 'Khoá'}</button>
                      <button className="btn btn-outline btn-sm" onClick={() => openHistory(u)}>Lịch sử</button>
                      {u.status !== 'blacklisted' && <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => { setBlReason(''); setModal({ type: 'blacklist', user: u }); }}>Blacklist</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6} className="adm-empty">Không tìm thấy người dùng phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="adm-card">
        <div className="adm-card-head"><h4>🚫 Blacklist Board</h4><span className="sub">Người dùng bị đưa vào danh sách đen do vi phạm</span></div>
        {blacklist.length === 0 ? <div className="adm-empty">Danh sách trống.</div> : blacklist.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}><b>{b.name}</b><br /><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{b.reason}</span></div>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{b.date}</span>
            <button className="btn btn-outline btn-sm" onClick={() => removeFromBlacklist(i)}>Gỡ bỏ</button>
          </div>
        ))}
      </div>

      {modal?.type === 'reliability' && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <h3>✏️ Điều chỉnh Reliability Score</h3>
            <p>Điều chỉnh thủ công điểm uy tín của <b>{modal.user.name}</b> khi có tranh chấp cần can thiệp. Điểm hiện tại: <b>{modal.user.reliability}/100</b>.</p>
            <div className="field"><label>Điểm mới (0–100)</label><input type="number" min="0" max="100" value={relValue} onChange={(e) => setRelValue(e.target.value)} /></div>
            <div className="field"><label>Ghi chú lý do điều chỉnh</label><textarea value={relNote} onChange={(e) => setRelNote(e.target.value)} placeholder="Ví dụ: giảm điểm do vi phạm deadline nhiều lần..." /></div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={saveReliability}>Lưu thay đổi</button>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {modal?.type === 'history' && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <h3>📜 Lịch sử của {modal.user.name}</h3>
            <p style={{ marginBottom: 14 }}>{modal.user.role === 'student' ? 'Sinh viên' : 'Nhà tuyển dụng'} · {modal.user.school !== '—' ? modal.user.school + ' · ' : ''}Tham gia SkillBridge</p>
            <div className="checkout-summary">
              <div className="cs-row"><span>Số công việc đã hoàn thành</span><span><b>{modal.user.jobsDone ?? Math.round(modal.user.reliability / 4)}</b></span></div>
              <div className="cs-row"><span>Reliability Score hiện tại</span><span><b>{modal.user.reliability}/100</b></span></div>
              <div className="cs-row"><span>Trạng thái xác thực eKYC</span><span><b>{KYC_LABEL[modal.user.kyc]}</b></span></div>
              <div className="cs-row total"><span>Trạng thái tài khoản</span><span><b>{STATUS_LABEL[modal.user.status]}</b></span></div>
            </div>
            <div className="modal-actions"><button className="btn btn-outline btn-block" onClick={() => setModal(null)}>Đóng</button></div>
          </div>
        </div>
      )}
      {modal?.type === 'blacklist' && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <h3>🚫 Thêm vào Blacklist</h3>
            <p>Đưa <b>{modal.user.name}</b> vào Blacklist Board. Tài khoản sẽ không thể tạo lại bằng cùng email/số điện thoại đã xác thực.</p>
            <div className="field">
              <label>Lý do vi phạm</label>
              <textarea value={blReason} onChange={(e) => { setBlReason(e.target.value); setBlError(''); }} placeholder="Mô tả căn cứ đưa vào Blacklist..." />
              {blError && <div style={{ color: 'var(--coral)', fontSize: 12, marginTop: 4 }}>{blError}</div>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={saveBlacklist}>Xác nhận Blacklist</button>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
