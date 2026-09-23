import { useState, useMemo } from 'react';
import ModalShell from './ModalShell';
import Icon from '../Icon';
import { useToast } from '../../context/ToastContext';
import { requestDeadlineExtension } from '../../api/jobApi';

const QUICK_REASONS = [
  'Bổ sung hoàn thiện theo yêu cầu phát sinh mới',
  'Cần thêm thời gian kiểm thử và tối ưu hiệu năng',
  'Chờ tài nguyên / phản hồi phản biện từ đối tác',
  'Sự cố kỹ thuật đột xuất cần xử lý thêm',
  'Lý do khác'
];

function formatDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export default function DeadlineExtensionModal({ job, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [days, setDays] = useState(3);
  const [selectedQuickReason, setSelectedQuickReason] = useState(QUICK_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentDeadline = job?.deadlineAt ? new Date(job.deadlineAt) : new Date();
  const proposedDeadline = useMemo(() => {
    return new Date(currentDeadline.getTime() + days * 24 * 60 * 60 * 1000);
  }, [currentDeadline, days]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = selectedQuickReason === 'Lý do khác' ? customReason.trim() : selectedQuickReason;

    if (!finalReason || finalReason.length < 10) {
      showToast('Vui lòng nêu rõ lý do xin gia hạn tối thiểu 10 ký tự.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await requestDeadlineExtension(job.id || job.jobId, {
        additionalDays: days,
        reason: finalReason,
        currentDeadline: job?.deadlineAt
      });
      showToast('Đã gửi đề xuất xin gia hạn deadline tới Nhà tuyển dụng!', 'check');
      onSuccess?.(res);
      onClose();
    } catch (err) {
      showToast(err?.message || 'Không thể gửi đề xuất gia hạn.', 'x');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ padding: '6px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            <Icon name="clock" width={22} height={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Xin Gia Hạn Deadline
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Đề xuất thêm thời gian hoàn thiện dự án: <strong>{job?.title}</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Comparison Card */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            background: 'var(--surface-2)',
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '18px',
            border: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>
                Hạn chót hiện tại
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                {formatDateTime(currentDeadline)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 700 }}>
                Hạn đề xuất mới (+{days} ngày)
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                {formatDateTime(proposedDeadline)}
              </div>
            </div>
          </div>

          {/* Days Selection Chips */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
              Chọn số ngày xin gia hạn thêm:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 5, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: days === d ? 700 : 500,
                    border: days === d ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: days === d ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)',
                    color: days === d ? 'var(--primary)' : 'var(--ink)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  +{d} ngày
                </button>
              ))}
            </div>
          </div>

          {/* Quick Reason Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
              Lý do xin gia hạn:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {QUICK_REASONS.map((r) => (
                <label
                  key={r}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: selectedQuickReason === r ? 'var(--surface-2)' : 'transparent'
                  }}
                >
                  <input
                    type="radio"
                    name="quickReason"
                    value={r}
                    checked={selectedQuickReason === r}
                    onChange={(e) => setSelectedQuickReason(e.target.value)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Reason Textarea if needed */}
          {selectedQuickReason === 'Lý do khác' && (
            <div style={{ marginBottom: '18px' }}>
              <textarea
                required
                rows={3}
                placeholder="Vui lòng giải thích chi tiết lý do và kế hoạch hoàn thành..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          )}

          {/* Policy Note */}
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--ink-soft)',
            lineHeight: 1.5,
            marginBottom: '20px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)'
          }}>
            💡 <strong>Lưu ý:</strong> Đề xuất gia hạn cần được Nhà tuyển dụng bấm chấp thuận mới có hiệu lực chính thức. Hãy chủ động trao đổi qua tin nhắn để tạo sự tin cậy.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
              style={{ fontSize: '0.875rem', padding: '8px 16px' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontSize: '0.875rem', padding: '8px 20px', fontWeight: 600 }}
            >
              {submitting ? 'Đang gửi...' : 'Gửi đề xuất gia hạn'}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
