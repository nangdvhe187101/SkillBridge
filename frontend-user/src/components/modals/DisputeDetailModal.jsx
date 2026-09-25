import { useState, useEffect, useRef } from 'react';
import ModalShell from './ModalShell';
import Icon from '../Icon';
import { fmtVND } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { getDisputeDetail, addDisputeEvidence, getMyDisputes } from '../../api/disputeApi';

function formatCountdown(deadlineStr) {
  if (!deadlineStr) return null;
  const deadline = new Date(deadlineStr).getTime();
  const now = Date.now();
  const diff = deadline - now;
  if (diff <= 0) return 'Đã hết thời hạn 72h';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} giờ ${minutes} phút`;
}

export default function DisputeDetailModal({ disputeId, onClose, onRefresh }) {
  const { showToast } = useToast();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [newFile, setNewFile] = useState(null);
  const [newDesc, setNewDesc] = useState('');
  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      let targetId = Number(disputeId);
      let data = null;
      try {
        data = await getDisputeDetail(targetId);
      } catch {
        // Fallback: Nếu disputeId là jobId, tra cứu từ danh sách my disputes
        const myDisputes = await getMyDisputes();
        const matched = (myDisputes || []).find(
          (d) => Number(d.id) === targetId || Number(d.jobId) === targetId
        );
        if (matched) {
          targetId = matched.id;
          data = await getDisputeDetail(matched.id);
        } else {
          throw new Error('Không tìm thấy thông tin hồ sơ khiếu nại.');
        }
      }
      setDispute(data);
    } catch (err) {
      showToast?.(err?.message || 'Không thể tải chi tiết hồ sơ khiếu nại.', 'x');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (disputeId) loadData();
  }, [disputeId]);

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    if (!newFile) {
      showToast?.('Vui lòng chọn tệp chứng cứ.', 'warning');
      return;
    }

    try {
      setSubmittingEvidence(true);
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('description', newDesc.trim() || 'Tệp chứng cứ bổ sung');

      const targetDisputeId = dispute?.id || disputeId;
      await addDisputeEvidence(targetDisputeId, formData);
      showToast?.('Đã nộp thêm bằng chứng thành công!', 'check');
      setNewFile(null);
      setNewDesc('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
      onRefresh?.();
    } catch (err) {
      showToast?.(err?.message || 'Không thể nộp chứng cứ bổ sung.', 'x');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  if (loading || !dispute) {
    return (
      <ModalShell onClose={onClose} wide>
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--ink-soft)', margin: 0 }}>Đang tải hồ sơ khiếu nại...</p>
        </div>
      </ModalShell>
    );
  }

  const isClosed = dispute.status === 'closed';
  const countdownText = formatCountdown(dispute.deadlineAt72h);
  const isExpired = !countdownText || countdownText.includes('Đã hết');

  return (
    <ModalShell onClose={onClose} wide>
      <div style={{ padding: '4px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.25rem' }}>⚖️</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                Hồ Sơ Khiếu Nại #{dispute.id}
              </h2>
              <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: isClosed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.15)',
                color: isClosed ? '#10b981' : '#d97706',
                border: isClosed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.4)'
              }}>
                {isClosed ? 'Đã phân xử' : 'Đang xử lý'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
              Dự án: <strong>{dispute.jobTitle}</strong> · Tiền ký quỹ: <strong>{fmtVND(dispute.amount)}</strong>
            </p>
          </div>
        </div>

        {/* 72-Hour Countdown or Resolution Banner */}
        {isClosed ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>🏁</span>
              <strong style={{ color: '#047857', fontSize: '0.95rem' }}>Phán quyết Trọng tài SkillBridge</strong>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: 'var(--ink)' }}>
              Quyết định: <strong>{dispute.decision === 'accept' ? 'Chấp thuận yêu cầu Sinh viên (Giải ngân 100%)' : (dispute.decision === 'reject' ? 'Chấp thuận Nhà tuyển dụng (Hoàn cọc 100%)' : 'Hòa giải & Phân chia tỷ lệ')}</strong>
            </p>
            {dispute.payoutAmount > 0 && (
              <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: 'var(--ink)' }}>
                Số tiền giải ngân cho sinh viên: <strong style={{ color: 'var(--primary)' }}>{fmtVND(dispute.payoutAmount)}</strong>
              </p>
            )}
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
              Biên bản: "{dispute.resolvedNote || 'Đã tất toán và đóng hồ sơ vụ việc.'}"
            </p>
          </div>
        ) : (
          <div style={{
            background: isExpired ? 'rgba(239, 68, 68, 0.08)' : 'rgba(79, 70, 229, 0.08)',
            border: isExpired ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(79, 70, 229, 0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⏳</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)' }}>
                  Thời hạn nộp chứng cứ bổ sung (72 giờ)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                  {isExpired ? 'Thời hạn nộp chứng cứ đã kết thúc. Trọng tài viên đang xem xét hồ sơ.' : 'Sau thời hạn này, Trọng tài sẽ tiến hành phân xử dựa trên chứng cứ hiện có.'}
                </div>
              </div>
            </div>
            <div style={{
              fontWeight: 700,
              fontSize: '0.95rem',
              color: isExpired ? '#ef4444' : 'var(--primary)',
              whiteSpace: 'nowrap',
              background: 'var(--surface)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              {countdownText}
            </div>
          </div>
        )}

        {/* Dispute Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
          padding: '14px',
          borderRadius: '10px',
          background: 'var(--surface-2)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>Bên mở khiếu nại</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginTop: '2px' }}>
              {dispute.filedBy === 'employer' ? `Nhà tuyển dụng (${dispute.employerName})` : `Sinh viên (${dispute.studentName})`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>Thời điểm mở hồ sơ</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginTop: '2px' }}>
              {new Date(dispute.filedAt).toLocaleString('vi-VN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>Số lượng bằng chứng</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginTop: '2px' }}>
              {dispute.evidences?.length || 0} tệp chứng cứ
            </div>
          </div>
        </div>

        {/* Reason Box */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '6px', color: 'var(--ink)' }}>
            Nội dung khiếu nại ban đầu:
          </div>
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            fontSize: '0.875rem',
            lineHeight: '1.6',
            color: 'var(--ink)',
            whiteSpace: 'pre-wrap'
          }}>
            {dispute.reason}
          </div>
        </div>

        {/* Evidence List */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--ink)' }}>
            Bằng chứng & Biên bản đã nộp ({dispute.evidences?.length || 0})
          </h3>
          {(!dispute.evidences || dispute.evidences.length === 0) ? (
            <div style={{ padding: '20px', textAlign: 'center', background: 'var(--surface)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Chưa có tệp bằng chứng nào được tải lên.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dispute.evidences.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '20px' }}>📄</span>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {e.description || 'Tệp chứng cứ'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                        Nộp bởi: <strong>{e.uploadedByName}</strong> ({e.uploadedByRole === 'employer' ? 'Nhà tuyển dụng' : 'Sinh viên'}) · {new Date(e.uploadedAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  {e.fileUrl && (
                    <a
                      href={e.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: 'var(--surface-2)',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        border: '1px solid var(--border)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Xem / Tải về
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit New Evidence Form (Only if open and within 72h) */}
        {dispute.canSubmitEvidence && (
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)' }}>
              Nộp thêm bằng chứng phản biện (Còn trong hạn 72h)
            </h4>
            <form onSubmit={handleAddEvidence}>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Ghi chú mô tả bằng chứng (ví dụ: Ảnh chụp màn hình trao đổi yêu cầu)..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem', color: 'var(--ink)' }}
                />
                <button
                  type="submit"
                  disabled={submittingEvidence || !newFile}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: (submittingEvidence || !newFile) ? 'not-allowed' : 'pointer',
                    opacity: (submittingEvidence || !newFile) ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {submittingEvidence ? 'Đang tải lên...' : 'Tải lên chứng cứ'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
