import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useToast } from '../../context/ToastContext';

const PRIORITY_LABEL = { high: '🔴 Cao', medium: '🟡 Vừa', low: '🟢 Thấp' };
const PRIORITY_STYLE = {
  high: { background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
  medium: { background: 'rgba(234, 179, 8, 0.1)', color: '#d97706' },
  low: { background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' },
};

export default function AdminOps() {
  const { tickets, resolveTicket, config, saveConfig, auditLog } = useAdmin();
  const { showToast } = useToast();
  const [form, setForm] = useState(config);
  const [viewTicket, setViewTicket] = useState(null);
  const [replyText, setReplyText] = useState('');

  const openTickets = tickets.filter((t) => t.status === 'open');

  const handleSendReply = (closeTicket = false) => {
    if (!replyText.trim() && !closeTicket) return;

    if (viewTicket) {
      if (replyText.trim()) {
        viewTicket.replies = viewTicket.replies || [];
        viewTicket.replies.push({
          sender: 'Chuyên viên Hỗ trợ SkillBridge',
          time: 'Vừa xong',
          text: replyText.trim()
        });
      }
      if (closeTicket) {
        resolveTicket(viewTicket.id);
        viewTicket.status = 'closed';
        showToast('Đã gửi phản hồi và đóng ticket hỗ trợ thành công!', '✅');
      } else {
        showToast('Đã gửi phản hồi tới người dùng.', '💬');
      }
      setReplyText('');
      setViewTicket(null);
    }
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Vận hành & Hỗ trợ khách hàng (CSKH)</h2>
        <p>Hộp thư ticket hỗ trợ trực tuyến, cấu hình tham số vận hành và nhật ký hoạt động hệ thống.</p>
      </div>

      <div className="adm-card">
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>🎫 Hộp Ticket hỗ trợ người dùng</h4>
          <span className="sub">{openTickets.length} yêu cầu đang chờ giải quyết</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {tickets.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--surface)',
                borderRadius: 10,
                border: '1px solid var(--border)',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b style={{ fontSize: 13.5 }}>{t.subject}</b>
                  <span className="chip" style={{ ...(PRIORITY_STYLE[t.priority] || {}), fontSize: 11, padding: '1px 6px' }}>
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>
                  Người gửi: <b>{t.user}</b> ({t.userEmail || 'user@edu.vn'}) · {t.createdAt || 'Hôm nay'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={'chip ' + (t.status === 'open' ? 'chip-lime' : '')} style={{ fontSize: 11.5 }}>
                  {t.status === 'open' ? '⏳ Đang mở' : '✓ Đã đóng'}
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => setViewTicket(t)}>
                  ✉️ Xem & Phản hồi
                </button>
                {t.status === 'open' && (
                  <button className="btn btn-outline btn-sm" onClick={() => resolveTicket(t.id)}>
                    Đóng ticket
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="adm-card" style={{ marginTop: 24 }}>
        <div className="adm-card-head">
          <h4>⚙️ Cấu hình tham số hệ thống</h4>
          <span className="sub">Điều chỉnh chính sách tự động không cần can thiệp code</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 12 }}>
          <div className="field">
            <label>Phí hoa hồng công việc chuẩn (%)</label>
            <input type="number" value={form.commission} onChange={(e) => setForm({ ...form, commission: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Phí hoa hồng VIP Business (%)</label>
            <input type="number" value={form.vipCommission} onChange={(e) => setForm({ ...form, vipCommission: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Phí gắn nhãn Featured Listing (VND)</label>
            <input type="number" value={form.featuredFee} onChange={(e) => setForm({ ...form, featuredFee: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Giới hạn số lần yêu cầu sửa đổi (Revision)</label>
            <input type="number" value={form.revisionLimit} onChange={(e) => setForm({ ...form, revisionLimit: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Ngưỡng điểm khoá tài khoản tự động</label>
            <input type="number" value={form.reliabilityLockThreshold} onChange={(e) => setForm({ ...form, reliabilityLockThreshold: Number(e.target.value) })} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => saveConfig(form)}>
            💾 Lưu cấu hình tham số
          </button>
        </div>
      </div>

      <div className="adm-card" style={{ marginTop: 24 }}>
        <div className="adm-card-head">
          <h4>📜 Nhật ký hoạt động toàn hệ thống (Audit Trail)</h4>
        </div>
        <div className="adm-audit-log" style={{ marginTop: 10 }}>
          {auditLog.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-soft)', flexShrink: 0, width: 150, fontSize: 12 }}>{l.time}</span>
              <span><b>{l.actor}</b>: {l.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL CHI TIẾT TICKET & PHẢN HỒI CSKH */}
      {/* ========================================================================= */}
      {viewTicket && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setViewTicket(null); }}>
          <div className="modal-box" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setViewTicket(null)}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="chip" style={{ ...(PRIORITY_STYLE[viewTicket.priority] || {}), fontSize: 11 }}>
                {PRIORITY_LABEL[viewTicket.priority]}
              </span>
              <span className="chip" style={{ fontSize: 11 }}>Mã: #{viewTicket.id.toUpperCase()}</span>
            </div>

            <h2 style={{ fontSize: 18, margin: '6px 0 12px' }}>{viewTicket.subject}</h2>

            <div className="checkout-summary" style={{ marginBottom: 14 }}>
              <div className="cs-row"><span>Người gửi yêu cầu</span><b>{viewTicket.user} ({viewTicket.userEmail || 'user@edu.vn'})</b></div>
              <div className="cs-row"><span>Thời điểm tạo ticket</span><span>{viewTicket.createdAt || 'Hôm nay'}</span></div>
              <div className="cs-row total"><span>Trạng thái</span><b>{viewTicket.status === 'open' ? '⏳ Đang chờ giải quyết' : '✓ Đã đóng'}</b></div>
            </div>

            {/* User Message */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>NỘI DUNG YÊU CẦU HỖ TRỢ</h4>
              <div style={{ background: 'var(--surface)', padding: 14, borderRadius: 10, border: '1px solid var(--border)', fontSize: 13.5, lineHeight: 1.6 }}>
                {viewTicket.message}
              </div>
            </div>

            {/* Conversation History */}
            {viewTicket.replies?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>LỊCH SỬ PHẢN HỒI ({viewTicket.replies.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {viewTicket.replies.map((rep, idx) => (
                    <div key={idx} style={{ background: 'rgba(108, 76, 255, 0.08)', border: '1px solid rgba(108, 76, 255, 0.2)', padding: 12, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <b style={{ color: 'var(--primary)' }}>{rep.sender}</b>
                        <span style={{ color: 'var(--ink-soft)' }}>{rep.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>{rep.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Composer */}
            {viewTicket.status === 'open' && (
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Soạn câu trả lời gửi đến người dùng</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Nhập nội dung hướng dẫn hoặc thông báo đã xử lý thành công..."
                  rows={3}
                />
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {viewTicket.status === 'open' ? (
                <>
                  <button className="btn btn-primary" onClick={() => handleSendReply(true)}>
                    ✓ Gửi phản hồi & Đóng ticket
                  </button>
                  <button className="btn btn-outline" onClick={() => handleSendReply(false)}>
                    Gửi phản hồi (Giữ mở)
                  </button>
                </>
              ) : null}
              <button className="btn btn-outline" onClick={() => setViewTicket(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
