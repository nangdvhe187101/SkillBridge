import { useState, useEffect } from 'react';
import Icon from '../Icon';
import ModalShell from './ModalShell';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { createReview, getJobReviews } from '../../api/reviewApi';

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
  existingReview = null,
  completedAt = null,
  isWithin3Days = undefined,
  remainingHours = undefined,
  canEarnBonus = undefined
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
  const [bonusState, setBonusState] = useState(() => {
    if (canEarnBonus !== undefined || isWithin3Days !== undefined) {
      return {
        canEarn: Boolean(canEarnBonus ?? isWithin3Days),
        hoursLeft: remainingHours ?? null,
        loaded: true
      };
    }
    if (completedAt) {
      const elapsed = Math.max(0, Date.now() - new Date(completedAt).getTime());
      const threeDaysMs = 72 * 3600000;
      return {
        canEarn: elapsed <= threeDaysMs,
        hoursLeft: Math.max(0, (threeDaysMs - elapsed) / 3600000),
        loaded: true
      };
    }
    return {
      canEarn: true,
      hoursLeft: null,
      loaded: false
    };
  });

  useEffect(() => {
    if (isToEmployer && actualJobId && !bonusState.loaded) {
      getJobReviews(actualJobId)
        .then((summary) => {
          if (summary) {
            setBonusState({
              canEarn: summary.canEarnBonusPoints ?? true,
              hoursLeft: summary.hoursRemainingForBonus ?? null,
              loaded: true
            });
          }
        })
        .catch((err) => {
          console.debug('Không thể tải thông tin điểm thưởng đánh giá:', err);
        });
    }
  }, [isToEmployer, actualJobId, bonusState.loaded]);

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

      const res = await createReview({
        jobId: Number(actualJobId),
        stars: Number(stars),
        comment: comment.trim() || defaultComment,
      });

      if (res?.earnedBonusPoints) {
        showToast?.('🎉 Đánh giá thành công! Bạn nhận được +5 điểm uy tín (Reliability Score).', 'check');
      } else if (res?.bonusMessage) {
        showToast?.(res.bonusMessage, 'check');
      } else {
        showToast?.('Gửi đánh giá thành công! Cảm ơn bạn đã phản hồi.', 'check');
      }

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

        {existingReview.earnedBonusPoints && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(21, 128, 61, 0.1)',
            border: '1px solid rgba(21, 128, 61, 0.25)',
            color: '#15803d',
            fontSize: 12.5,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 6,
            marginBottom: 12
          }}>
            <span>⭐</span> Đã nhận +5 điểm uy tín (đánh giá trong thời hạn 3 ngày)
          </div>
        )}

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

      {isToEmployer && (
        <div style={{
          background: bonusState.canEarn ? 'rgba(234, 179, 8, 0.08)' : 'rgba(100, 116, 139, 0.08)',
          border: `1px solid ${bonusState.canEarn ? 'rgba(234, 179, 8, 0.3)' : 'rgba(100, 116, 139, 0.25)'}`,
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>
            {bonusState.canEarn ? '⚡' : '⏱️'}
          </span>
          <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            {bonusState.canEarn ? (
              <>
                <b style={{ color: '#ca8a04' }}>Thưởng +5 điểm uy tín (Reliability Score):</b> Bạn đang gửi đánh giá trong thời hạn 3 ngày kể từ khi nghiệm thu dự án
                {bonusState.hoursLeft !== null && bonusState.hoursLeft > 0 ? (
                  <span> (còn khoảng {Math.ceil(bonusState.hoursLeft)} giờ để nhận thưởng)</span>
                ) : (
                  <span> (tối đa 72 giờ)</span>
                )}.
              </>
            ) : (
              <>
                <b style={{ color: '#64748b' }}>Hết hạn nhận điểm thưởng (+5đ):</b> Đã quá thời hạn 3 ngày nhận điểm uy tín sau hoàn thành. Đánh giá của bạn vẫn sẽ được ghi nhận để phản hồi chất lượng đối tác!
              </>
            )}
          </div>
        </div>
      )}

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
