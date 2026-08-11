import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useConfirm } from '../../context/ConfirmContext';

const RISK_LABEL = { high: '🔴 Rủi ro cao', medium: '🟡 Rủi ro vừa', low: '🟢 Rủi ro thấp' };

export default function AdminContent() {
  const { queue, categories, featured, approveJob, rejectJob, warnPoster, addCategory, removeCategory, approveFeatured } = useAdmin();
  const confirm = useConfirm();
  const [sub, setSub] = useState('queue');
  const [newCat, setNewCat] = useState('');

  const handleReject = async (m) => {
    if (await confirm(`Gỡ/từ chối tin "${m.title}"?`, { danger: true, confirmLabel: 'Từ chối tin' })) rejectJob(m.id);
  };
  const handleRemoveCat = async (c) => {
    if (await confirm(`Xoá danh mục "${c}"?`, { danger: true, confirmLabel: 'Xoá danh mục' })) removeCategory(categories.indexOf(c));
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Kiểm duyệt nội dung</h2>
        <p>Duyệt tin đăng mới, chống ghost job/spam, quản lý danh mục ngành nghề và Featured Listing.</p>
      </div>
      <div className="adm-tabs-mini">
        <button className={sub === 'queue' ? 'is-active' : ''} onClick={() => setSub('queue')}>Hàng đợi duyệt tin</button>
        <button className={sub === 'cats' ? 'is-active' : ''} onClick={() => setSub('cats')}>Danh mục ngành nghề</button>
        <button className={sub === 'featured' ? 'is-active' : ''} onClick={() => setSub('featured')}>Featured Listing</button>
      </div>

      {sub === 'queue' && (
        <div className="adm-card">
          <div className="adm-card-head"><h4>Tin đăng chờ duyệt</h4><span className="sub">{queue.length} tin</span></div>
          {queue.length === 0 ? <div className="adm-empty">Không còn tin nào chờ duyệt.</div> : queue.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <b>{m.title}</b><br /><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{m.emp} · {RISK_LABEL[m.risk]} · {m.flag}</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => approveJob(m.id)}>Duyệt</button>
              <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => handleReject(m)}>Từ chối</button>
              <button className="btn btn-outline btn-sm" onClick={() => warnPoster(m.id)}>⚠️ Cảnh báo người đăng</button>
            </div>
          ))}
        </div>
      )}

      {sub === 'cats' && (
        <div className="adm-card">
          <div className="adm-card-head"><h4>Danh mục ngành nghề</h4></div>
          <div className="adm-toolbar">
            <input type="text" placeholder="Tên danh mục mới, ví dụ: UI/UX Design" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => { addCategory(newCat); setNewCat(''); }}>+ Thêm danh mục</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {categories.map((c, i) => (
              <span className="chip" key={i}>{c} <button onClick={() => handleRemoveCat(c)} style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: 4 }}>✕</button></span>
            ))}
          </div>
        </div>
      )}

      {sub === 'featured' && (
        <div className="adm-card">
          <div className="adm-card-head"><h4>Yêu cầu gắn nhãn Featured Listing</h4><span className="sub">Đã thanh toán 20.000đ</span></div>
          {featured.length === 0 ? <div className="adm-empty">Không có yêu cầu nào.</div> : featured.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}><b>{f.title}</b><br /><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{f.emp} · đã thanh toán {f.paid.toLocaleString('vi-VN')}đ</span></div>
              <button className="btn btn-primary btn-sm" onClick={() => approveFeatured(f.id)}>Gắn nhãn Featured</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
