import { useState } from 'react';
import ModalShell from './ModalShell';
import { useStore } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';

export default function ReviewModal({ onClose, jobTitle, withName, direction, dashJobId }) {
  const { submitReview, state } = useStore();
  const { openModal } = useModal();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const isToEmployer = direction === 'toEmployer';

  const submit = () => {
    submitReview({ withName, stars, comment: comment.trim() || 'Hợp tác rất tốt, sẽ tiếp tục làm việc cùng nhau!', direction, jobTitle });
    onClose();
    if (!isToEmployer && dashJobId) {
      const job = state.myJobs.find((j) => j.id === dashJobId);
      if (job && job.hiredApplicantIsMe) {
        const publicJob = state.jobs.find((pj) => pj.dashJobId === dashJobId);
        const empName = publicJob?.emp || 'Nhà tuyển dụng';
        setTimeout(() => openModal('review', { jobTitle: job.title, withName: empName, direction: 'toEmployer', dashJobId: job.id }), 400);
      }
    }
  };

  return (
    <ModalShell onClose={onClose} review>
      <h3>Đánh giá công việc</h3>
      <p style={{ marginBottom: 14 }}>
        {isToEmployer ? `Đánh giá nhà tuyển dụng ${withName} cho việc "${jobTitle}"` : `Đánh giá "${jobTitle}" với ${withName}`}
      </p>
      <div className="star-pick">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} className={v <= stars ? 'on' : ''} onClick={() => setStars(v)}>★</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Nhận xét về quá trình hợp tác..." />
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={submit}>Gửi đánh giá</button>
        <button className="btn btn-outline" onClick={onClose}>Bỏ qua</button>
      </div>
    </ModalShell>
  );
}
