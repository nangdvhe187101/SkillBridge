import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import DashboardSidebar from '../../components/DashboardSidebar';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useConfirm } from '../../context/ConfirmContext';
import { DeliverablePreview } from '../../components/modals/DeliverableModals';
import { slugify } from '../../data/companies';
import '../../styles/account-settings.css';

const STATUS_LABEL = {
  open: 'Đang tuyển',
  filled: 'Đã đầy',
  in_progress: 'Đang thực hiện',
  submitted: 'Chờ xác nhận bàn giao',
  revision_requested: 'Đang chờ SV sửa lại',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function tierIconEl(tier) {
  return (
    <span className={'stamp stamp-sm stamp-' + tier} style={{ width: 24, height: 24, flexShrink: 0 }} title={`Xếp hạng: ${tier?.toUpperCase()}`}>
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
  const { state, deleteJob, cancelJob, startEditJob, openChatWithPerson } = useStore();
  const { openModal } = useModal();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [applicantFilter, setApplicantFilter] = useState('all'); // 'all' | 'pending' | 'hired' | 'rejected'

  const job = state.myJobs.find((j) => String(j.id) === String(jobId));

  const filteredApplicants = useMemo(() => {
    if (!job || !job.applicants) return [];
    return job.applicants.filter((a) => {
      const isHired = job.hiredApplicant === a.name;
      if (applicantFilter === 'hired') return isHired;
      if (applicantFilter === 'rejected') return a.rejected;
      if (applicantFilter === 'pending') return !isHired && !a.rejected;
      return true;
    });
  }, [job, applicantFilter]);

  if (!job) {
    return (
      <div className="page active">
        <div className="acct-settings-layout">
          <DashboardSidebar activeTab="jobs" />
          <div className="acct-content">
            <h1 className="acct-content-title">Không tìm thấy tin đăng</h1>
            <p style={{ color: 'var(--ink-soft)', marginTop: 10 }}>Tin tuyển dụng này có thể đã bị xóa hoặc không tồn tại.</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard?tab=jobs')}>
              ← Quay lại danh sách tin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const wasEscrowed = ['in_progress', 'submitted', 'revision_requested'].includes(job.status);
  const hasHired = !!job.hiredApplicant;

  const handleCancel = async () => {
    const msg = wasEscrowed
      ? `Xác nhận hủy công việc "${job.title}"? Số tiền ký quỹ ${fmtVND(job.escrowAmount || job.budget)} sẽ được hoàn lại vào ví của bạn.`
      : `Xác nhận hủy tin tuyển dụng "${job.title}"? Hành động này không thể hoàn tác.`;
    if (await confirm(msg, { danger: true, confirmLabel: wasEscrowed ? 'Hủy việc & Hoàn tiền' : 'Hủy tin đăng' })) {
      cancelJob(job.id);
      navigate('/dashboard?tab=jobs');
    }
  };

  const handleDelete = async () => {
    if (await confirm(`Xóa vĩnh viễn tin "${job.title}" khỏi hệ thống?`, { danger: true, confirmLabel: 'Xóa tin' })) {
      deleteJob(job.id);
      navigate('/dashboard?tab=jobs');
    }
  };

  return (
    <div className="page active">
      <div className="acct-settings-layout">
        <DashboardSidebar activeTab="jobs" />

        <div className="acct-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/dashboard?tab=jobs')}>
              ← Quay lại danh sách tin
            </button>
            <span className={'djr-status ' + job.status}>{STATUS_LABEL[job.status] || job.status}</span>
          </div>

          {/* Job Overview Banner */}
          <div className="dash-panel dash-panel-pad" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 20, margin: 0 }}>{job.title}</h2>
                  <span className="chip chip-lime">{fmtVND(job.budget)}</span>
                  <span className="chip">{job.cat}</span>
                  {job.urgent && <span className="chip chip-coral">Tuyển gấp</span>}
                </div>
                <div style={{ marginTop: 10, fontSize: 13, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  {job.hiredApplicant && (
                    <span style={{ background: 'rgba(108, 76, 255, 0.1)', color: '#6C4CFF', border: '1px solid rgba(108, 76, 255, 0.25)', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                      👤 Đang làm: {job.hiredApplicant}
                    </span>
                  )}
                  {wasEscrowed && job.deadlineAt && (
                    <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                      ⏰ Thời hạn: {formatDeadline(job.deadlineAt)}
                    </span>
                  )}
                  <span style={{ color: 'var(--ink-soft)', marginLeft: 4 }}>
                    📅 Đăng ngày: <b style={{ color: 'var(--ink)' }}>{job.posted || 'gần đây'}</b>
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-outline btn-sm" onClick={() => openModal('viewJob', { jobId: job.id })}>
                  👁 Xem chi tiết tin
                </button>

                {!hasHired && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => { startEditJob(job.id); navigate('/dashboard?tab=post'); }}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                )}

                {wasEscrowed ? (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                    onClick={handleCancel}
                  >
                    ✕ Hủy việc & Hoàn tiền
                  </button>
                ) : job.status === 'open' ? (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                    onClick={handleCancel}
                  >
                    ✕ Đóng tin tuyển dụng
                  </button>
                ) : null}

                {!hasHired && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                    onClick={handleDelete}
                  >
                    🗑 Xóa tin
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Deliverable Review Panel (If product submitted or in progress) */}
          {job.deliverable && (
            <div className="dash-panel dash-panel-pad" style={{ marginBottom: 24, border: '1px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📤</span> Sản phẩm bàn giao (Phiên bản {job.deliverable.version || 1})
                </h3>
                <span className="chip chip-lime">Nộp lúc: {job.deliverable.submittedAt}</span>
              </div>

              <DeliverablePreview d={job.deliverable} revealFinal={job.status === 'completed'} />

              {job.deliverable.note && (
                <div style={{ background: 'var(--surface)', padding: 12, borderRadius: 8, marginTop: 12, fontSize: 13 }}>
                  <b>Ghi chú từ sinh viên:</b> {job.deliverable.note}
                </div>
              )}

              {job.status === 'submitted' && (
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openModal('deliverableReview', { jobId: job.id })}
                  >
                    ✓ Nghiệm thu & Giải ngân {fmtVND(job.escrowAmount || job.budget)}
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                    disabled={job.revisionCount >= job.revisionLimit}
                    onClick={() => openModal('revision', { jobId: job.id })}
                  >
                    ✏️ Yêu cầu sửa đổi ({job.revisionCount || 0}/{job.revisionLimit} lượt)
                  </button>
                </div>
              )}

              {job.status === 'revision_requested' && (
                <div style={{ marginTop: 12, padding: 10, background: 'rgba(255, 92, 122, 0.1)', borderRadius: 8, color: 'var(--coral)', fontSize: 13 }}>
                  ⏳ Đang chờ <b>{job.hiredApplicant}</b> nộp lại phiên bản chỉnh sửa theo yêu cầu của bạn.
                </div>
              )}

              {job.deliverableFeedback?.length > 0 && (
                <details style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    📝 Xem lịch sử yêu cầu chỉnh sửa ({job.deliverableFeedback.length})
                  </summary>
                  <div style={{ marginTop: 8 }}>
                    {job.deliverableFeedback.map((f, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: '1px dashed var(--border)', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        <b>Phiên bản {f.version}</b> ({f.at}): "{f.text}"
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {!job.deliverable && ['in_progress', 'revision_requested'].includes(job.status) && (
            <div className="dash-panel dash-panel-pad" style={{ marginBottom: 24, textAlign: 'center', background: 'rgba(2, 132, 199, 0.04)', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>⏳</div>
              <b style={{ fontSize: 16, color: 'var(--ink)' }}>Đang trong quá trình thực hiện</b>
              <p style={{ color: 'var(--ink-soft)', marginTop: 6, fontSize: 13.5 }}>
                Sinh viên <b style={{ color: 'var(--ink)' }}>{job.hiredApplicant}</b> đang hoàn thiện sản phẩm. Thời hạn còn lại: <span style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', padding: '3px 8px', borderRadius: 6, fontWeight: 700, marginLeft: 4 }}>⏰ {formatDeadline(job.deadlineAt)}</span>
              </p>
            </div>
          )}

          {/* Applicants List */}
          <div className="dash-panel">
            <div className="dash-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <h4 style={{ margin: 0 }}>
                Hồ sơ ứng tuyển ({job.applicants?.length || 0})
              </h4>

              {/* Applicant Filter Tabs */}
              {job.applicants?.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={'btn btn-sm ' + (applicantFilter === 'all' ? 'btn-primary' : 'btn-outline')}
                    onClick={() => setApplicantFilter('all')}
                  >
                    Tất cả ({job.applicants.length})
                  </button>
                  <button
                    className={'btn btn-sm ' + (applicantFilter === 'pending' ? 'btn-primary' : 'btn-outline')}
                    onClick={() => setApplicantFilter('pending')}
                  >
                    Chờ duyệt
                  </button>
                  {hasHired && (
                    <button
                      className={'btn btn-sm ' + (applicantFilter === 'hired' ? 'btn-primary' : 'btn-outline')}
                      onClick={() => setApplicantFilter('hired')}
                    >
                      Đã thuê (1)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* List Body */}
            {job.applicants?.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                <b>Chưa có ứng viên nào nộp hồ sơ</b>
                <p style={{ color: 'var(--ink-soft)', marginTop: 4 }}>
                  Tin đăng của bạn đang hiển thị công khai trên bảng việc làm. Hồ sơ mới sẽ xuất hiện tại đây khi sinh viên ứng tuyển.
                </p>
              </div>
            ) : filteredApplicants.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                Không có ứng viên nào trong mục này.
              </div>
            ) : (
              filteredApplicants.map((a, idx) => {
                const isHiredOne = job.hiredApplicant === a.name;
                const isLocked = hasHired && !isHiredOne;

                return (
                  <div
                    className="applicant-row"
                    key={idx}
                    style={isLocked ? { opacity: 0.45 } : undefined}
                  >
                    {tierIconEl(a.tier)}

                    <div
                      className="app-main"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/u/${slugify(a.name)}`)}
                    >
                      <b>
                        {a.name}
                        {isHiredOne && (
                          <span className="chip chip-lime" style={{ padding: '2px 8px', fontSize: 11, marginLeft: 8 }}>
                            ✓ Đã thuê
                          </span>
                        )}
                        {a.rejected && (
                          <span className="chip" style={{ padding: '2px 8px', fontSize: 11, marginLeft: 8, opacity: 0.7 }}>
                            Đã từ chối
                          </span>
                        )}
                      </b>
                      <span>{a.tags || 'Kỹ năng chuyên môn'}</span>
                    </div>

                    <div className="app-score" title="Điểm uy tín sinh viên">
                      ⭐ {a.score || 95} điểm
                    </div>

                    <div className="app-actions" style={{ display: 'flex', gap: 6 }}>
                      {job.status === 'open' && !hasHired && (
                        <button
                          className="accept labeled"
                          title="Chọn thuê & tiến hành ký quỹ an toàn"
                          onClick={() => {
                            const realIdx = job.applicants.findIndex((x) => x.name === a.name);
                            openModal('hire', { jobId: job.id, applicantIdx: realIdx >= 0 ? realIdx : idx, applicantName: a.name });
                          }}
                        >
                          <Icon name="check" /> Thuê & Ký quỹ
                        </button>
                      )}

                      <button
                        className="reject"
                        title="Nhắn tin trao đổi"
                        onClick={() => openChatWithPerson(a.name)}
                      >
                        <Icon name="chat" />
                      </button>

                      <button
                        className="reject"
                        title="Xem chi tiết hồ sơ năng lực"
                        onClick={() => navigate(`/u/${slugify(a.name)}`)}
                      >
                        <Icon name="eye" />
                      </button>

                      <button
                        className="reject"
                        title="Báo cáo vi phạm"
                        style={{ color: 'var(--coral)' }}
                        onClick={() => openModal('report', { withName: a.name })}
                      >
                        🚩
                      </button>
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