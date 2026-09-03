import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import ModalShell from '../../components/modals/ModalShell';
import DashboardSidebar from '../../components/DashboardSidebar';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useConfirm } from '../../context/ConfirmContext';
import { DeliverablePreview } from '../../components/modals/DeliverableModals';
import { slugify } from '../../data/companies';
import { getJobApplicants } from '../../api/applicationApi';
import { getJobById } from '../../api/jobApi';
import { getJobDeliverables } from '../../api/deliverableApi';
import { downloadCandidateCv, downloadJobAttachment } from '../../utils/fileDownloader';
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
    <span className={'stamp stamp-sm stamp-' + (tier || 'silver')} style={{ width: 24, height: 24, flexShrink: 0 }} title={`Xếp hạng: ${(tier || 'SILVER').toUpperCase()}`}>
      <Icon name="check" style={{ width: 11, height: 11 }} />
    </span>
  );
}

function formatDeadline(ts) {
  if (!ts) return '—';
  const time = typeof ts === 'string' || ts instanceof Date ? new Date(ts).getTime() : ts;
  if (isNaN(time)) return '—';
  const diff = time - Date.now();
  if (diff <= 0) return 'Đã quá hạn';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `còn ${days} ngày ${hours} giờ`;
  return `còn ${hours} giờ`;
}

const CANNED_TEMPLATES = [
  {
    id: 'interview',
    icon: '📞',
    title: 'Mời phỏng vấn nhanh online',
    text: (jobTitle, studentName) => `Chào ${studentName}, mình đã xem qua hồ sơ ứng tuyển của bạn cho công việc "${jobTitle}" và thấy rất ấn tượng. Bạn có thể sắp xếp 15 phút trao đổi trực tuyến (Google Meet/Zalo) trong hôm nay hoặc ngày mai không?`
  },
  {
    id: 'sample',
    icon: '📁',
    title: 'Yêu cầu gửi Portfolio mẫu',
    text: (jobTitle, studentName) => `Chào ${studentName}, cảm ơn bạn đã ứng tuyển vào "${jobTitle}". Để bên mình tiện đánh giá chuyên môn, bạn có thể gửi thêm link 1-2 sản phẩm hoặc dự án tương tự mà bạn đã từng thực hiện được không?`
  },
  {
    id: 'terms',
    icon: '🤝',
    title: 'Thỏa thuận tiến độ & bàn giao',
    text: (jobTitle, studentName) => `Chào ${studentName}, vị trí "${jobTitle}" bên mình cần hoàn thành đúng tiến độ. Bạn có thể cam kết bàn giao đúng hạn và bắt đầu làm việc ngay khi bên mình ký quỹ trên SkillBridge không?`
  },
  {
    id: 'reject',
    icon: '💌',
    title: 'Thư cảm ơn & Từ chối lịch sự',
    text: (jobTitle, studentName) => `Chào ${studentName}, cảm ơn bạn đã dành thời gian ứng tuyển vị trí "${jobTitle}". Đợt này bên mình đã tìm được ứng viên phù hợp với tiêu chí hiện tại. Chúc bạn luôn thành công và hy vọng có dịp hợp tác cùng bạn ở các dự án tiếp theo!`
  }
];

export default function JobApplicants() {
  const { jobId } = useParams();
  const { state, deleteJob, cancelJob, reopenJob, openChatWithPerson } = useStore();
  const { openModal } = useModal();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [applicantFilter, setApplicantFilter] = useState('all'); // 'all' | 'pending' | 'shortlisted' | 'hired' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('score_desc'); // 'score_desc' | 'newest' | 'jobs_done'
  const [apiApplicants, setApiApplicants] = useState([]);
  const [apiJob, setApiJob] = useState(null);
  const [apiDeliverables, setApiDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewStudentModal, setViewStudentModal] = useState(null);
  const [cannedModalApplicant, setCannedModalApplicant] = useState(null);
  const [extendDeadlineModalOpen, setExtendDeadlineModalOpen] = useState(false);

  // Shortlisted candidates stored in localStorage for persistence
  const [shortlistedIds, setShortlistedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`sb_shortlisted_${jobId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleShortlist = (applicantIdOrName) => {
    setShortlistedIds((prev) => {
      const next = prev.includes(applicantIdOrName)
        ? prev.filter((id) => id !== applicantIdOrName)
        : [...prev, applicantIdOrName];
      try {
        localStorage.setItem(`sb_shortlisted_${jobId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const localJob = state.myJobs.find((j) => String(j.id) === String(jobId));
  const latestDeliverable = apiDeliverables && apiDeliverables.length > 0 ? apiDeliverables[0] : null;
  const deliverableFeedbackList = (latestDeliverable?.feedbacks || []).map((f) => ({
    version: latestDeliverable.version,
    text: f.content,
    at: f.createdAt ? new Date(f.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
    author: f.authorName,
  }));

  const job = apiJob ? {
    ...localJob,
    ...apiJob,
    id: apiJob.id,
    title: apiJob.title,
    cat: apiJob.categoryName || localJob?.cat || 'Chung',
    budget: apiJob.budget || localJob?.budget || 0,
    urgent: apiJob.isUrgent || localJob?.urgent,
    status: apiJob.status || localJob?.status || 'open',
    deadlineAt: apiJob.deadlineAt || localJob?.deadlineAt,
    posted: apiJob.postedAt ? new Date(apiJob.postedAt).toLocaleDateString('vi-VN') : (localJob?.posted || 'Vừa đăng'),
    hiredApplicantId: apiJob.hiredApplicantId ?? localJob?.hiredApplicantId,
    hiredApplicant: apiJob.hiredStudentName || apiJob.hiredApplicant || localJob?.hiredApplicant,
    hiredStudentName: apiJob.hiredStudentName || localJob?.hiredStudentName,
    escrowAmount: apiJob.escrowAmount ?? localJob?.escrowAmount,
    deliverable: latestDeliverable || localJob?.deliverable,
    deliverableFeedback: deliverableFeedbackList.length > 0 ? deliverableFeedbackList : (localJob?.deliverableFeedback || []),
  } : localJob;

  const loadData = async () => {
    setLoading(true);
    try {
      const [applicantsRes, jobRes, deliverablesRes] = await Promise.allSettled([
        getJobApplicants(jobId),
        getJobById(jobId),
        getJobDeliverables(jobId),
      ]);
      if (jobRes.status === 'fulfilled' && jobRes.value) {
        setApiJob(jobRes.value);
      }
      if (applicantsRes.status === 'fulfilled' && applicantsRes.value) {
        const items = applicantsRes.value.items || applicantsRes.value || [];
        setApiApplicants(items);
      }
      if (deliverablesRes.status === 'fulfilled' && deliverablesRes.value) {
        const delivs = Array.isArray(deliverablesRes.value) ? deliverablesRes.value : [];
        setApiDeliverables(delivs);
      }
    } catch (e) {
      console.error('Lỗi khi tải ứng viên:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      loadData();
    }
  }, [jobId]);

  const allApplicants = useMemo(() => {
    if (apiApplicants && apiApplicants.length > 0) {
      return apiApplicants.map((a) => ({
        id: a.applicationId,
        studentId: a.studentId,
        name: a.studentName,
        email: a.studentEmail,
        phone: a.studentPhone,
        avatar: a.studentAvatarUrl,
        school: a.school || 'Sinh viên đại học',
        tier: a.tier || 'gold',
        score: a.reliabilityScore || 95,
        jobsDone: a.jobsDoneCount || 0,
        kycStatus: a.kycStatus || 'verified',
        status: a.status || 'pending',
        appliedAt: a.appliedAt ? new Date(a.appliedAt).toLocaleDateString('vi-VN') : 'Mới nộp',
        coverLetter: a.coverLetter,
        cvFileId: a.cvFileId,
        cvFileName: a.cvFileName,
        cvFileUrl: a.cvFileUrl,
        cvLabel: a.cvLabel,
        isHired: a.status === 'hired' || (job?.hiredApplicantId && a.studentId === job.hiredApplicantId) || job?.hiredApplicant === a.studentName || job?.hiredApplicant === a.name,
        rejected: a.status === 'rejected',
      }));
    }
    return (job?.applicants || []).map((a) => ({
      ...a,
      isHired: (job?.hiredApplicantId && a.studentId === job.hiredApplicantId) || job?.hiredApplicant === a.name || job?.hiredApplicant === a.studentName,
    }));
  }, [apiApplicants, job]);

  const shortlistedCount = useMemo(() => {
    return allApplicants.filter((a) => shortlistedIds.includes(a.id || a.name)).length;
  }, [allApplicants, shortlistedIds]);

  const pendingCount = useMemo(() => {
    return allApplicants.filter((a) => !a.isHired && !a.rejected).length;
  }, [allApplicants]);

  const filteredApplicants = useMemo(() => {
    let list = allApplicants.filter((a) => {
      const aKey = a.id || a.name;
      const isShortlisted = shortlistedIds.includes(aKey);

      if (applicantFilter === 'hired') return a.isHired;
      if (applicantFilter === 'rejected') return a.rejected;
      if (applicantFilter === 'pending') return !a.isHired && !a.rejected;
      if (applicantFilter === 'shortlisted') return isShortlisted;
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((a) =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.school || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.coverLetter || '').toLowerCase().includes(q) ||
        (a.phone || '').toLowerCase().includes(q)
      );
    }

    list.sort((x, y) => {
      if (sortBy === 'score_desc') return (y.score || 0) - (x.score || 0);
      if (sortBy === 'jobs_done') return (y.jobsDone || 0) - (x.jobsDone || 0);
      if (sortBy === 'newest') return (y.id || 0) - (x.id || 0);
      return 0;
    });

    return list;
  }, [allApplicants, applicantFilter, searchQuery, sortBy, shortlistedIds]);

  if (!job) {
    return (
      <div className="page active">
        <div className="acct-settings-layout">
          <DashboardSidebar activeTab="jobs" />
          <div className="acct-content">
            <h1 className="acct-content-title">Không tìm thấy tin đăng</h1>
            <p style={{ color: 'var(--ink-soft)', marginTop: 10 }}>Tin tuyển dụng này có thể đã bị xóa hoặc không tồn tại.</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/employer/jobs')}>
              ← Quay lại danh sách tin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const wasEscrowed = ['in_progress', 'submitted', 'revision_requested'].includes(job.status);
  const isWorking = ['in_progress', 'submitted', 'revision_requested', 'disputed'].includes(job.status);
  const canDelete = ['open', 'completed', 'cancelled'].includes(job.status);
  const hasHired = !!job.hiredApplicant || isWorking;

  const handleCancel = async () => {
    const msg = wasEscrowed
      ? `Xác nhận hủy công việc "${job.title}"? Số tiền ký quỹ ${fmtVND(job.escrowAmount || job.budget)} sẽ được hoàn lại vào ví của bạn.`
      : `Xác nhận đóng tin tuyển dụng "${job.title}"? Ứng viên sẽ không thể nộp hồ sơ vào tin này nữa.`;
    if (await confirm(msg, { danger: true, confirmLabel: wasEscrowed ? 'Hủy việc & Hoàn tiền' : 'Đóng tin tuyển dụng' })) {
      try {
        await cancelJob(job.id);
        navigate('/employer/jobs');
      } catch {
        // Error toast already handled by cancelJob
      }
    }
  };

  const handleReopen = async () => {
    if (await confirm(`Bạn có muốn mở lại tin tuyển dụng "${job.title}" để tiếp tục nhận hồ sơ từ ứng viên không?`, { confirmLabel: 'Mở lại tin' })) {
      try {
        await reopenJob(job.id);
        loadData();
      } catch {
        // Error toast already handled by reopenJob
      }
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      alert('Công việc đang trong quá trình thực hiện bởi sinh viên nên không thể xóa. Bạn chỉ có thể xóa sau khi hai bên đã hoàn tất giao dịch thành công (hoặc công việc đã đóng/hủy).');
      return;
    }
    if (await confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tin tuyển dụng "${job.title}" khỏi hệ thống? Hành động này không thể hoàn tác.`, { danger: true, confirmLabel: 'Xóa tin vĩnh viễn' })) {
      try {
        await deleteJob(job.id);
        navigate('/employer/jobs');
      } catch {
        // Error toast already handled by deleteJob
      }
    }
  };

  return (
    <div className="page active">
      <div className="acct-settings-layout">
        <DashboardSidebar activeTab="jobs" />

        <div className="acct-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/employer/jobs')}>
              ← Quay lại danh sách tin
            </button>
            <span className={'djr-status ' + job.status}>{STATUS_LABEL[job.status] || job.status}</span>
          </div>

          {/* Job Overview & Details Banner */}
          <div className="dash-panel dash-panel-pad" style={{ marginBottom: 20 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 21, margin: 0, color: 'var(--ink)' }}>{job.title}</h2>
                  <span className="chip chip-lime" style={{ fontSize: 13, fontWeight: 700 }}>{fmtVND(job.budget)}</span>
                  <span className="chip">{job.cat}</span>
                  {job.urgent && <span className="chip chip-coral">Tuyển gấp</span>}
                </div>
                <div style={{ marginTop: 10, fontSize: 13, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  {job.hiredApplicant && (
                    <span style={{ background: 'rgba(108, 76, 255, 0.1)', color: '#6C4CFF', border: '1px solid rgba(108, 76, 255, 0.25)', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
                      👤 Đang làm: {job.hiredApplicant}
                    </span>
                  )}
                  {wasEscrowed && job.deadlineAt ? (
                    <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
                      ⏰ Thời hạn còn lại: {formatDeadline(job.deadlineAt)}
                    </span>
                  ) : job.deadlineAt ? (
                    <span style={{ background: 'rgba(108, 76, 255, 0.08)', color: 'var(--primary)', border: '1px solid rgba(108, 76, 255, 0.2)', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
                      ⏱️ Thời hạn hoàn thành: {(() => {
                        const start = job.postedAt ? new Date(job.postedAt).getTime() : Date.now();
                        const end = new Date(job.deadlineAt).getTime();
                        const diffMs = end - start;
                        if (diffMs <= 0) return 'Linh hoạt';
                        const totalHours = Math.max(1, Math.round(diffMs / 3600000));
                        const days = Math.floor(totalHours / 24);
                        const hours = totalHours % 24;
                        if (days > 0 && hours > 0) return `${days} ngày ${hours} giờ`;
                        if (days > 0) return `${days} ngày`;
                        return `${hours} giờ`;
                      })()}
                    </span>
                  ) : null}
                  <span style={{ color: 'var(--ink-soft)' }}>
                    📅 Đăng ngày: <b style={{ color: 'var(--ink)' }}>{job.posted || 'gần đây'}</b>
                  </span>
                  {job.location && (
                    <span style={{ color: 'var(--ink-soft)' }}>
                      📍 Địa điểm: <b style={{ color: 'var(--ink)' }}>{job.location}</b>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Xuất hóa đơn / Biên lai ký quỹ */}
                {(wasEscrowed || job.status === 'completed') && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    onClick={() => openModal('receipt', { justCompletedId: job.id })}
                    title="Xem và xuất biên nhận thanh toán / phiếu thu điện tử"
                  >
                    🧾 Xuất hóa đơn / Phiếu thu
                  </button>
                )}

                {/* Đánh giá sinh viên khi hoàn thành */}
                {job.status === 'completed' && job.hiredApplicant && (
                  <button
                    className="btn btn-lime btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    onClick={() => openModal('review', { jobTitle: job.title, withName: job.hiredApplicant, direction: 'toStudent', dashJobId: job.id })}
                    title="Viết đánh giá và nhận xét chất lượng công việc cho sinh viên"
                  >
                    ⭐ Đánh giá sinh viên
                  </button>
                )}

                {/* Gia hạn thời gian khi đang thực hiện */}
                {isWorking && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#0284c7', borderColor: '#0284c7' }}
                    onClick={() => setExtendDeadlineModalOpen(true)}
                    title="Gia hạn thêm thời gian hoàn thành cho sinh viên"
                  >
                    ⏰ Gia hạn thời gian
                  </button>
                )}

                {!hasHired && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/employer/jobs/${job.id}/edit`)}
                  >
                    ✏️ Chỉnh sửa tin
                  </button>
                )}

                {job.status === 'cancelled' && (
                  <button
                    className="btn btn-lime btn-sm"
                    onClick={handleReopen}
                  >
                    🔄 Mở lại tin tuyển dụng
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

                {canDelete && (
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

            {/* Inline Job Content & Requirements Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 18 }}>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📝</span> Mô tả chi tiết công việc
                </h4>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {job.description || job.desc || 'Chưa có mô tả chi tiết.'}
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✅</span> Yêu cầu công việc & Tiêu chí
                </h4>
                {(() => {
                  const reqs = Array.isArray(job.requirements)
                    ? job.requirements.map((r) => (typeof r === 'string' ? r : r.requirementText))
                    : (Array.isArray(job.req) ? job.req : []);
                  if (reqs.length === 0) {
                    return <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>Hoàn thành công việc đúng tiến độ và chất lượng cam kết.</p>;
                  }
                  return (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink)', lineHeight: 1.7 }}>
                      {reqs.map((req, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>{req}</li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>

            {/* Attachments Section (if any) */}
            {(() => {
              const attachments = Array.isArray(job.attachments) ? job.attachments : [];
              if (attachments.length === 0) return null;
              return (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--border)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📎</span> Đề bài & Tài liệu đính kèm ({attachments.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {attachments.map((file, idx) => (
                      <div
                        key={file.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'rgba(0, 0, 0, 0.03)',
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: 12.5,
                        }}
                      >
                        <span>📄</span>
                        <b style={{ color: 'var(--ink)' }}>{file.fileName || file.name || 'Tai_lieu.pdf'}</b>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '2px 8px', marginLeft: 4 }}
                          onClick={() => downloadJobAttachment(file, job.title, job.id)}
                        >
                          ⬇ Tải về
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
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
                    onClick={() => openModal('deliverableReview', { jobId: job.id, deliverable: job.deliverable, job, onReviewed: loadData })}
                  >
                    ✓ Nghiệm thu & Giải ngân {fmtVND(job.escrowAmount || job.budget)}
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                    disabled={job.revisionCount >= job.revisionLimit}
                    onClick={() => openModal('revision', { jobId: job.id, deliverable: job.deliverable, job, onReviewed: loadData })}
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
            <div className="dash-panel dash-panel-pad" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(108, 76, 255, 0.05) 100%)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 26 }}>⏳</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink)' }}>Công việc đang trong tiến độ thực hiện</h3>
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                      Sinh viên được giao: <b style={{ color: 'var(--ink)' }}>{job.hiredApplicant}</b>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    ⏰ {formatDeadline(job.deadlineAt)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: '#0284c7', borderColor: '#0284c7', fontWeight: 600, background: '#fff' }}
                    onClick={() => setExtendDeadlineModalOpen(true)}
                  >
                    + Gia hạn thêm thời gian
                  </button>
                </div>
              </div>

              {/* Progress timeline bar */}
              <div style={{ width: '100%', height: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #0284c7, #6C4CFF)', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 6 }}>
                <span>Bắt đầu giao việc</span>
                <span>Hạn chót cam kết: {job.deadlineAt ? new Date(job.deadlineAt).toLocaleString('vi-VN') : 'Theo thỏa thuận'}</span>
              </div>
            </div>
          )}

          {/* Applicants List */}
          <div className="dash-panel">
            <div className="dash-panel-head" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>👥</span> Hồ sơ ứng tuyển ({allApplicants.length})
                </h4>

                {/* Sắp xếp ứng viên */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Sắp xếp:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ padding: '4px 10px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}
                  >
                    <option value="score_desc">⭐ Điểm uy tín cao nhất</option>
                    <option value="newest">📅 Mới ứng tuyển nhất</option>
                    <option value="jobs_done">💼 Nhiều việc đã xong nhất</option>
                  </select>
                </div>
              </div>

              {/* Smart Search Bar & Filter Tabs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {/* Search Box */}
                <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, opacity: 0.6 }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Tìm theo tên, trường, email, kỹ năng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 28px 6px 32px',
                      fontSize: 12.5,
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      boxSizing: 'border-box'
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-soft)' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Applicant Filter Tabs */}
                {allApplicants.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className={'btn btn-sm ' + (applicantFilter === 'all' ? 'btn-primary' : 'btn-outline')}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setApplicantFilter('all')}
                    >
                      Tất cả ({allApplicants.length})
                    </button>
                    <button
                      className={'btn btn-sm ' + (applicantFilter === 'pending' ? 'btn-primary' : 'btn-outline')}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setApplicantFilter('pending')}
                    >
                      Chờ duyệt ({pendingCount})
                    </button>
                    {shortlistedCount > 0 && (
                      <button
                        className={'btn btn-sm ' + (applicantFilter === 'shortlisted' ? 'btn-primary' : 'btn-outline')}
                        style={{ fontSize: 12, padding: '4px 10px', color: applicantFilter === 'shortlisted' ? '#fff' : '#eab308', borderColor: '#eab308' }}
                        onClick={() => setApplicantFilter('shortlisted')}
                      >
                        ⭐ Đã lưu ({shortlistedCount})
                      </button>
                    )}
                    {hasHired && (
                      <button
                        className={'btn btn-sm ' + (applicantFilter === 'hired' ? 'btn-primary' : 'btn-outline')}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => setApplicantFilter('hired')}
                      >
                        ✓ Đã thuê (1)
                      </button>
                    )}
                    {allApplicants.some(a => a.rejected) && (
                      <button
                        className={'btn btn-sm ' + (applicantFilter === 'rejected' ? 'btn-primary' : 'btn-outline')}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => setApplicantFilter('rejected')}
                      >
                        ✕ Đã từ chối
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* List Body */}
            {loading ? (
              <div className="empty-state" style={{ padding: '30px' }}>
                ⏳ Đang tải danh sách hồ sơ ứng viên...
              </div>
            ) : allApplicants.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                <b>Chưa có ứng viên nào nộp hồ sơ</b>
                <p style={{ color: 'var(--ink-soft)', marginTop: 4 }}>
                  Tin đăng của bạn đang hiển thị công khai trên bảng việc làm. Hồ sơ mới sẽ xuất hiện tại đây ngay khi sinh viên ứng tuyển.
                </p>
              </div>
            ) : filteredApplicants.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                Không tìm thấy ứng viên nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredApplicants.map((a, idx) => {
                const isHiredOne = a.isHired;
                const isLocked = hasHired && !isHiredOne;
                const isShortlisted = shortlistedIds.includes(a.id || a.name);

                return (
                  <div
                    className="applicant-row"
                    key={a.id || idx}
                    style={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 14,
                      opacity: isLocked ? 0.5 : 1,
                      borderBottom: '1px solid var(--border)',
                      padding: '18px 20px',
                      background: isHiredOne ? 'rgba(74, 222, 128, 0.04)' : isShortlisted ? 'rgba(234, 179, 8, 0.03)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <Avatar name={a.name} src={a.avatar} className="jc-av" fontSize={16} />

                        <div className="app-main">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <b
                              style={{ fontSize: 16, color: 'var(--ink)', cursor: 'pointer' }}
                              onClick={() => setViewStudentModal(a)}
                            >
                              {a.name}
                            </b>
                            {tierIconEl(a.tier)}
                            {isHiredOne && (
                              <span className="chip chip-lime" style={{ padding: '2px 8px', fontSize: 11 }}>
                                ✓ Đã thuê
                              </span>
                            )}
                            {isShortlisted && (
                              <span className="chip" style={{ padding: '2px 8px', fontSize: 11, background: 'rgba(234, 179, 8, 0.12)', color: '#b45309', fontWeight: 600 }}>
                                ⭐ Tiềm năng
                              </span>
                            )}
                            {a.rejected && (
                              <span className="chip" style={{ padding: '2px 8px', fontSize: 11, opacity: 0.7 }}>
                                Đã từ chối
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              🎓 <b>{a.school}</b>
                            </span>
                            {a.email && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
                                ✉️ <b>{a.email}</b>
                              </span>
                            )}
                            {a.phone && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981' }}>
                                📞 <b>{a.phone}</b>
                              </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              📅 <b>{a.appliedAt}</b>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="app-score" title="Độ uy tín & số công việc hoàn thành" style={{ fontWeight: 600, fontSize: 13, textAlign: 'right' }}>
                          <div>⭐ {a.score}/100</div>
                          <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 400 }}>{a.jobsDone} việc xong</span>
                        </div>

                        <div className="app-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {/* Nút Đánh dấu sao / Shortlist */}
                          <button
                            type="button"
                            className="reject"
                            style={{
                              color: isShortlisted ? '#eab308' : 'var(--ink-soft)',
                              background: isShortlisted ? 'rgba(234, 179, 8, 0.1)' : 'transparent',
                              borderColor: isShortlisted ? '#eab308' : 'var(--border)'
                            }}
                            title={isShortlisted ? "Bỏ lưu ứng viên này" : "Lưu vào danh sách tiềm năng (Shortlist)"}
                            onClick={() => toggleShortlist(a.id || a.name)}
                          >
                            {isShortlisted ? '⭐' : '☆'}
                          </button>

                          {/* Nút Mẫu phản hồi nhanh (Canned Replies) */}
                          <button
                            type="button"
                            className="reject"
                            title="Chọn mẫu tin nhắn phản hồi nhanh"
                            onClick={() => setCannedModalApplicant(a)}
                          >
                            💬
                          </button>

                          {job.status === 'open' && !hasHired && (
                            <button
                              className="accept labeled"
                              title="Chọn thuê & tiến hành ký quỹ an toàn"
                              onClick={() => {
                                const realIdx = allApplicants.findIndex((x) => x.name === a.name);
                                openModal('hire', { jobId: job.id, applicantIdx: realIdx >= 0 ? realIdx : idx, applicantName: a.name, applicant: a, job, onHired: loadData });
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
                            onClick={() => setViewStudentModal(a)}
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
                    </div>

                    {/* Cover Letter & CV Attachment */}
                    {(a.coverLetter || a.cvFileName || a.cvFileId) && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: '12px 16px',
                          background: 'rgba(0, 0, 0, 0.02)',
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          fontSize: 13,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {a.coverLetter && (
                          <div style={{ color: 'var(--ink)', lineHeight: 1.5 }}>
                            <b>💬 Lời nhắn từ sinh viên:</b> "{a.coverLetter}"
                          </div>
                        )}
                        {(a.cvFileName || a.cvFileId) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: a.coverLetter ? 8 : 0, borderTop: a.coverLetter ? '1px dashed var(--border)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 20 }}>📄</span>
                              <div>
                                <b style={{ fontSize: 13.5, display: 'block' }}>{a.cvFileName || 'CV_UngVien.pdf'}</b>
                                <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Bản CV chuyên ngành gửi kèm hồ sơ</span>
                              </div>
                            </div>
                            {a.cvFileId && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: 12, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                onClick={() => downloadCandidateCv(a.cvFileId, a.cvFileName)}
                              >
                                ⬇ Tải CV về xem
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Canned Reply Modal */}
      {cannedModalApplicant && (
        <CannedReplyModal
          applicant={cannedModalApplicant}
          jobTitle={job.title}
          onClose={() => setCannedModalApplicant(null)}
          onSend={(msg) => {
            setCannedModalApplicant(null);
            openChatWithPerson(cannedModalApplicant.name, msg);
          }}
        />
      )}

      {/* Extend Deadline Modal */}
      {extendDeadlineModalOpen && (
        <ExtendDeadlineModal
          job={job}
          onClose={() => setExtendDeadlineModalOpen(false)}
          onExtend={(newDeadlineAt) => {
            setExtendDeadlineModalOpen(false);
            if (apiJob) setApiJob((prev) => ({ ...prev, deadlineAt: newDeadlineAt }));
          }}
        />
      )}

      {/* Quick View Student Modal */}
      {viewStudentModal && (
        <ModalShell onClose={() => setViewStudentModal(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Avatar name={viewStudentModal.name} src={viewStudentModal.avatar} fontSize={22} style={{ width: 56, height: 56 }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 19, display: 'flex', alignItems: 'center', gap: 8 }}>
                {viewStudentModal.name}
                <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px' }}>
                  ✓ Đã xác thực eKYC
                </span>
              </h3>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                🎓 {viewStudentModal.school} · ⭐ {viewStudentModal.score}/100 Điểm uy tín
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', padding: 14, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Thông tin liên hệ trực tiếp</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Gmail / Email:</span>
                <b>{viewStudentModal.email || 'Chưa cung cấp'}</b>
              </div>
              <div>
                <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Số điện thoại:</span>
                <b>{viewStudentModal.phone || 'Chưa cung cấp'}</b>
              </div>
              <div>
                <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Trường đại học:</span>
                <b>{viewStudentModal.school || 'Đại học / Cao đẳng'}</b>
              </div>
              <div>
                <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Công việc đã hoàn thành:</span>
                <b style={{ color: 'var(--primary)' }}>{viewStudentModal.jobsDone || 0} công việc</b>
              </div>
            </div>
          </div>

          {viewStudentModal.coverLetter && (
            <div style={{ marginBottom: 16, background: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 13.5 }}>💬 Thư giới thiệu / Lời nhắn:</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                "{viewStudentModal.coverLetter}"
              </p>
            </div>
          )}

          {viewStudentModal.cvFileId && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(108, 76, 255, 0.05)', borderRadius: 10, border: '1px solid rgba(108, 76, 255, 0.2)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div>
                  <b style={{ fontSize: 13.5, display: 'block' }}>{viewStudentModal.cvFileName || 'CV_SinhVien.pdf'}</b>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Hồ sơ ứng tuyển kèm theo</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => downloadCandidateCv(viewStudentModal.cvFileId, viewStudentModal.cvFileName)}
              >
                ⬇ Tải bản CV đầy đủ
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={() => {
                const name = viewStudentModal.name;
                setViewStudentModal(null);
                openChatWithPerson(name);
              }}
            >
              💬 Nhắn tin trực tiếp
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                const sName = viewStudentModal.name;
                setViewStudentModal(null);
                navigate(`/u/${slugify(sName)}`);
              }}
            >
              🌐 Xem Portfolio công khai
            </button>
            {job?.status === 'open' && !hasHired && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  const s = viewStudentModal;
                  setViewStudentModal(null);
                  const realIdx = allApplicants.findIndex((x) => x.name === s.name);
                  openModal('hire', { jobId: job.id, applicantIdx: realIdx >= 0 ? realIdx : 0, applicantName: s.name, applicant: s, job, onHired: loadData });
                }}
              >
                ✓ Thuê sinh viên này & Ký quỹ
              </button>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// Subcomponent: Quick Canned Reply Modal
function CannedReplyModal({ applicant, jobTitle, onClose, onSend }) {
  const [selectedTpl, setSelectedTpl] = useState(CANNED_TEMPLATES[0].id);
  const [customMsg, setCustomMsg] = useState(CANNED_TEMPLATES[0].text(jobTitle, applicant.name));

  const handleSelectTemplate = (tpl) => {
    setSelectedTpl(tpl.id);
    setCustomMsg(tpl.text(jobTitle, applicant.name));
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 24 }}>💬</span>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>Mẫu tin nhắn phản hồi nhanh</h3>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Gửi đến ứng viên: <b>{applicant.name}</b></span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Chọn mẫu phản hồi:</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {CANNED_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="btn btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '10px 12px',
                fontSize: 12.5,
                lineHeight: 1.35,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                height: 'auto',
                minHeight: '44px',
                borderRadius: 10,
                background: selectedTpl === tpl.id ? 'rgba(108, 76, 255, 0.1)' : 'var(--surface)',
                borderColor: selectedTpl === tpl.id ? 'var(--primary)' : 'var(--border)',
                color: selectedTpl === tpl.id ? 'var(--primary)' : 'var(--ink)',
                fontWeight: selectedTpl === tpl.id ? 600 : 500,
                transition: 'all 0.15s ease'
              }}
              onClick={() => handleSelectTemplate(tpl)}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{tpl.icon}</span>
              <span style={{ flex: 1 }}>{tpl.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Nội dung tin nhắn (Có thể chỉnh sửa):
        </label>
        <textarea
          rows={4}
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value)}
          style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: '10px 12px', fontSize: 13, lineHeight: 1.5, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Đóng
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSend(customMsg)}
        >
          📨 Gửi tin nhắn ngay
        </button>
      </div>
    </ModalShell>
  );
}

// Subcomponent: Extend Deadline Modal
function ExtendDeadlineModal({ job, onClose, onExtend }) {
  const [extraDays, setExtraDays] = useState(1);
  const [extraHours, setExtraHours] = useState(0);
  const [reason, setReason] = useState('');

  const currentDeadline = job.deadlineAt ? new Date(job.deadlineAt).getTime() : Date.now();
  const addedMs = (extraDays * 24 + extraHours) * 3600000;
  const newDeadlineTs = new Date(currentDeadline + addedMs).toISOString();

  const handleConfirm = () => {
    onExtend(newDeadlineTs);
    alert(`Đã gia hạn thêm ${extraDays > 0 ? extraDays + ' ngày ' : ''}${extraHours > 0 ? extraHours + ' giờ' : ''} thành công! Thời hạn mới: ${new Date(newDeadlineTs).toLocaleString('vi-VN')}`);
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 24 }}>⏰</span>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>Gia hạn thời gian hoàn thành</h3>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Hỗ trợ sinh viên có thêm thời gian hoàn thiện sản phẩm</span>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', padding: 14, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--ink-soft)' }}>Hạn chót hiện tại:</span>
          <b>{job.deadlineAt ? new Date(job.deadlineAt).toLocaleString('vi-VN') : 'Chưa thiết lập'}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: 600 }}>
          <span>Hạn chót sau khi gia hạn:</span>
          <span>{new Date(newDeadlineTs).toLocaleString('vi-VN')}</span>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Chọn nhanh thời gian gia hạn thêm:
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: '+12 giờ', d: 0, h: 12 },
            { label: '+1 ngày', d: 1, h: 0 },
            { label: '+2 ngày', d: 2, h: 0 },
            { label: '+3 ngày', d: 3, h: 0 },
            { label: '+7 ngày', d: 7, h: 0 },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              className={'btn btn-sm ' + (extraDays === opt.d && extraHours === opt.h ? 'btn-primary' : 'btn-outline')}
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => {
                setExtraDays(opt.d);
                setExtraHours(opt.h);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Lý do gia hạn (Tùy chọn ghi chú):
        </label>
        <input
          type="text"
          placeholder="Ví dụ: Sinh viên xin thêm 1 ngày để hoàn thiện kỹ hơn phần animation..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Hủy
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          ✓ Xác nhận gia hạn
        </button>
      </div>
    </ModalShell>
  );
}