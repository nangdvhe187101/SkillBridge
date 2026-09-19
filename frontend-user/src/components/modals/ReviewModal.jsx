import { useState } from 'react';
import Icon from '../Icon';
import ModalShell from './ModalShell';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { createReview } from '../../api/reviewApi';

const STAR_LABELS = {
  1: '1 sao - Kém / Không hài lòng',
  2: '2 sao - Tạm được / Cần cải thiện nhiều',
  3: '3 sao - Bình thường / Đạt yêu cầu',
  4: '4 sao - Tốt / Hài lòng',
  5: '5 sao - Tuyệt vời / Vượt mong đợi'
};

export default function ReviewModal({
  onClose,
  jobTitle,
  withName,
  direction = 'toStudent',
  dashJobId,
  jobId,
  onReviewed,
  existingReview = null
}) {
  const toastCtx = useToast();
  const store = useStore();
  const showToast = toastCtx?.showToast || store?.showToast;
  const refreshNotifications = store?.refreshNotifications;

  const actualJobId = jobId || dashJobId;
  const isToEmployer = direction === 'toEmployer';

  const [stars, setStars] = useState(existingReview ? existingReview.stars : 5);
  const [comment, setComment] = useState(existingReview ? (existingReview.comment || '') : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!actualJobId) {
      showToast?.('Không xác định được mã công việc', 'alert');
      return;
    }

    try {
      setIsSubmitting(true);
      const defaultComment = isToEmployer
        ? 'Nhà tuyển dụng chuyên nghiệp, thanh toán sòng phẳng, phản hồi nhanh!'
        : 'Sinh viên làm việc rất có trách nhiệm, đúng tiến độ và chất lượng tốt!';

      await createReview({
        jobId: Number(actualJobId),
        stars: Number(stars),
        comment: comment.trim() || defaultComment,
      });

      showToast?.('Gửi đánh giá thành công! Cảm ơn bạn đã phản hồi.', 'check');
      if (typeof refreshNotifications === 'function') {
        refreshNotifications();
      }
      if (typeof onReviewed === 'function') {
        onReviewed();
      }
      onClose();
    } catch (err) {
      console.error('Lỗi khi gửi đánh giá:', err);
      showToast?.(err.message || 'Không thể gửi đánh giá, vui lòng thử lại sau.', 'alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trường hợp xem lại đánh giá đã gửi
  if (existingReview) {
    return (
      <ModalShell onClose={onClose} review>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--ink)' }}>
          Chi tiết đánh giá
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--ink-soft)' }}>
          {isToEmployer
            ? `Đánh giá của bạn dành cho nhà tuyển dụng ${withName}`
            : `Đánh giá của bạn dành cho sinh viên ${withName}`}
          {' '}trong việc <b>"{jobTitle}"</b>
        </p>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div className="star-pick" style={{ justifyContent: 'center', pointerEvents: 'none' }}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} className={v <= stars ? 'on' : ''} type="button">
                <Icon name="star" style={{ width: 22, height: 22, fill: v <= stars ? '#eab308' : '#e2e8f0', stroke: v <= stars ? '#eab308' : '#cbd5e1' }} />
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#eab308', marginTop: 4 }}>
            {STAR_LABELS[stars]}
          </div>
        </div>

        <div style={{
          background: 'var(--surface-sunken, #f8fafc)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16,
          fontSize: 14,
          color: 'var(--ink)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap'
        }}>
          {existingReview.comment || 'Không có nhận xét thêm.'}
        </div>

        {existingReview.createdAt && (
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16, textAlign: 'right' }}>
            Đã gửi lúc: {new Date(existingReview.createdAt).toLocaleString('vi-VN')}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose} style={{ minWidth: 100 }}>
            Đóng
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} review>
      <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--ink)' }}>
        Đánh giá công việc
      </h3>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--ink-soft)' }}>
        {isToEmployer
          ? `Đánh giá nhà tuyển dụng ${withName} cho công việc "${jobTitle}"`
          : `Đánh giá "${jobTitle}" với ${withName}`}
      </p>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div className="star-pick" style={{ justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              className={v <= stars ? 'on' : ''}
              onClick={() => setStars(v)}
              type="button"
              title={`${v} sao`}
              style={{ cursor: 'pointer', padding: '4px' }}
            >
              <Icon
                name="star"
                style={{
                  width: 24,
                  height: 24,
                  fill: v <= stars ? '#eab308' : 'none',
                  stroke: v <= stars ? '#eab308' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              />
            </button>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ca8a04', marginTop: 4 }}>
          {STAR_LABELS[stars]}
        </div>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Nhận xét về quá trình hợp tác, thái độ, chất lượng sản phẩm và tiến độ bàn giao..."
        rows={4}
        maxLength={1000}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid var(--border, #cbd5e1)',
          fontSize: 14,
          fontFamily: 'inherit',
          resize: 'vertical',
          minHeight: 90
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, marginBottom: 14 }}>
        <span>Điểm đánh giá sẽ đóng góp vào điểm uy tín ({stars >= 4 ? '+ uy tín' : stars <= 2 ? '- uy tín' : 'không đổi'})</span>
        <span>{comment.length}/1000</span>
      </div>

      <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          className="btn btn-outline"
          onClick={onClose}
          disabled={isSubmitting}
          type="button"
        >
          Bỏ qua
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          type="button"
          style={{ minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
              <span>Đang gửi...</span>
            </>
          ) : (
            'Gửi đánh giá'
          )}
        </button>
      </div>
    </ModalShell>
  );
}
