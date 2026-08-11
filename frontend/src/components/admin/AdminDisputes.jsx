import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

export default function AdminDisputes() {
  const { disputes, resolveDispute } = useAdmin();
  const [sub, setSub] = useState('open');
  const [modal, setModal] = useState(null); // { dispute, decision }
  const [rate, setRate] = useState(40);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const open = disputes.filter((d) => d.status === 'open');
  const closed = disputes.filter((d) => d.status === 'closed');
  const list = sub === 'open' ? open : closed;

  const kpis = [
    { label: 'Khiếu nại đang mở', value: open.length },
    { label: 'Đã giải quyết', value: closed.length },
    { label: 'Tổng giá trị đang tranh chấp', value: open.reduce((s, d) => s + d.amount, 0).toLocaleString('vi-VN') + 'đ' },
    { label: 'Đã bồi thường (Quỹ)', value: closed.filter((d) => d.decision === 'accept').reduce((s, d) => s + (d.payout || 0), 0).toLocaleString('vi-VN') + 'đ' },
  ];

  const openDecision = (dispute, decision) => {
    setRate(decision === 'accept' ? 40 : 0);
    setNote('');
    setError('');
    setModal({ dispute, decision });
  };

  const confirm = () => {
    if (!note.trim()) { setError('Vui lòng ghi chú căn cứ quyết định cho audit trail.'); return; }
    const r = modal.decision === 'accept' ? Math.max(30, Math.min(50, Number(rate) || 40)) : 0;
    resolveDispute(modal.dispute.id, modal.decision, r, note.trim());
    setModal(null);
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Giải quyết tranh chấp</h2>
        <p>Xem bằng chứng, ra quyết định bồi thường từ Quỹ bảo hiểm cộng đồng, đóng case và cập nhật Reliability Score của cả hai bên.</p>
      </div>
      <div className="adm-kpis">
        {kpis.map((k) => <div className="adm-kpi" key={k.label}><div className="k-lbl">{k.label}</div><div className="k-val">{k.value}</div></div>)}
      </div>
      <div className="adm-tabs-mini">
        <button className={sub === 'open' ? 'is-active' : ''} onClick={() => setSub('open')}>Đang mở</button>
        <button className={sub === 'closed' ? 'is-active' : ''} onClick={() => setSub('closed')}>Đã đóng</button>
      </div>
      {list.length === 0 ? <div className="adm-empty">Không có tranh chấp nào.</div> : list.map((d) => (
        <div className="adm-card" key={d.id}>
          <div className="adm-card-head"><h4>{d.jobTitle}</h4><span className="sub">{d.amount.toLocaleString('vi-VN')}đ</span></div>
          <p style={{ fontSize: 13, marginBottom: 6 }}><b>Sinh viên:</b> {d.student} · <b>Nhà tuyển dụng:</b> {d.employer}</p>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}><b>Lý do:</b> {d.reason}</p>
          {d.evidence && (
            <details style={{ marginBottom: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>Xem bằng chứng bàn giao</summary>
              <p style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-soft)' }}>{d.evidence}</p>
            </details>
          )}
          {d.status === 'open' ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => openDecision(d, 'accept')}>✓ Chấp nhận bồi thường</button>
              <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => openDecision(d, 'reject')}>Từ chối</button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{d.decision === 'accept' ? `✓ Chấp nhận bồi thường ${d.payout.toLocaleString('vi-VN')}đ` : '✗ Từ chối bồi thường'}</p>
              {d.resolvedNote && <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>{d.resolvedNote}</p>}
            </>
          )}
        </div>
      ))}

      {modal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <h3>{modal.decision === 'accept' ? '✓ Chấp nhận bồi thường' : '✗ Từ chối khiếu nại'}</h3>
            <p><b>{modal.dispute.jobTitle}</b> — {modal.dispute.student} vs {modal.dispute.employer}. Giá trị job: {modal.dispute.amount.toLocaleString('vi-VN')}đ.</p>
            {modal.decision === 'accept' && (
              <div className="field">
                <label>% bồi thường từ Quỹ bảo hiểm cộng đồng (30–50%)</label>
                <input type="number" min="30" max="50" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Ghi chú quyết định (lưu vào audit trail)</label>
              <textarea value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} placeholder="Căn cứ ra quyết định dựa trên bằng chứng..." />
              {error && <div style={{ color: 'var(--coral)', fontSize: 12, marginTop: 4 }}>{error}</div>}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
              {modal.decision === 'accept'
                ? `Reliability: sinh viên +2 điểm, nhà tuyển dụng -15 điểm.`
                : `Reliability: sinh viên -5 điểm (khiếu nại không đủ căn cứ).`}
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={confirm}>Xác nhận & Đóng case</button>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
