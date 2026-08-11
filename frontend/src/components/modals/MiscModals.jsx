import ModalShell from './ModalShell';
import Icon from '../Icon';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useNavigate } from 'react-router-dom';
import { DeliverablePreview } from './DeliverableModals';
import { slugify } from '../../data/companies';

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

function tierIconEl(tier) {
  return (
    <span className={'stamp stamp-sm stamp-' + tier} style={{ width: 24, height: 24, flexShrink: 0 }}>
      <Icon name="check" style={{ width: 11, height: 11 }} />
    </span>
  );
}

function formatDeadline(ts) {
  if (!ts) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return 'Đã quá hạn';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `còn ${days} ngày ${hours} giờ`;
  return `còn ${hours} giờ`;
}

export function ApplicantsModal({ onClose, jobId }) {
  const { state, deleteJob, cancelJob, markJobComplete, startEditJob } = useStore();
  const { openModal } = useModal();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const job = state.myJobs.find((j) => j.id === jobId);
  if (!job) return null;

  const statusLbl = { open: 'Đang tuyển', filled: 'Đã đầy', in_progress: 'Đang thực hiện', submitted: 'Chờ xác nhận bàn giao', revision_requested: 'Đang chờ SV sửa lại', completed: 'Hoàn thành', cancelled: 'Đã hủy' };

  const wasEscrowed = ['in_progress', 'submitted', 'revision_requested'].includes(job.status);
  const handleCancel = async () => {
    const msg = wasEscrowed
      ? `Hủy công việc "${job.title}"? Số tiền ký quỹ ${fmtVND(job.escrowAmount || job.budget)} sẽ được hoàn lại vào ví của bạn.`
      : `Hủy tin tuyển dụng "${job.title}"? Hành động này không thể hoàn tác.`;
    if (await confirm(msg, { danger: true, confirmLabel: 'Xác nhận hủy' })) { cancelJob(job.id); onClose(); }
  };
  const handleDelete = async () => {
    if (await confirm(`Xóa tin "${job.title}"? Hành động này không thể hoàn tác.`, { danger: true, confirmLabel: 'Xóa tin' })) { deleteJob(job.id); onClose(); }
  };
  const handleMarkComplete = async () => {
    const msg = job.deliverable
      ? `Xác nhận "${job.title}" đã hoàn thành? Tiền ký quỹ sẽ được giải ngân cho ${job.hiredApplicant}.`
      : `Sinh viên chưa nộp bàn giao qua hệ thống. Vẫn xác nhận "${job.title}" đã hoàn thành và giải ngân ${fmtVND(job.escrowAmount || job.budget)} cho ${job.hiredApplicant}?`;
    if (await confirm(msg, { confirmLabel: 'Xác nhận hoàn thành' })) { markJobComplete(job.id); onClose(); openModal('receipt', { justCompletedId: job.id }); }
  };

  return (
    <ModalShell onClose={onClose} wide>
      <h3>👥 Ứng viên · {job.title}</h3>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14 }}>{job.applicants.length} ứng viên · Trạng thái: {statusLbl[job.status] || job.status}</p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-outline btn-sm" onClick={() => { onClose(); openModal('viewJob', { jobId: job.id }); }}>👁 Xem tin</button>
        <button className="btn btn-outline btn-sm" onClick={() => { startEditJob(job.id); onClose(); navigate('/post-job'); }}>✏️ Sửa tin</button>
        {job.status === 'in_progress' && (
          <button className="btn btn-outline btn-sm" onClick={handleMarkComplete}>✓ Đánh dấu hoàn thành</button>
        )}
        {wasEscrowed || job.status === 'open' ? (
          <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={handleCancel}>✕ Hủy việc & hoàn tiền</button>
        ) : null}
        <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={handleDelete}>🗑 Xóa tin</button>
      </div>

      {job.deliverable && (
        <div className="empty-state" style={{ textAlign: 'left', background: 'var(--surface)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <b>📤 Bàn giao từ {job.hiredApplicant} — phiên bản {job.deliverable.version || 1}</b>
          <DeliverablePreview d={job.deliverable} revealFinal={job.status === 'completed'} />
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>{job.deliverable.note || 'Không có ghi chú thêm.'}</p>
          <p style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-soft)' }}>Nộp lúc: {job.deliverable.submittedAt}</p>
          {job.status === 'submitted' && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { onClose(); openModal('deliverableReview', { jobId: job.id }); }}>✓ Xem & xác nhận giải ngân</button>
              <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                disabled={job.revisionCount >= job.revisionLimit}
                onClick={() => { onClose(); openModal('revision', { jobId: job.id }); }}>
                ✏️ Yêu cầu sửa{job.revisionCount >= job.revisionLimit ? ' (đã hết lượt)' : ''}
              </button>
            </div>
          )}
          {job.status === 'revision_requested' && (
            <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--coral)' }}>⏳ Đang chờ {job.hiredApplicant} nộp lại theo góp ý.</p>
          )}
          {job.deliverableFeedback?.length > 0 && (
            <details style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>📝 Lịch sử yêu cầu sửa ({job.revisionCount}/{job.revisionLimit})</summary>
              {job.deliverableFeedback.map((f, i) => (
                <p key={i} style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-soft)' }}>Phiên bản {f.version} · {f.at}: "{f.text}"</p>
              ))}
            </details>
          )}
        </div>
      )}
      {!job.deliverable && ['in_progress', 'revision_requested'].includes(job.status) && (
        <div className="empty-state" style={{ textAlign: 'left', marginBottom: 14 }}>
          ⏳ Đang chờ <b>{job.hiredApplicant}</b> nộp bàn giao · Hạn: <b>{formatDeadline(job.deadlineAt)}</b>
        </div>
      )}

      {job.applicants.length === 0 ? (
        <div className="empty-state">Chưa có ứng viên nào.</div>
      ) : (
        job.applicants.map((a, idx) => (
          <div className="applicant-row" key={idx}>
            {tierIconEl(a.tier)}
            <div className="app-main" style={{ cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/u/${slugify(a.name)}`); }}>
              <b>{a.name}{job.hiredApplicant === a.name ? <span className="chip chip-lime" style={{ padding: '2px 8px', fontSize: 10, marginLeft: 6 }}>Đã thuê</span> : ''}
                {a.rejected ? <span className="chip" style={{ padding: '2px 8px', fontSize: 10, opacity: 0.65, marginLeft: 6 }}>Đã từ chối</span> : ''}</b>
              <span>{a.tags}</span>
            </div>
            <div className="app-score">{a.score} điểm</div>
            <div className="app-actions">
              {job.status === 'open' && (
                <button className="accept labeled" title="Thuê & thanh toán" onClick={() => { onClose(); openModal('hire', { jobId: job.id, applicantIdx: idx }); }}>
                  <Icon name="check" /> Thuê
                </button>
              )}
              <button className="reject" title="Nhắn tin" onClick={() => { onClose(); openModal('chat', { withName: a.name }); }}><Icon name="chat" /></button>
              <button className="reject" title="Xem hồ sơ" onClick={() => { onClose(); navigate(`/u/${slugify(a.name)}`); }}><Icon name="eye" /></button>
              <button className="reject" title="Báo cáo vi phạm" style={{ color: 'var(--coral)' }} onClick={() => { onClose(); openModal('report', { withName: a.name }); }}>🚩</button>
            </div>
          </div>
        ))
      )}
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
        <button className="btn btn-primary" onClick={() => { onClose(); startEditJob(job.id); navigate('/post-job'); }}>Chỉnh sửa tin</button>
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
