import { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../Icon';
import {
  getSystemSettings,
  updateSystemSettings,
  triggerAutoAcceptScan,
  triggerPaymentReconciliation
} from '../../api/adminApi';

const PRIORITY_LABEL = { high: 'Cao', medium: 'Vừa', low: 'Thấp' };
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

  // Backend SystemSettings State
  const [sysSettings, setSysSettings] = useState({
    autoAcceptHours: 72,
    autoCloseJobDays: 30,
    featuredDurationHours: 48,
    emailJobHiredEnabled: true,
    emailDeliverable72hEnabled: true,
    emailPayoutEnabled: true,
    emailDigest18hEnabled: true,
    emailVipMatchEnabled: true
  });
  const [loadingSys, setLoadingSys] = useState(true);
  const [savingSys, setSavingSys] = useState(false);
  const [runningAction, setRunningAction] = useState(null);

  useEffect(() => {
    getSystemSettings()
      .then((res) => {
        if (res) {
          setSysSettings({
            autoAcceptHours: res.autoAcceptHours ?? 72,
            autoCloseJobDays: res.autoCloseJobDays ?? 30,
            featuredDurationHours: res.featuredDurationHours ?? 48,
            emailJobHiredEnabled: res.emailJobHiredEnabled ?? true,
            emailDeliverable72hEnabled: res.emailDeliverable72hEnabled ?? true,
            emailPayoutEnabled: res.emailPayoutEnabled ?? true,
            emailDigest18hEnabled: res.emailDigest18hEnabled ?? true,
            emailVipMatchEnabled: res.emailVipMatchEnabled ?? true
          });
        }
      })
      .catch((err) => console.warn('Không thể tải SystemSettings từ backend:', err))
      .finally(() => setLoadingSys(false));
  }, []);

  const handleSaveSysSettings = async () => {
    setSavingSys(true);
    try {
      await updateSystemSettings(sysSettings);
      showToast('Đã lưu cấu hình tự động & công tắc Email vào cơ sở dữ liệu!', 'check');
    } catch (err) {
      showToast(err?.message || 'Không thể lưu cấu hình hệ thống.', 'warning');
    } finally {
      setSavingSys(false);
    }
  };

  const handleRunAutoAccept = async () => {
    setRunningAction('autoAccept');
    try {
      const res = await triggerAutoAcceptScan();
      showToast(res?.message || 'Đã kích hoạt quét nghiệm thu tự động thành công!', 'check');
    } catch (err) {
      showToast(err?.message || 'Lỗi khi kích hoạt quét nghiệm thu.', 'warning');
    } finally {
      setRunningAction(null);
    }
  };

  const handleRunReconcile = async () => {
    setRunningAction('reconcile');
    try {
      const res = await triggerPaymentReconciliation();
      showToast(res?.message || 'Đã đối soát thanh toán và hạn thuê bao thành công!', 'check');
    } catch (err) {
      showToast(err?.message || 'Lỗi khi đối soát thanh toán.', 'warning');
    } finally {
      setRunningAction(null);
    }
  };

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
        showToast('Đã gửi phản hồi và đóng ticket hỗ trợ thành công!', 'check');
      } else {
        showToast('Đã gửi phản hồi tới người dùng.', 'check');
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
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="ticket" width="16" height="16" /> Hộp Ticket hỗ trợ người dùng
          </h4>
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
                  <span className="chip" style={{ ...PRIORITY_STYLE[t.priority], fontSize: 11, padding: '1px 6px' }}>
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>
                  Người gửi: <b>{t.user}</b> ({t.userEmail || 'user@edu.vn'}) · {t.createdAt || 'Hôm nay'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={'chip ' + (t.status === 'open' ? 'chip-lime' : '')} style={{ fontSize: 11.5 }}>
                  {t.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                </span>
                <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setViewTicket(t)}>
                  <Icon name="mail" width="13" height="13" /> Xem & Phản hồi
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

      {/* ========================================================================= */}
      {/* CẤU HÌNH TÁC VỤ TỰ ĐỘNG & ĐỐI SOÁT TỨC THÌ (BACKEND PERSISTED) */}
      {/* ========================================================================= */}
      <div className="adm-card" style={{ marginTop: 24 }}>
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="clock" width="16" height="16" style={{ color: 'var(--primary)' }} />
              Cấu hình Tác vụ Tự động & Vận hành Định kỳ
            </h4>
            <span className="sub">Lưu trữ động trong cơ sở dữ liệu SystemSettings, có hiệu lực tức thì</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#f59e0b', color: '#b45309' }}
              onClick={handleRunAutoAccept}
              disabled={runningAction === 'autoAccept'}
            >
              <Icon name="zap" width="13" height="13" />
              <span>{runningAction === 'autoAccept' ? 'Đang quét...' : '⚡ Quét nghiệm thu 72h ngay'}</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#10b981', color: '#047857' }}
              onClick={handleRunReconcile}
              disabled={runningAction === 'reconcile'}
            >
              <Icon name="refresh-cw" width="13" height="13" />
              <span>{runningAction === 'reconcile' ? 'Đang đối soát...' : '⚡ Đối soát thanh toán ngay'}</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
          <div className="field">
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>Thời gian tự động nghiệm thu (giờ)</label>
            <input
              type="number"
              min={1}
              max={720}
              value={sysSettings.autoAcceptHours}
              onChange={(e) => setSysSettings({ ...sysSettings, autoAcceptHours: Number(e.target.value) || 72 })}
            />
            <small style={{ color: 'var(--ink-soft)', fontSize: 11.5 }}>Mặc định 72 giờ sau khi SV nộp bài</small>
          </div>
          <div className="field">
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>Thời hạn tự động đóng job cũ (ngày)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={sysSettings.autoCloseJobDays}
              onChange={(e) => setSysSettings({ ...sysSettings, autoCloseJobDays: Number(e.target.value) || 30 })}
            />
            <small style={{ color: 'var(--ink-soft)', fontSize: 11.5 }}>Mặc định 30 ngày cho tin mở không tuyển</small>
          </div>
          <div className="field">
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>Thời hạn ghim tin nổi bật (giờ)</label>
            <input
              type="number"
              min={1}
              max={720}
              value={sysSettings.featuredDurationHours}
              onChange={(e) => setSysSettings({ ...sysSettings, featuredDurationHours: Number(e.target.value) || 48 })}
            />
            <small style={{ color: 'var(--ink-soft)', fontSize: 11.5 }}>Mặc định 48 giờ cho gói Featured Listing</small>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={handleSaveSysSettings}
            disabled={savingSys}
          >
            <Icon name="check" width="14" height="14" />
            <span>{savingSys ? 'Đang lưu...' : 'Lưu cấu hình tham số tự động'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BẢNG CÔNG TẮC EMAIL THÔNG BÁO TỰ ĐỘNG (FEATURE TOGGLES) */}
      {/* ========================================================================= */}
      <div className="adm-card" style={{ marginTop: 24 }}>
        <div className="adm-card-head">
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="mail" width="16" height="16" style={{ color: 'var(--primary)' }} />
            Công tắc Email Thông báo Tự động (Feature Toggles)
          </h4>
          <span className="sub">Bật hoặc tắt độc lập từng luồng Email gửi đi mà không cần khởi động lại Server</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {[
            {
              key: 'emailJobHiredEnabled',
              title: 'Email Chúc mừng Sinh viên Trúng tuyển',
              desc: 'Gửi email cho sinh viên ngay khi NTD bấm chọn thuê, thông báo thù lao và hạn chót bàn giao (Deadline).',
              badge: 'Sinh viên'
            },
            {
              key: 'emailDeliverable72hEnabled',
              title: 'Email Thông báo NTD khi Sinh viên Nộp bài (Nhắc 72h)',
              desc: 'Gửi email cho Nhà tuyển dụng kèm đếm ngược 72 giờ tự động nghiệm thu giải ngân.',
              badge: 'Nhà tuyển dụng'
            },
            {
              key: 'emailPayoutEnabled',
              title: 'Email Giải ngân Thù lao Thành công vào Ví',
              desc: 'Gửi biên nhận điện tử cho sinh viên khi nghiệm thu hoàn tất, chi tiết số tiền thực nhận và hoa hồng sàn.',
              badge: 'Sinh viên'
            },
            {
              key: 'emailDigest18hEnabled',
              title: 'Email Báo cáo 18h Hàng ngày về Ứng viên mới',
              desc: 'Tổng hợp số lượng ứng viên mới nộp hồ sơ gửi đến hộp thư Nhà tuyển dụng lúc 18h00 mỗi ngày.',
              badge: 'Nhà tuyển dụng'
            },
            {
              key: 'emailVipMatchEnabled',
              title: 'Email Thông báo Việc làm mới Phù hợp (VIP/Master)',
              desc: 'Gửi cảnh báo việc làm lương cao phù hợp kỹ năng cho ứng viên sở hữu gói Pro và Master Talent.',
              badge: 'VIP Talent'
            }
          ].map((toggle) => (
            <div
              key={toggle.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--surface)',
                borderRadius: 10,
                border: '1px solid var(--border)',
                gap: 12
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b style={{ fontSize: 13.5 }}>{toggle.title}</b>
                  <span className="chip" style={{ fontSize: 11, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                    {toggle.badge}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>
                  {toggle.desc}
                </div>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={sysSettings[toggle.key]}
                  onChange={(e) => setSysSettings({ ...sysSettings, [toggle.key]: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: sysSettings[toggle.key] ? '#16a34a' : 'var(--ink-soft)' }}>
                  {sysSettings[toggle.key] ? 'Đang BẬT' : 'Đã TẮT'}
                </span>
              </label>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={handleSaveSysSettings}
            disabled={savingSys}
          >
            <Icon name="check" width="14" height="14" />
            <span>{savingSys ? 'Đang lưu...' : 'Lưu công tắc Email'}</span>
          </button>
        </div>
      </div>

      <div className="adm-card" style={{ marginTop: 24 }}>
        <div className="adm-card-head">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="file-text" width="16" height="16" /> Nhật ký hoạt động toàn hệ thống (Audit Trail)
          </h4>
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
            <button className="modal-close" onClick={() => setViewTicket(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" width="16" height="16" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="chip" style={{ ...PRIORITY_STYLE[viewTicket.priority], fontSize: 11 }}>
                {PRIORITY_LABEL[viewTicket.priority]}
              </span>
              <span className="chip" style={{ fontSize: 11 }}>Mã: #{viewTicket.id.toUpperCase()}</span>
            </div>

            <h2 style={{ fontSize: 18, margin: '6px 0 12px' }}>{viewTicket.subject}</h2>

            <div className="checkout-summary" style={{ marginBottom: 14 }}>
              <div className="cs-row"><span>Người gửi yêu cầu</span><b>{viewTicket.user} ({viewTicket.userEmail || 'user@edu.vn'})</b></div>
              <div className="cs-row"><span>Thời điểm tạo ticket</span><span>{viewTicket.createdAt || 'Hôm nay'}</span></div>
              <div className="cs-row total"><span>Trạng thái</span><b>{viewTicket.status === 'open' ? 'Đang chờ giải quyết' : 'Đã đóng'}</b></div>
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
                  <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => handleSendReply(true)}>
                    <Icon name="check" width="14" height="14" /> Gửi phản hồi & Đóng ticket
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
