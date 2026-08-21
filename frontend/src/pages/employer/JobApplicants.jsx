import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import DashboardSidebar from '../../components/DashboardSidebar';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useConfirm } from '../../context/ConfirmContext';
import { DeliverablePreview } from '../../components/modals/DeliverableModals';
import { slugify } from '../../data/companies';

const STATUS_LABEL = {
  open: 'Đang tuyển', filled: 'Đã đầy', in_progress: 'Đang thực hiện', submitted: 'Chờ xác nhận bàn giao',
  revision_requested: 'Đang chờ SV sửa lại', completed: 'Hoàn thành', cancelled: 'Đã hủy',
};

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

export default function JobApplicants() {
  const { jobId } = useParams();
  const { state, deleteJob, cancelJob, markJobComplete, startEditJob, openChatWithPerson } = useStore();
  const { openModal } = useModal();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const job = state.myJobs.find((j) => String(j.id) === String(jobId));

  if (!job) {
    return (
      <div className="page active">
        <div className="acct-settings-layout">
          <DashboardSidebar activeTab="jobs" />
          <div className="acct-content">
            <h1 className="acct-content-title">Không tìm thấy tin đăng</h1>
            <p style={{ color: 'var(--ink-soft)', marginTop: 10 }}>Tin đăng này có thể đã bị xóa.</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard?tab=jobs')}>← Về Tin đã đăng</button>
          </div>
        </div>
      </div>
    );
  }

  const wasEscrowed = ['in_progress', 'submitted', 'revision_requested'].includes(job.status);
  const hasHired = !!job.hiredApplicant;

  const handleCancel = async () => {
    const msg = wasEscrowed
      ? `Hủy công việc "${job.title}"? Số tiền ký quỹ ${fmtVND(job.escrowAmount || job.budget)} sẽ được hoàn lại vào ví của bạn.`
      : `Hủy tin tuyển dụng "${job.title}"? Hành động này không thể hoàn tác.`;
    if (await confirm(msg, { danger: true, confirmLabel: 'Xác nhận hủy' })) { cancelJob(job.id); navigate('/dashboard?tab=jobs'); }
  };
  const handleDelete = async () => {
    if (await confirm(`Xóa tin "${job.title}"? Hành động này không thể hoàn tác.`, { danger: true, confirmLabel: 'Xóa tin' })) { deleteJob(job.id); navigate('/dashboard?tab=jobs'); }
  };
  const handleMarkComplete = async () => {
    const msg = job.deliverable
      ? `Xác nhận "${job.title}" đã hoàn thành? Tiền ký quỹ sẽ được giải ngân cho ${job.hiredApplicant}.`
      : `Sinh viên chưa nộp bàn giao qua hệ thống. Vẫn xác nhận "${job.title}" đã hoàn thành và giải ngân ${fmtVND(job.escrowAmount || job.budget)} cho ${job.hiredApplicant}?`;
    if (await confirm(msg, { confirmLabel: 'Xác nhận hoàn thành' })) { markJobComplete(job.id); openModal('receipt', { justCompletedId: job.id }); }
  };

  return (
    <div className="page active">
      <div className="acct-settings-layout">
        <DashboardSidebar activeTab="jobs" />
        <div className="acct-content">
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate('/dashboard?tab=jobs')}>
            ← Về Tin đã đăng
          </button>

          <h1 className="acct-content-title">👥 Ứng viên · {job.title}</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6 }}>
            {job.applicants.length} ứng viên · Trạng thái: {STATUS_LABEL[job.status] || job.status}
          </p>

          <div className="dash-panel dash-panel-pad" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <button className="btn btn-outline btn-sm" onClick={() => openModal('viewJob', { jobId: job.id })}>👁 Xem tin</button>
              <button
                className="btn btn-outline btn-sm"
                disabled={hasHired}
                title={hasHired ? 'Không thể sửa tin đã có ứng viên được thuê' : undefined}
                onClick={() => { if (hasHired) return; startEditJob(job.id); navigate('/dashboard?tab=post'); }}>
                ✏️ Sửa tin
              </button>
              {job.status === 'in_progress' && (
                <button className="btn btn-outline btn-sm" onClick={handleMarkComplete}>✓ Đánh dấu hoàn thành</button>
              )}
              {wasEscrowed || job.status === 'open' ? (
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={handleCancel}>✕ Hủy việc & hoàn tiền</button>
              ) : null}
              <button
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                disabled={hasHired}
                title={hasHired ? 'Không thể xóa tin đã có ứng viên được thuê' : undefined}
                onClick={() => { if (hasHired) return; handleDelete(); }}>
                🗑 Xóa tin
              </button>
            </div>

            {job.deliverable && (
              <div className="empty-state" style={{ textAlign: 'left', background: 'var(--surface)', borderRadius: 12, padding: 14, margin: '14px 0' }}>
                <b>📤 Bàn giao từ {job.hiredApplicant} — phiên bản {job.deliverable.version || 1}</b>
                <DeliverablePreview d={job.deliverable} revealFinal={job.status === 'completed'} />
                <p style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>{job.deliverable.note || 'Không có ghi chú thêm.'}</p>
                <p style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-soft)' }}>Nộp lúc: {job.deliverable.submittedAt}</p>
                {job.status === 'submitted' && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => openModal('deliverableReview', { jobId: job.id })}>✓ Xem & xác nhận giải ngân</button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                      disabled={job.revisionCount >= job.revisionLimit}
                      onClick={() => openModal('revision', { jobId: job.id })}>
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
              <div className="empty-state" style={{ textAlign: 'left', margin: '14px 0' }}>
                ⏳ Đang chờ <b>{job.hiredApplicant}</b> nộp bàn giao · Hạn: <b>{formatDeadline(job.deadlineAt)}</b>
              </div>
            )}

            {job.applicants.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 14 }}>Chưa có ứng viên nào.</div>
            ) : (
              job.applicants.map((a, idx) => {
                const isHiredOne = job.hiredApplicant === a.name;
                const isLocked = hasHired && !isHiredOne;
                return (
                  <div className="applicant-row" key={idx} style={isLocked ? { opacity: 0.45, pointerEvents: 'none' } : undefined}>
                    {tierIconEl(a.tier)}
                    <div
                      className="app-main"
                      style={{ cursor: isLocked ? 'default' : 'pointer' }}
                      onClick={() => { if (!isLocked) navigate(`/u/${slugify(a.name)}`); }}
                    >
                      <b>{a.name}{isHiredOne ? <span className="chip chip-lime" style={{ padding: '2px 8px', fontSize: 10, marginLeft: 6 }}>Đã thuê</span> : ''}
                        {a.rejected ? <span className="chip" style={{ padding: '2px 8px', fontSize: 10, opacity: 0.65, marginLeft: 6 }}>Đã từ chối</span> : ''}</b>
                      <span>{a.tags}</span>
                    </div>
                    <div className="app-score">{a.score} điểm</div>
                    <div className="app-actions">
                      {job.status === 'open' && (
                        <button className="accept labeled" title="Thuê & thanh toán" onClick={() => openModal('hire', { jobId: job.id, applicantIdx: idx })}>
                          <Icon name="check" /> Thuê
                        </button>
                      )}
                      <button className="reject" title="Nhắn tin" disabled={isLocked} onClick={() => openChatWithPerson(a.name)}><Icon name="chat" /></button>
                      <button className="reject" title="Xem hồ sơ" disabled={isLocked} onClick={() => navigate(`/u/${slugify(a.name)}`)}><Icon name="eye" /></button>
                      <button className="reject" title="Báo cáo vi phạm" style={{ color: 'var(--coral)' }} disabled={isLocked} onClick={() => openModal('report', { withName: a.name })}>🚩</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}