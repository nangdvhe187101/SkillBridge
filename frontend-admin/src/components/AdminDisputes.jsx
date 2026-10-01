import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { useToast } from '../context/ToastContext';
import { getAdminDisputes, getDisputeChatEvidence, resolveDispute } from '../api/adminApi';
import { downloadJobAttachment } from '../utils/fileDownloader';
import { fmtVND } from '../utils/formatters';

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function getFileIcon(type, name) {
  if (type === 'video' || name?.endsWith('.mp4')) return 'video';
  if (type === 'image' || name?.endsWith('.png') || name?.endsWith('.jpg')) return 'image';
  if (name?.endsWith('.xlsx') || name?.endsWith('.xls')) return 'chart-bar';
  if (name?.endsWith('.pdf')) return 'file-text';
  return 'file-text';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString('vi-VN');
  } catch {
    return dateStr;
  }
}

export default function AdminDisputes() {
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [sub, setSub] = useState('open'); // 'open' | 'closed'

  // Modals state
  const [viewDossier, setViewDossier] = useState(null); // Full detail dispute object
  const [chatModal, setChatModal] = useState(null); // Dispute object for chat evidence
  const [chatEvidence, setChatEvidence] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);

  // Decision Modal state
  const [decisionModal, setDecisionModal] = useState(null); // { dispute, decision: 'accept'|'reject'|'split' }
  const [rate, setRate] = useState(40);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDisputesData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await getAdminDisputes();
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải danh sách khiếu nại:', err);
      setFetchError(err.message || 'Không thể kết nối đến máy chủ quản trị.');
      showToast(err.message || 'Lỗi tải dữ liệu khiếu nại', 'x');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDisputesData();
  }, [fetchDisputesData]);

  const openList = disputes.filter((d) => (d.status || '').toLowerCase() === 'open');
  const closedList = disputes.filter((d) => (d.status || '').toLowerCase() === 'closed');
  const currentList = sub === 'open' ? openList : closedList;

  const kpis = [
    { label: 'Khiếu nại đang mở', value: openList.length },
    { label: 'Đã giải quyết', value: closedList.length },
    {
      label: 'Tổng giá trị tranh chấp mở',
      value: fmtVND(openList.reduce((s, d) => s + (Number(d.amount) || 0), 0)),
    },
    {
      label: 'Đã bồi thường từ Quỹ',
      value: fmtVND(
        closedList
          .filter((d) => d.decision === 'accept' || d.decision === 'split')
          .reduce((s, d) => s + (Number(d.payoutAmount || d.payout) || 0), 0)
      ),
    },
  ];

  // Xem bằng chứng tin nhắn đối soát
  const openChatEvidence = async (dispute) => {
    setChatModal(dispute);
    setChatEvidence(null);
    setLoadingChat(true);
    try {
      const data = await getDisputeChatEvidence(dispute.id);
      setChatEvidence(data);
    } catch (err) {
      console.error('Lỗi tải bằng chứng tin nhắn:', err);
      showToast(err.message || 'Không thể truy xuất lịch sử chat của vụ tranh chấp này.', 'x');
    } finally {
      setLoadingChat(false);
    }
  };

  const openDecision = (dispute, decision) => {
    setRate(decision === 'accept' ? 100 : decision === 'split' ? 50 : 0);
    setNote('');
    setError('');
    setDecisionModal({ dispute, decision });
  };

  const confirmDecision = async () => {
    if (!note.trim()) {
      setError('Vui lòng ghi rõ căn cứ pháp lý / đối soát bằng chứng để lưu vào Audit Log.');
      return;
    }

    const payload = {
      decision: decisionModal.decision,
      studentSplitPercent:
        decisionModal.decision === 'split' || decisionModal.decision === 'accept'
          ? Math.max(0, Math.min(100, Number(rate) || 0))
          : 0,
      adminNote: note.trim(),
    };

    setSubmitting(true);
    setError('');
    try {
      await resolveDispute(decisionModal.dispute.id, payload);
      showToast('Ban hành phán quyết trọng tài thành công!', 'check');
      setDecisionModal(null);
      setViewDossier(null);
      await fetchDisputesData();
    } catch (err) {
      console.error('Lỗi ban hành phán quyết:', err);
      setError(err.message || 'Không thể lưu phán quyết. Vui lòng thử lại.');
      showToast(err.message || 'Lỗi xử lý phán quyết', 'x');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="adm-section active">
      <div className="adm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Trung tâm Phán quyết & Xử lý Tranh chấp</h2>
          <p>Đối soát hồ sơ bằng chứng số, bản tường trình 2 bên, ra phán quyết bồi thường từ Quỹ Bảo hiểm và điều chỉnh điểm Reliability.</p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={fetchDisputesData}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Icon name="refresh" style={{ width: 14, height: 14 }} />
          <span>Làm mới</span>
        </button>
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
          Đang chờ xử lý ({openList.length})
        </button>
        <button className={sub === 'closed' ? 'is-active' : ''} onClick={() => setSub('closed')}>
          Đã có phán quyết ({closedList.length})
        </button>
      </div>

      {loading ? (
        <div className="adm-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--ink-soft)', margin: 0 }}>Đang tải dữ liệu hồ sơ tranh chấp từ hệ thống...</p>
        </div>
      ) : fetchError ? (
        <div className="adm-card" style={{ textAlign: 'center', padding: '30px 20px', borderColor: 'var(--coral)' }}>
          <Icon name="alert-triangle" style={{ width: 32, height: 32, color: 'var(--coral)', marginBottom: 8 }} />
          <p style={{ color: 'var(--coral)', fontWeight: 600, margin: '0 0 12px' }}>{fetchError}</p>
          <button className="btn btn-outline btn-sm" onClick={fetchDisputesData}>
            Thử kết nối lại
          </button>
        </div>
      ) : currentList.length === 0 ? (
        <div className="adm-card">
          <div className="adm-empty">Không có vụ tranh chấp nào trong mục này.</div>
        </div>
      ) : (
        currentList.map((d) => (
          <div className="adm-card" key={d.id} style={{ marginBottom: 16 }}>
            <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0 }}>{d.jobTitle || `Dự án #${d.jobId}`}</h4>
                  <span className="chip" style={{ fontSize: 11, background: 'rgba(108, 76, 255, 0.1)', color: 'var(--primary)', border: '1px solid rgba(108, 76, 255, 0.2)' }}>
                    Mã vụ: #{d.id}
                  </span>
                </div>
                <span className="sub" style={{ display: 'block', marginTop: 4 }}>
                  Thời điểm nộp khiếu nại: <b>{formatDate(d.filedAt)}</b> · Giá trị ký quỹ: <b style={{ color: 'var(--primary)' }}>{fmtVND(d.amount)}</b>
                </span>
              </div>
              <span className={'djr-status ' + (d.status === 'open' ? 'in_progress' : 'completed')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name={d.status === 'open' ? 'hourglass' : 'check'} style={{ width: 12, height: 12 }} />
                <span>{d.status === 'open' ? 'Đang chờ phán quyết' : 'Đã đóng case'}</span>
              </span>
            </div>

            {/* Parties Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, background: 'var(--surface)', padding: 12, borderRadius: 10, margin: '12px 0' }}>
              <div>
                <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="graduation" style={{ width: 13, height: 13 }} />
                  <span>Bên khiếu nại (Sinh viên):</span>
                </span>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>
                  {d.studentName || d.student || 'Sinh viên'}
                </div>
                {d.studentReliability && (
                  <span className="chip chip-lime" style={{ fontSize: 11, marginTop: 4, padding: '1px 6px' }}>
                    Reliability: {d.studentReliability}/100
                  </span>
                )}
              </div>

              <div>
                <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="building" style={{ width: 13, height: 13 }} />
                  <span>Bên bị khiếu nại (NTD):</span>
                </span>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>
                  {d.employerName || d.employer || 'Nhà tuyển dụng'}
                </div>
                {d.employerReliability && (
                  <span className="chip" style={{ fontSize: 11, marginTop: 4, padding: '1px 6px' }}>
                    Reliability: {d.employerReliability}/100
                  </span>
                )}
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.5 }}>
              <b>Lý do khiếu nại:</b> {d.reason || 'Chưa cung cấp lý do cụ thể'}
            </p>

            {/* Quick Evidence Pills */}
            {d.evidences?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Tệp bằng chứng ({d.evidences.length}):</span>
                {d.evidences.map((ev, idx) => (
                  <a
                    key={idx}
                    href={ev.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip"
                    style={{ fontSize: 11.5, background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                    title="Bấm để xem tệp bằng chứng"
                  >
                    <Icon name={getFileIcon(ev.fileType, ev.fileUrl)} style={{ width: 13, height: 13 }} />
                    <span>{ev.uploadedByName || `Bằng chứng #${ev.id}`}</span>
                    <Icon name="download" style={{ width: 11, height: 11 }} />
                  </a>
                ))}
              </div>
            )}

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setViewDossier(d)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="search" style={{ width: 13, height: 13 }} />
                <span>Xem toàn bộ hồ sơ</span>
              </button>

              <button className="btn btn-outline btn-sm" onClick={() => openChatEvidence(d)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                <Icon name="chat" style={{ width: 13, height: 13 }} />
                <span>Đối soát tin nhắn Chat</span>
              </button>

              {d.status === 'open' ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => openDecision(d, 'accept')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="check" style={{ width: 13, height: 13 }} />
                    <span>Giải ngân bồi thường cho SV</span>
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => openDecision(d, 'reject')}>
                    <Icon name="refresh" style={{ width: 13, height: 13 }} />
                    <span>Hoàn cọc lại cho NTD</span>
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => openDecision(d, 'split')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="chart-bar" style={{ width: 13, height: 13 }} />
                    <span>Phân chia tỷ lệ</span>
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  <b>Kết luận phán quyết:</b>{' '}
                  {d.decision === 'accept'
                    ? `Giải ngân 100% (${fmtVND(d.payoutAmount || d.amount)}) cho SV`
                    : d.decision === 'split'
                    ? `Phân chia (${fmtVND(d.payoutAmount)} cho SV)`
                    : 'Bác bỏ khiếu nại, hoàn tiền cho NTD'}
                  {d.resolvedNote && ` — Căn cứ: ${d.resolvedNote}`}
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* ========================================================================= */}
      {/* 1. FULL CASE DOSSIER MODAL (XEM CHI TIẾT HỒ SƠ TOÀN DIỆN) */}
      {/* ========================================================================= */}
      {viewDossier && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setViewDossier(null); }}>
          <div className="modal-box" style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setViewDossier(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" style={{ width: 16, height: 16 }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="chip chip-lime" style={{ fontSize: 11 }}>Hồ sơ trọng tài</span>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Mã case: #{viewDossier.id}</span>
            </div>
            <h2 style={{ fontSize: 19, margin: '4px 0 12px' }}>{viewDossier.jobTitle || `Dự án #${viewDossier.jobId}`}</h2>

            <div className="checkout-summary" style={{ marginBottom: 16 }}>
              <div className="cs-row"><span>Ngân sách hợp đồng bảo chứng</span><b>{fmtVND(viewDossier.amount)}</b></div>
              <div className="cs-row"><span>Thời điểm mở khiếu nại</span><span>{formatDate(viewDossier.filedAt)}</span></div>
              <div className="cs-row"><span>Hạn chót thụ lý 72h</span><span>{formatDate(viewDossier.deadlineAt72h)}</span></div>
              <div className="cs-row total">
                <span>Trạng thái hồ sơ</span>
                <b style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name={viewDossier.status === 'open' ? 'hourglass' : 'check'} style={{ width: 13, height: 13 }} />
                  <span>{viewDossier.status === 'open' ? 'Đang thụ lý' : 'Đã hoàn tất phán quyết'}</span>
                </b>
              </div>
            </div>

            {/* Statements */}
            <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--ink)' }}>Lời tường trình & Đối chiếu 2 bên</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <b style={{ color: '#3b82f6', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="graduation" style={{ width: 14, height: 14 }} />
                    <span>Sinh viên: {viewDossier.studentName || viewDossier.student}</span>
                  </b>
                  {viewDossier.studentReliability && (
                    <span className="chip" style={{ fontSize: 11 }}>Reliability: {viewDossier.studentReliability}/100</span>
                  )}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>
                  "{viewDossier.reason || 'Không có tường trình chi tiết.'}"
                </p>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <b style={{ color: '#6366f1', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="building" style={{ width: 14, height: 14 }} />
                    <span>Nhà tuyển dụng: {viewDossier.employerName || viewDossier.employer}</span>
                  </b>
                  {viewDossier.employerReliability && (
                    <span className="chip" style={{ fontSize: 11 }}>Reliability: {viewDossier.employerReliability}/100</span>
                  )}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>
                  "Đối soát tự động căn cứ theo nhật ký trao đổi và sản phẩm nghiệm thu đã giao nộp."
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setViewDossier(null);
                  openChatEvidence(viewDossier);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Icon name="chat" style={{ width: 14, height: 14 }} />
                <span>Xem bằng chứng tin nhắn đối soát</span>
              </button>

              {viewDossier.status === 'open' && (
                <>
                  <button className="btn btn-primary" onClick={() => openDecision(viewDossier, 'accept')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="check" style={{ width: 14, height: 14 }} />
                    <span>Phán quyết bồi thường cho SV</span>
                  </button>
                  <button className="btn btn-outline" style={{ color: 'var(--coral)', borderColor: 'var(--coral)', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => openDecision(viewDossier, 'reject')}>
                    <Icon name="refresh" style={{ width: 14, height: 14 }} />
                    <span>Hoàn tiền lại cho NTD</span>
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
      {/* 2. CHAT EVIDENCE MODAL (ĐỐI SOÁT TIN NHẮN THEO VẾT AUDIT LOG) */}
      {/* ========================================================================= */}
      {chatModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setChatModal(null); }}>
          <div className="modal-box" style={{ maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <button className="modal-close" onClick={() => setChatModal(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" style={{ width: 16, height: 16 }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="chip" style={{ fontSize: 11, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                Bằng chứng số bất biến
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Hội thoại Vụ #{chatModal.id}</span>
            </div>
            <h3 style={{ fontSize: 18, margin: '4px 0 12px' }}>
              Đối soát tin nhắn: {chatModal.jobTitle || `Dự án #${chatModal.jobId}`}
            </h3>

            {loadingChat ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', flex: 1 }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--ink-soft)', margin: 0 }}>Đang trích xuất lịch sử hội thoại mã hóa từ máy chủ...</p>
              </div>
            ) : chatEvidence ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
                  <span>Truy xuất dữ liệu ghi nhận lúc: <b>{formatDate(chatEvidence.evidenceAccessLoggedAt)}</b></span>
                  {' · '}
                  <span>Số tin nhắn thu thập: <b>{chatEvidence.messages?.length || 0}</b></span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400 }}>
                  {!chatEvidence.messages || chatEvidence.messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: 30 }}>
                      Không có tin nhắn trao đổi nào được ghi nhận cho dự án này.
                    </div>
                  ) : (
                    chatEvidence.messages.map((m, idx) => {
                      const isStudent = m.senderId === chatEvidence.studentId || m.senderRole === 'student';
                      return (
                        <div
                          key={m.id || idx}
                          style={{
                            alignSelf: isStudent ? 'flex-start' : 'flex-end',
                            maxWidth: '75%',
                            background: isStudent ? '#ffffff' : '#eff6ff',
                            border: `1px solid ${isStudent ? 'var(--border)' : '#bfdbfe'}`,
                            borderRadius: 12,
                            padding: '8px 12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isStudent ? '#16a34a' : '#2563eb' }}>
                              {m.senderName || (isStudent ? 'Sinh viên' : 'Nhà tuyển dụng')}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                              {formatDate(m.sentAt || m.createdAt)}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                            {m.content}
                          </div>
                          {m.attachments?.length > 0 && (
                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {m.attachments.map((att, aIdx) => (
                                <a
                                  key={aIdx}
                                  href={att.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: 11.5, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Icon name="download" style={{ width: 12, height: 12 }} />
                                  <span>{att.fileName || 'Tệp đính kèm'}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--coral)' }}>
                Không tìm thấy dữ liệu hội thoại của vụ tranh chấp này.
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-outline" onClick={() => setChatModal(null)}>
                Đóng đối soát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ARBITRATION DECISION MODAL (RA PHÁN QUYẾT TRỌNG TÀI BẢO CHỨNG) */}
      {/* ========================================================================= */}
      {decisionModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget && !submitting) setDecisionModal(null); }}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <button className="modal-close" onClick={() => !submitting && setDecisionModal(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" style={{ width: 16, height: 16 }} />
            </button>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon
                name={decisionModal.decision === 'accept' ? 'check' : decisionModal.decision === 'split' ? 'chart-bar' : 'refresh'}
                style={{ width: 18, height: 18, color: decisionModal.decision === 'accept' ? 'var(--primary)' : 'var(--coral)' }}
              />
              <span>
                {decisionModal.decision === 'accept'
                  ? 'Phán quyết bồi thường cho Sinh viên'
                  : decisionModal.decision === 'split'
                  ? 'Phán quyết phân chia tỷ lệ hoàn cọc / giải ngân'
                  : 'Phán quyết hoàn tiền cho Nhà tuyển dụng'}
              </span>
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Vụ việc: <b>{decisionModal.dispute.jobTitle || `Dự án #${decisionModal.dispute.jobId}`}</b> · Hợp đồng:{' '}
              {fmtVND(decisionModal.dispute.amount)}
            </p>

            {(decisionModal.decision === 'accept' || decisionModal.decision === 'split') && (
              <div className="field">
                <label>
                  {decisionModal.decision === 'split'
                    ? 'Tỷ lệ giải ngân cho Sinh viên (0% – 100%, phần còn lại hoàn về NTD)'
                    : 'Tỷ lệ giải ngân bảo hiểm cho Sinh viên (30% – 100%)'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    min={decisionModal.decision === 'split' ? 0 : 30}
                    max="100"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    style={{ width: 100 }}
                    disabled={submitting}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                    = {fmtVND((Number(decisionModal.dispute.amount) * Number(rate || 0)) / 100)} giải ngân cho Sinh viên
                  </span>
                </div>
              </div>
            )}

            <div className="field">
              <label>
                Căn cứ phán quyết (Bắt buộc lưu vết Audit Trail) <span style={{ color: 'var(--coral)' }}>*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setError('');
                }}
                placeholder="Ghi rõ lý do căn cứ theo bằng chứng (ví dụ: SV đã nộp đúng brief 100% trước deadline nhưng NTD không phản hồi; hoặc sản phẩm sai lệch tiêu chí kỹ thuật...)"
                rows={3}
                disabled={submitting}
              />
              {error && <div style={{ color: 'var(--coral)', fontSize: 12, marginTop: 4 }}>{error}</div>}
            </div>

            <div style={{ background: 'var(--surface)', padding: 10, borderRadius: 8, fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="zap" style={{ width: 14, height: 14, color: '#f59e0b', flexShrink: 0 }} />
              <span>
                {decisionModal.decision === 'accept'
                  ? 'Sau phán quyết: Sinh viên được giải ngân tiền, hệ thống trừ 15 điểm Reliability của NTD.'
                  : decisionModal.decision === 'split'
                  ? 'Sau phán quyết: Tiền được chia theo tỷ lệ, đóng case tranh chấp và thông báo cho 2 bên.'
                  : 'Sau phán quyết: Tiền ký quỹ hoàn trả về ví NTD, trừ 10 điểm Reliability của Sinh viên.'}
              </span>
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={confirmDecision} disabled={submitting}>
                {submitting ? 'Đang lưu phán quyết...' : 'Ký phán quyết & Đóng case'}
              </button>
              <button className="btn btn-outline" onClick={() => setDecisionModal(null)} disabled={submitting}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
