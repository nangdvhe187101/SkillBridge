import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

const PRIORITY_LABEL = { high: '🔴 Cao', medium: '🟡 Vừa', low: '🟢 Thấp' };

export default function AdminOps() {
  const { tickets, resolveTicket, config, saveConfig, auditLog } = useAdmin();
  const [form, setForm] = useState(config);

  const openTickets = tickets.filter((t) => t.status === 'open');

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Vận hành & hỗ trợ khách hàng</h2>
        <p>Hộp ticket hỗ trợ, cấu hình tham số hệ thống và nhật ký hoạt động toàn hệ thống.</p>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>🎫 Ticket hỗ trợ</h4><span className="sub">{openTickets.length} đang mở</span></div>
        {tickets.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}><b>{t.subject}</b><br /><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.user} · {PRIORITY_LABEL[t.priority]}</span></div>
            <span className="chip">{t.status === 'open' ? 'Đang mở' : 'Đã đóng'}</span>
            {t.status === 'open' && <button className="btn btn-outline btn-sm" onClick={() => resolveTicket(t.id)}>Đóng ticket</button>}
          </div>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>⚙️ Cấu hình tham số hệ thống</h4><span className="sub">Điều chỉnh không cần sửa code</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <div className="field"><label>Hoa hồng chuẩn (%)</label><input type="number" value={form.commission} onChange={(e) => setForm({ ...form, commission: Number(e.target.value) })} /></div>
          <div className="field"><label>Hoa hồng VIP Business (%)</label><input type="number" value={form.vipCommission} onChange={(e) => setForm({ ...form, vipCommission: Number(e.target.value) })} /></div>
          <div className="field"><label>Phí Featured Listing (VND)</label><input type="number" value={form.featuredFee} onChange={(e) => setForm({ ...form, featuredFee: Number(e.target.value) })} /></div>
          <div className="field"><label>Giới hạn số lần yêu cầu sửa</label><input type="number" value={form.revisionLimit} onChange={(e) => setForm({ ...form, revisionLimit: Number(e.target.value) })} /></div>
          <div className="field"><label>Ngưỡng khoá tài khoản (Reliability)</label><input type="number" value={form.reliabilityLockThreshold} onChange={(e) => setForm({ ...form, reliabilityLockThreshold: Number(e.target.value) })} /></div>
        </div>
        <div style={{ marginTop: 14 }}><button className="btn btn-primary btn-sm" onClick={() => saveConfig(form)}>Lưu cấu hình</button></div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>📜 Nhật ký hoạt động (Audit Log)</h4></div>
        <div className="adm-audit-log">
          {auditLog.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
              <span style={{ color: 'var(--ink-soft)', flexShrink: 0, width: 150 }}>{l.time}</span>
              <span><b>{l.actor}</b>: {l.action}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
