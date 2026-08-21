import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { downloadJobAttachment } from '../../utils/fileDownloader';
import { fmtVND } from '../../context/StoreContext';

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function getFileIcon(type, name) {
  if (type === 'video' || name?.endsWith('.mp4')) return '🎬';
  if (type === 'image' || name?.endsWith('.png') || name?.endsWith('.jpg')) return '🖼️';
  if (name?.endsWith('.xlsx') || name?.endsWith('.xls')) return '📊';
  if (name?.endsWith('.pdf')) return '📕';
  return '📄';
}

export default function AdminDisputes() {
  const { disputes, resolveDispute } = useAdmin();
  const [sub, setSub] = useState('open'); // 'open' | 'closed'
  const [viewDossier, setViewDossier] = useState(null); // Full detail dispute object
  const [decisionModal, setDecisionModal] = useState(null); // { dispute, decision: 'accept'|'reject'|'split' }
  const [rate, setRate] = useState(40);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const open = disputes.filter((d) => d.status === 'open');
  const closed = disputes.filter((d) => d.status === 'closed');
  const list = sub === 'open' ? open : closed;

  const kpis = [
    { label: 'Khiếu nại đang mở', value: open.length },
    { label: 'Đã giải quyết', value: closed.length },
    { label: 'Tổng giá trị tranh chấp', value: open.reduce((s, d) => s + d.amount, 0).toLocaleString('vi-VN') + 'đ' },
    { label: 'Đã bồi thường từ Quỹ', value: closed.filter((d) => d.decision === 'accept').reduce((s, d) => s + (d.payout || 0), 0).toLocaleString('vi-VN') + 'đ' },
  ];

  const openDecision = (dispute, decision) => {
    setRate(decision === 'accept' ? 40 : decision === 'split' ? 50 : 0);
    setNote('');
    setError('');
    setDecisionModal({ dispute, decision });
  };

  const confirmDecision = () => {
    if (!note.trim()) {
      setError('Vui lòng ghi rõ căn cứ pháp lý / đối soát bằng chứng để lưu vào Audit Log.');
      return;
    }
    const r = decisionModal.decision === 'accept'
      ? Math.max(30, Math.min(100, Number(rate) || 40))
      : decisionModal.decision === 'split' ? 50 : 0;

    resolveDispute(decisionModal.dispute.id, decisionModal.decision, r, note.trim());
    setDecisionModal(null);
    setViewDossier(null);
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Trung tâm Phán quyết & Xử lý Tranh chấp</h2>
        <p>Đối soát hồ sơ bằng chứng số, bản tường trình 2 bên, ra phán quyết bồi thường từ Quỹ Bảo hiểm và điều chỉnh điểm Reliability.</p>
      </div>

      <div className="adm-kpis">
        {kpis.map((k) => (
          <div className="adm-kpi" key={k.label}>
            <div className="k-lbl">{k.label}</div>
            <div className="k-val">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="adm-tabs-mini" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={sub === 'open' ? 'is-active' : ''} onClick={() => setSub('open')}>
          Đang chờ xử lý ({open.length})
        </button>
        <button className={sub === 'closed' ? 'is-active' : ''} onClick={() => setSub('closed')}>
          Đã có phán quyết ({closed.length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="adm-card">
          <div className="adm-empty">Không có vụ tranh chấp nào trong mục này.</div>
        </div>
      ) : (
        list.map((d) => (
          <div className="adm-card" key={d.id} style={{ marginBottom: 16 }}>
            <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0 }}>{d.jobTitle}</h4>
                  <span className="chip" style={{ fontSize: 11, background: 'rgba(108, 76, 255, 0.1)', color: 'var(--primary)', border: '1px solid rgba(108, 76, 255, 0.2)' }}>
                    Mã vụ: #{d.id.toUpperCase()}
                  </span>
                </div>
                <span className="sub" style={{ display: 'block', marginTop: 4 }}>
                  Ngày nộp khiếu nại: <b>{d.filedAt || '28/07/2026'}</b> · Giá trị ký quỹ: <b style={{ color: 'var(--primary)' }}>{fmtVND(d.amount)}</b>
                </span>
              </div>
              <span className={'djr-status ' + (d.status === 'open' ? 'in_progress' : 'completed')}>
                {d.status === 'open' ? '⏳ Đang chờ phán quyết' : '✓ Đã đóng case'}
              </span>
            </div>

            {/* Parties Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, background: 'var(--surface)', padding: 12, borderRadius: 10, margin: '12px 0' }}>
              <div>
                <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🎓 Bên khiếu nại (Sinh viên):</span>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>
                  {d.student} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-soft)' }}>({d.studentEmail || 'sv@edu.vn'})</span>
                </div>
                <span className="chip chip-lime" style={{ fontSize: 11, marginTop: 4, padding: '1px 6px' }}>
                  Reliability: {d.studentReliability || 80}/100
                </span>
              </div>

              <div>
                <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🏢 Bên bị khiếu nại (NTD):</span>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>
                  {d.employer} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-soft)' }}>({d.employerEmail || 'contact@dn.vn'})</span>
                </div>
                <span className="chip" style={{ fontSize: 11, marginTop: 4, padding: '1px 6px' }}>
                  Reliability: {d.employerReliability || 75}/100
                </span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.5 }}>
              <b>Lý do tranh chấp:</b> {d.reason}
            </p>

            {/* Quick Attachment Files Pill */}
            {d.files?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Tệp bằng chứng kèm theo ({d.files.length}):</span>
                {d.files.map((f, idx) => (
                  <span
                    key={idx}
                    className="chip"
                    style={{ fontSize: 11.5, cursor: 'pointer', background: 'var(--surface)' }}
                    onClick={() => downloadJobAttachment(f, d.jobTitle)}
                    title="Bấm để tải về đối soát"
                  >
                    {getFileIcon(f.type, f.name)} {f.name} ⬇
                  </span>
                ))}
              </div>
            )}

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setViewDossier(d)}>
                🔍 Xem toàn bộ hồ sơ & bằng chứng
              </button>

              {d.status === 'open' ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => openDecision(d, 'accept')}>
                    ✓ Phán quyết bồi thường cho SV
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => openDecision(d, 'reject')}>
                    ↩ Hoàn tiền lại cho NTD
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  <b>Kết luận phán quyết:</b> {d.decision === 'accept' ? `Bồi thường ${fmtVND(d.payout)} cho SV` : 'Hoàn tiền cho NTD'}. {d.resolvedNote && `(${d.resolvedNote})`}
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* ========================================================================= */}
      {/* 1. FULL CASE DOSSIER MODAL (XEM CHI TIẾT BẰNG CHỨNG ĐỐI SOÁT TOÀN DIỆN) */}
      {/* ========================================================================= */}
      {viewDossier && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setViewDossier(null); }}>
          <div className="modal-box" style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setViewDossier(null)}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="chip chip-lime" style={{ fontSize: 11 }}>Hồ sơ trọng tài</span>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Mã case: #{viewDossier.id.toUpperCase()}</span>
            </div>
            <h2 style={{ fontSize: 19, margin: '4px 0 12px' }}>{viewDossier.jobTitle}</h2>

            <div className="checkout-summary" style={{ marginBottom: 16 }}>
              <div className="cs-row"><span>Ngân sách hợp đồng</span><b>{fmtVND(viewDossier.amount)}</b></div>
              <div className="cs-row"><span>Hạn hoàn thành ban đầu</span><span>{viewDossier.deadlineAt || '28/07/2026'}</span></div>
              <div className="cs-row"><span>Thời điểm mở khiếu nại</span><span>{viewDossier.filedAt || '28/07/2026 22:15'}</span></div>
              <div className="cs-row total"><span>Trạng thái hồ sơ</span><b>{viewDossier.status === 'open' ? '⏳ Đang thụ lý' : '✓ Đã đóng'}</b></div>
            </div>

            {/* Dual Statements */}
            <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--ink)' }}>Lời tường trình & Đối chiếu 2 bên</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {/* Student */}
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <b style={{ color: '#3b82f6', fontSize: 13 }}>🎓 Sinh viên: {viewDossier.student}</b>
                  <span className="chip" style={{ fontSize: 11 }}>Reliability: {viewDossier.studentReliability || 80}/100</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>
                  "{viewDossier.studentStatement || viewDossier.reason}"
                </p>
              </div>

              {/* Employer */}
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <b style={{ color: '#6366f1', fontSize: 13 }}>🏢 Nhà tuyển dụng: {viewDossier.employer}</b>
                  <span className="chip" style={{ fontSize: 11 }}>Reliability: {viewDossier.employerReliability || 75}/100</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>
                  "{viewDossier.employerStatement || 'Đang chờ phản hồi bổ sung từ nhà tuyển dụng.'}"
                </p>
              </div>
            </div>

            {/* Evidence & Files */}
            <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--ink)' }}>Tệp bằng chứng số & Sản phẩm bàn giao</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {viewDossier.files?.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{getFileIcon(f.type, f.name)}</span>
                    <div>
                      <b style={{ fontSize: 13, display: 'block' }}>{f.name}</b>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Dung lượng: {formatFileSize(f.size)}</span>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => downloadJobAttachment(f, viewDossier.jobTitle)}>
                    ⬇ Tải về đối soát
                  </button>
                </div>
              ))}
            </div>

            {/* Case Timeline */}
            {viewDossier.timeline?.length > 0 && (
              <>
                <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--ink)' }}>Diễn tiến thời gian (Audit Timeline)</h4>
                <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--primary)', marginBottom: 20 }}>
                  {viewDossier.timeline.map((t, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: 10, paddingLeft: 10 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)' }}>{t.time}</span>
                      <p style={{ fontSize: 12.5, margin: '2px 0 0', color: 'var(--ink)' }}>{t.event}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Modal Actions */}
            <div className="modal-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {viewDossier.status === 'open' && (
                <>
                  <button className="btn btn-primary" onClick={() => openDecision(viewDossier, 'accept')}>
                    ✓ Phán quyết bồi thường cho SV
                  </button>
                  <button className="btn btn-outline" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => openDecision(viewDossier, 'reject')}>
                    ↩ Hoàn tiền lại cho NTD
                  </button>
                </>
              )}
              <button className="btn btn-outline" onClick={() => setViewDossier(null)}>
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ARBITRATION DECISION MODAL (RA QUYẾT ĐỊNH & LƯU AUDIT TRAIL) */}
      {/* ========================================================================= */}
      {decisionModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setDecisionModal(null); }}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <button className="modal-close" onClick={() => setDecisionModal(null)}>✕</button>
            <h3>
              {decisionModal.decision === 'accept' ? '✓ Phán quyết bồi thường cho Sinh viên' : '↩ Phán quyết hoàn tiền cho Nhà tuyển dụng'}
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Vụ việc: <b>{decisionModal.dispute.jobTitle}</b> · Hợp đồng: {fmtVND(decisionModal.dispute.amount)}
            </p>

            {decisionModal.decision === 'accept' && (
              <div className="field">
                <label>Tỷ lệ bồi thường từ Quỹ bảo hiểm / Escrow (30% – 100%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    min="30"
                    max="100"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    style={{ width: 100 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                    = {fmtVND((decisionModal.dispute.amount * Number(rate || 40)) / 100)} giải ngân cho {decisionModal.dispute.student}
                  </span>
                </div>
              </div>
            )}

            <div className="field">
              <label>Căn cứ phán quyết (Bắt buộc lưu vào Audit Trail) <span style={{ color: 'var(--coral)' }}>*</span></label>
              <textarea
                value={note}
                onChange={(e) => { setNote(e.target.value); setError(''); }}
                placeholder="Ghi rõ lý do căn cứ theo bằng chứng (ví dụ: SV đã giao đúng brief 100% trước deadline nhưng NTD không thanh toán...)"
                rows={3}
              />
              {error && <div style={{ color: 'var(--coral)', fontSize: 12, marginTop: 4 }}>{error}</div>}
            </div>

            <div style={{ background: 'var(--surface)', padding: 10, borderRadius: 8, fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>
              {decisionModal.decision === 'accept'
                ? `⚡ Sau phán quyết: Sinh viên được bồi thường tiền, Reliability NTD bị trừ 15 điểm.`
                : `⚡ Sau phán quyết: Tiền ký quỹ hoàn trả về ví NTD, Reliability Sinh viên bị trừ 10 điểm do vi phạm deadline/brief.`}
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={confirmDecision}>
                Ký phán quyết & Đóng case
              </button>
              <button className="btn btn-outline" onClick={() => setDecisionModal(null)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
