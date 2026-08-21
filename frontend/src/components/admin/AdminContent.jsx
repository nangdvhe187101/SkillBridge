import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useConfirm } from '../../context/ConfirmContext';
import { downloadJobAttachment } from '../../utils/fileDownloader';
import { fmtVND } from '../../context/StoreContext';

const RISK_LABEL = {
  high: '🔴 Rủi ro cao',
  medium: '🟡 Rủi ro vừa',
  low: '🟢 Rủi ro thấp'
};

const RISK_STYLE = {
  high: { background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.25)' },
  medium: { background: 'rgba(234, 179, 8, 0.12)', color: '#d97706', border: '1px solid rgba(234, 179, 8, 0.25)' },
  low: { background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.25)' },
};

export default function AdminContent() {
  const { queue, categories, featured, approveJob, rejectJob, warnPoster, addCategory, removeCategory, approveFeatured } = useAdmin();
  const confirm = useConfirm();
  const [sub, setSub] = useState('queue');
  const [newCat, setNewCat] = useState('');
  const [viewJob, setViewJob] = useState(null); // Modal view full job detail

  const handleReject = async (m) => {
    if (await confirm(`Từ chối và gỡ bỏ tin tuyển dụng "${m.title}"?`, { danger: true, confirmLabel: 'Từ chối tin' })) {
      rejectJob(m.id);
      setViewJob(null);
    }
  };

  const handleApprove = (m) => {
    approveJob(m.id);
    setViewJob(null);
  };

  const handleWarn = (m) => {
    warnPoster(m.id);
    setViewJob(null);
  };

  const handleRemoveCat = async (c) => {
    if (await confirm(`Xoá danh mục "${c}"?`, { danger: true, confirmLabel: 'Xoá danh mục' })) {
      removeCategory(categories.indexOf(c));
    }
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Kiểm duyệt nội dung & Tin tuyển dụng</h2>
        <p>Hàng đợi kiểm duyệt tin đăng mới, đối soát chống tin ảo/gian lận học thuật, quản lý danh mục và Featured Listing.</p>
      </div>

      <div className="adm-tabs-mini" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={sub === 'queue' ? 'is-active' : ''} onClick={() => setSub('queue')}>
          Hàng đợi duyệt tin ({queue.length})
        </button>
        <button className={sub === 'cats' ? 'is-active' : ''} onClick={() => setSub('cats')}>
          Danh mục ngành nghề ({categories.length})
        </button>
        <button className={sub === 'featured' ? 'is-active' : ''} onClick={() => setSub('featured')}>
          Featured Listing ({featured.length})
        </button>
      </div>

      {sub === 'queue' && (
        <div className="adm-card">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Tin đăng chờ kiểm duyệt</h4>
            <span className="sub">{queue.length} tin cần xử lý</span>
          </div>

          {queue.length === 0 ? (
            <div className="adm-empty">Tất cả tin đăng đã được kiểm duyệt sạch sẽ!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {queue.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: 14,
                    background: 'var(--surface)',
                    borderRadius: 10,
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <b style={{ fontSize: 14, color: 'var(--ink)' }}>{m.title}</b>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>
                        Người đăng: <b>{m.emp}</b> · Ngân sách: <b style={{ color: 'var(--primary)' }}>{fmtVND(m.budget || 300000)}</b> · {m.postedAt || 'Vừa xong'}
                      </div>
                    </div>
                    <span className="chip" style={{ ...(RISK_STYLE[m.risk] || {}), fontSize: 11 }}>
                      {RISK_LABEL[m.risk]}
                    </span>
                  </div>

                  {m.flag && (
                    <div style={{ fontSize: 12.5, background: 'rgba(239, 68, 68, 0.08)', padding: '6px 10px', borderRadius: 6, color: '#dc2626' }}>
                      ⚠️ <b>Lý do gắn cờ:</b> {m.flag}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setViewJob(m)}>
                      🔍 Xem chi tiết nội dung tin
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleApprove(m)}>
                      ✓ Duyệt tin
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => handleReject(m)}>
                      Từ chối
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleWarn(m)}>
                      ⚠️ Cảnh báo người đăng
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sub === 'cats' && (
        <div className="adm-card">
          <div className="adm-card-head"><h4>Danh mục ngành nghề</h4></div>
          <div className="adm-toolbar" style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <input
              type="text"
              placeholder="Tên danh mục mới, ví dụ: UI/UX Design"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => { addCategory(newCat); setNewCat(''); }}>
              + Thêm danh mục
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {categories.map((c, i) => (
              <span className="chip" key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {c}
                <button onClick={() => handleRemoveCat(c)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--coral)', fontWeight: 'bold' }}>✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {sub === 'featured' && (
        <div className="adm-card">
          <div className="adm-card-head">
            <h4>Yêu cầu gắn nhãn Featured Listing</h4>
            <span className="sub">Đã thanh toán 20.000đ</span>
          </div>
          {featured.length === 0 ? (
            <div className="adm-empty">Không có yêu cầu Featured nào đang chờ.</div>
          ) : (
            featured.map((f) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <b>{f.title}</b>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {f.emp} · Đã thanh toán <b>{f.paid.toLocaleString('vi-VN')}đ</b>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => approveFeatured(f.id)}>
                  ⭐ Gắn nhãn Featured
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL XEM CHI TIẾT TIN TUYỂN DỤNG CẦN DUYỆT (JOB MODERATION DOSSIER) */}
      {/* ========================================================================= */}
      {viewJob && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setViewJob(null); }}>
          <div className="modal-box" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setViewJob(null)}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="chip" style={{ ...(RISK_STYLE[viewJob.risk] || {}), fontSize: 11 }}>
                {RISK_LABEL[viewJob.risk]}
              </span>
              <span className="chip chip-lime" style={{ fontSize: 11 }}>{viewJob.cat}</span>
            </div>

            <h2 style={{ fontSize: 18, margin: '6px 0 12px' }}>{viewJob.title}</h2>

            <div className="checkout-summary" style={{ marginBottom: 14 }}>
              <div className="cs-row"><span>Nhà tuyển dụng / Người đăng</span><b>{viewJob.emp} ({viewJob.empEmail || 'Chưa xác thực email'})</b></div>
              <div className="cs-row"><span>Ngân sách chi trả</span><b style={{ color: 'var(--primary)' }}>{fmtVND(viewJob.budget || 300000)}</b></div>
              <div className="cs-row"><span>Thời gian gửi tin</span><span>{viewJob.postedAt || 'Hôm nay'}</span></div>
            </div>

            {viewJob.riskReason && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <b style={{ color: '#dc2626', fontSize: 13 }}>⚠️ Phân tích rủi ro hệ thống:</b>
                <p style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5, color: 'var(--ink)' }}>{viewJob.riskReason}</p>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>MÔ TẢ CÔNG VIỆC</h4>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, background: 'var(--surface)', padding: 12, borderRadius: 8, margin: 0 }}>
                {viewJob.desc}
              </p>
            </div>

            {viewJob.req?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>YÊU CẦU ĐỐI VỚI SINH VIÊN</h4>
                <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  {viewJob.req.map((r, idx) => <li key={idx} style={{ marginBottom: 4 }}>{r}</li>)}
                </ul>
              </div>
            )}

            {viewJob.attachments?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>TÀI LIỆU ĐÍNH KÈM ({viewJob.attachments.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {viewJob.attachments.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span>📄 <b>{f.name}</b></span>
                      <button className="btn btn-outline btn-sm" onClick={() => downloadJobAttachment(f, viewJob.title)}>
                        ⬇ Tải file brief
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
              <button className="btn btn-primary" onClick={() => handleApprove(viewJob)}>
                ✓ Duyệt tin lên sàn
              </button>
              <button className="btn btn-outline" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => handleReject(viewJob)}>
                Từ chối tin
              </button>
              <button className="btn btn-outline" onClick={() => handleWarn(viewJob)}>
                ⚠️ Gửi cảnh báo
              </button>
              <button className="btn btn-outline" onClick={() => setViewJob(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
