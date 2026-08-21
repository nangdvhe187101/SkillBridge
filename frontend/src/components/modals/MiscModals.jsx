import ModalShell from './ModalShell';
import Icon from '../Icon';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useNavigate } from 'react-router-dom';

export function ReceiptModal({ onClose, justCompletedId }) {
  const { state } = useStore();
  const { openModal } = useModal();
  const receipt = justCompletedId
    ? state.receipts.find((r) => r.dashJobId === justCompletedId) || state.receipts[0]
    : state.receipts[0];
  if (!receipt) { onClose(); return null; }
  const job = state.myJobs.find((j) => j.id === receipt.dashJobId) || state.myJobs.find((j) => j.title === receipt.jobTitle);

  const proceed = () => {
    onClose();
    if (job) openModal('review', { jobTitle: job.title, withName: job.hiredApplicant, direction: 'toStudent', dashJobId: job.id });
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>🧾 Biên nhận giao dịch</h3>
      <div className="checkout-summary">
        <div className="cs-row"><span>Công việc</span><span>{receipt.jobTitle}</span></div>
        <div className="cs-row"><span>Sinh viên nhận</span><span>{receipt.student}</span></div>
        <div className="cs-row"><span>Ngân sách</span><span>{fmtVND(receipt.budget)}</span></div>
        <div className="cs-row"><span>Hoa hồng nền tảng</span><span>{fmtVND(receipt.commission)}</span></div>
        <div className="cs-row total"><span>Tổng đã thanh toán</span><span>{fmtVND(receipt.total)}</span></div>
        <div className="cs-row"><span>Thời gian</span><span>{receipt.date}</span></div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Biên nhận được lưu trong Ví của bạn — có thể dùng làm căn cứ minh bạch thu nhập/nghĩa vụ thuế.</p>
      <div className="modal-actions"><button className="btn btn-primary btn-block" onClick={proceed}>Đã hiểu, tiếp tục đánh giá</button></div>
    </ModalShell>
  );
}

export function ViewJobModal({ onClose, jobId }) {
  const { state, startEditJob } = useStore();
  const navigate = useNavigate();
  const job = state.myJobs.find((j) => j.id === jobId);
  if (!job) return null;
  return (
    <ModalShell onClose={onClose}>
      <h3>{job.title}</h3>
      <div className="modal-tags">
        <span className="chip">{job.cat}</span>
        <span className="chip">{fmtVND(job.budget)}</span>
        {job.urgent && <span className="chip chip-coral">Gấp</span>}
        <span className="djr-status" style={{ display: 'inline-block' }}>{job.status === 'open' ? 'Đang tuyển' : job.status}</span>
      </div>
      <p>{job.desc}</p>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={() => { onClose(); startEditJob(job.id); navigate('/dashboard?tab=post'); }}>Chỉnh sửa tin</button>
        <button className="btn btn-outline" onClick={onClose}>Đóng</button>
      </div>
    </ModalShell>
  );
}

export function ReportModal({ onClose, withName }) {
  return (
    <ModalShell onClose={onClose}>
      <h3>🚩 Báo cáo {withName}</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Cho chúng tôi biết vấn đề bạn gặp phải — đội ngũ Trust & Safety sẽ xem xét trong 24 giờ.</p>
      <div className="field">
        <label>Lý do báo cáo</label>
        <select defaultValue="Không phản hồi">
          <option>Không phản hồi</option>
          <option>Quỵt tiền / không thanh toán</option>
          <option>Yêu cầu ngoài phạm vi thoả thuận</option>
          <option>Ngôn từ không phù hợp</option>
          <option>Khác</option>
        </select>
      </div>
      <div className="field"><label>Mô tả chi tiết</label><textarea placeholder="Mô tả tình huống..." /></div>
      <div className="modal-actions">
        <button className="btn btn-primary" style={{ background: 'var(--coral)' }} onClick={onClose}>Gửi báo cáo</button>
        <button className="btn btn-outline" onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function SuccessModal({ onClose, title, message }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div className="success-tick" style={{ margin: '0 auto 14px', width: 56, height: 56, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" style={{ width: 28, height: 28, color: 'var(--ink-fixed)' }} />
        </div>
        <h3>{title}</h3>
        <p style={{ color: 'var(--ink-soft)', marginTop: 8 }} dangerouslySetInnerHTML={{ __html: message }} />
      </div>
      <div className="modal-actions"><button className="btn btn-primary btn-block" onClick={onClose}>Đóng</button></div>
    </ModalShell>
  );
}