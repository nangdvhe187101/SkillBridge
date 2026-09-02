import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import ModalShell from '../../components/modals/ModalShell';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { DeliverablePreview } from '../../components/modals/DeliverableModals';
import { slugify } from '../../data/companies';
import { downloadJobAttachment } from '../../utils/fileDownloader';
import * as jobApi from '../../api/jobApi';

function formatDurationDetail(deadlineAt, postedAt) {
  if (!deadlineAt) return null;
  const start = postedAt ? new Date(postedAt).getTime() : Date.now();
  const end = new Date(deadlineAt).getTime();
  const diffMs = end - start;
  if (diffMs <= 0) return null;
  const totalHours = Math.max(1, Math.round(diffMs / 3600000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0 && hours > 0) return `${days} ngày ${hours} giờ`;
  if (days > 0) return `${days} ngày`;
  return `${hours} giờ`;
}

function formatDeadline(ts) {
  if (!ts) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return 'Đã quá hạn';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `còn ${days} ngày ${hours} giờ`;
  if (hours > 0) return `còn ${hours} giờ ${mins} phút`;
  return `còn ${mins} phút`;
}

function useTick(ms) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export default function JobDetail() {
  const { id } = useParams();
  const jobId = Number(id);
  const navigate = useNavigate();
  const { state, applyJobAsync, toggleSaveJobAsync, uploadCvAsync, openChatWithPerson } = useStore();
  const { openModal } = useModal();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [uploadCvModalOpen, setUploadCvModalOpen] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form upload CV nhanh
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  const localJob = (state.jobs || []).find((x) => x.id === jobId);
  const [apiJob, setApiJob] = useState(null);
  const [isLoading, setIsLoading] = useState(!localJob);
  useTick(30000);

  useEffect(() => {
    if (jobId) {
      setIsLoading(!localJob);
      jobApi.getJobById(jobId)
        .then((data) => {
          setApiJob(data);
        })
        .catch((err) => {
          console.error("Không thể tải chi tiết công việc từ backend:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [jobId]);

  const j = apiJob ? {
    id: apiJob.id,
    title: apiJob.title || '',
    desc: apiJob.description || '',
    cat: apiJob.categoryName || 'Chung',
    categoryId: apiJob.categoryId,
    emp: apiJob.employerName || 'Nhà tuyển dụng',
    loc: apiJob.location || 'Toàn quốc',
    budget: apiJob.budget || 0,
    urgent: !!apiJob.isUrgent,
    time: apiJob.postedAt ? new Date(apiJob.postedAt).toLocaleDateString('vi-VN') : 'Vừa đăng',
    req: Array.isArray(apiJob.requirements)
      ? apiJob.requirements.map((r) => (typeof r === 'string' ? r : r.requirementText || r.text || ''))
      : [],
    status: apiJob.status || 'open',
    deadlineAt: apiJob.deadlineAt,
    postedAt: apiJob.postedAt,
    companyDesc: apiJob.employerCompanyDescription || '',
    industry: apiJob.employerIndustry || '',
    reliability: apiJob.employerReliabilityScore || 95,
    dashJobId: apiJob.dashJobId,
    attachments: Array.isArray(apiJob.attachments) ? apiJob.attachments : []
  } : (localJob ? {
    ...localJob,
    deadlineAt: localJob.deadlineAt,
    postedAt: localJob.postedAt,
    req: Array.isArray(localJob.req) ? localJob.req : [],
    attachments: Array.isArray(localJob.attachments) ? localJob.attachments : []
  } : null);

  const dashJob = j?.dashJobId ? (state.myJobs || []).find((dj) => dj.id === j.dashJobId) : null;

  const isLoggedIn = !!state.currentUser;
  const isStudent = isLoggedIn && state.currentUser.roleCode === 'student';
  const isEmployer = isLoggedIn && (state.currentUser.roleCode === 'employer' || state.currentUser.roleCode === 'recruiter' || state.currentUser.roleCode === 'business');
  const isOwner = isLoggedIn && (
    (apiJob?.employerId && apiJob.employerId === state.currentUser?.userId) ||
    (j?.emp && state.currentUser?.fullName && j.emp.toLowerCase() === state.currentUser.fullName.toLowerCase())
  );

  const myApp = isStudent ? (state.myApplications || []).find((x) => x.jobId === jobId) : null;
  const appStatus = myApp?.status;
  const hasApplied = isStudent && (
    (state.appliedJobIds || []).includes(jobId) ||
    !!myApp
  );

  const availableCvList = state.cvFiles || [];

  let applyLabel = 'Ứng tuyển ngay';
  let applyDisabled = false;

  if (isOwner) {
    applyLabel = '💼 Tin đăng của bạn';
    applyDisabled = true;
  } else if (isEmployer) {
    applyLabel = 'Nhà tuyển dụng không thể ứng tuyển';
    applyDisabled = true;
  } else if (!isLoggedIn) {
    // Khách hoặc đã đăng xuất -> luôn hiển thị Ứng tuyển ngay
    applyLabel = 'Ứng tuyển ngay';
    applyDisabled = false;
  } else if (hasApplied) {
    applyDisabled = true;
    if (appStatus === 'hired') applyLabel = '✓ Đã trúng tuyển — nộp bàn giao bên trên';
    else if (appStatus === 'submitted') applyLabel = '📤 Đã nộp bàn giao — chờ xác nhận';
    else if (appStatus === 'completed') applyLabel = '✅ Đã hoàn thành';
    else if (appStatus === 'rejected') applyLabel = 'Rất tiếc, bạn chưa được chọn';
    else if (appStatus === 'cancelled') applyLabel = 'Đã hủy';
    else applyLabel = '✓ Đã ứng tuyển';
  } else if (j?.status && j.status !== 'open') {
    applyLabel = 'Đã đóng tuyển';
    applyDisabled = true;
  }

  const handleStartApply = () => {
    if (!state.currentUser) {
      showToast('Vui lòng đăng nhập tài khoản Sinh viên để ứng tuyển.', '🔒');
      navigate(`/auth?tab=login&redirect=${encodeURIComponent(`/jobs/${jobId}?action=apply`)}`);
      return;
    }

    if (state.currentUser.roleCode === 'employer') {
      showToast('Tài khoản Nhà tuyển dụng không thể ứng tuyển công việc.', '⚠️');
      return;
    }

    const cvList = state.cvFiles || [];
    if (cvList.length === 0) {
      setUploadLabel(`CV_${state.currentUser.fullName ? state.currentUser.fullName.replace(/\s+/g, '') : 'UngTuyen'}_${j.cat || 'ChuyenMon'}`);
      setUploadCvModalOpen(true);
    } else {
      const defaultCv = cvList.find((c) => c.category === j.cat || c.categoryId === j.categoryId) || cvList[0];
      setSelectedCvId(defaultCv?.id || cvList[0].id);
      setApplyModalOpen(true);
    }
  };

  useEffect(() => {
    if (searchParams.get('action') === 'apply' && j && !applyDisabled) {
      setSearchParams({}, { replace: true });
      handleStartApply();
    }
  }, [searchParams, j, applyDisabled, state.currentUser]);

  const handleUploadCvSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile && !uploadLabel) {
      showToast('Vui lòng chọn file CV hoặc đặt tên bản CV.', '⚠️');
      return;
    }
    setIsSubmitting(true);
    try {
      const fileName = uploadFile ? uploadFile.name : `${uploadLabel || 'CV_UngTuyen'}.pdf`;
      const catObj = (state.categories || []).find(c => String(c.id) === String(uploadCategory)) ||
                     (state.categories || []).find(c => c.name === j.cat);

      const createdCv = await uploadCvAsync({
        file: uploadFile,
        fileName: fileName,
        label: uploadLabel || fileName,
        categoryId: catObj?.id || (state.categories?.[0]?.id || 1),
        fileSize: uploadFile?.size || 1024 * 250
      });

      setUploadCvModalOpen(false);
      setSelectedCvId(createdCv.id);
      setApplyModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Không thể tải lên CV.', '❌');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmApply = async () => {
    if (!selectedCvId) {
      showToast('Vui lòng chọn một bản CV để ứng tuyển.', '⚠️');
      return;
    }
    setIsSubmitting(true);
    try {
      await applyJobAsync(jobId, selectedCvId, coverLetter);
      setApplyModalOpen(false);
      const chosenCv = (state.cvFiles || []).find((c) => c.id === selectedCvId);
      showToast(`Đã gửi đơn ứng tuyển kèm ${chosenCv?.label || 'CV'} tới ${j.emp}!`, '🚀');
    } catch (err) {
      showToast(err.message || 'Không thể gửi đơn ứng tuyển.', '❌');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page active">
        <div className="wrap" style={{ padding: '100px 0', textAlign: 'center' }}>Đang tải thông tin công việc...</div>
      </div>
    );
  }

  if (!j) {
    return (
      <div className="page active">
        <div className="wrap" style={{ padding: '100px 0', textAlign: 'center' }}>Không tìm thấy công việc.</div>
      </div>
    );
  }

  const isStudentHired = isStudent && myApp && ['hired', 'submitted', 'revision_requested', 'completed'].includes(myApp.status);
  const currentWorkStatus = myApp ? (myApp.status === 'hired' ? 'in_progress' : myApp.status) : (dashJob?.status);
  const showWorkArea = (dashJob && ['in_progress', 'submitted', 'revision_requested', 'completed', 'cancelled'].includes(dashJob.status) && !!dashJob.hiredApplicant) || isStudentHired;

  return (
    <div className="page active">
      <div className="jd-body">
        <div className="wrap">
          <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); navigate('/jobs'); }}>
            <Icon name="chevleft" /> Quay lại danh sách việc
          </a>
          <div className="jd-grid">
            <div className="jd-main">
              <h1>{j.title}</h1>
              <div className="jd-tags">
                <span className="chip">{j.cat}</span>
                {(() => {
                  const dur = formatDurationDetail(j.deadlineAt, j.postedAt);
                  if (!dur) return null;
                  return (
                    <span className="chip" style={{ background: 'rgba(108, 76, 255, 0.1)', color: 'var(--primary)', fontWeight: 600 }}>
                      ⏱️ Hoàn thành trong: {dur}
                    </span>
                  );
                })()}
                {j.urgent && <span className="chip chip-coral">Gấp</span>}
                <span className="chip">{j.time}</span>
              </div>
              <div className="jd-block">
                <h4>Mô tả công việc</h4>
                <p>{j.desc}</p>
              </div>
              <div className="jd-block">
                <h4>Yêu cầu</h4>
                {(j.req && j.req.length > 0) ? (
                  <ul>{j.req.map((r, i) => <li key={i}><Icon name="check" /> {r}</li>)}</ul>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Theo tiêu chuẩn và trao đổi trực tiếp với nhà tuyển dụng.</p>
                )}
              </div>

              {((j.attachments && j.attachments.length > 0) || (dashJob?.attachments && dashJob?.attachments?.length > 0)) && (
                <div className="jd-block">
                  <h4>📎 Tài liệu & Đề bài đính kèm</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {(j.attachments || dashJob?.attachments || []).map((f, i) => (
                      <div key={f.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 22 }}>📁</span>
                          <div>
                            <b style={{ fontSize: 13.5, display: 'block' }}>{f.fileName || f.name}</b>
                            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                              {(f.fileSize || f.size) ? ((f.fileSize || f.size) > 1024 * 1024 ? ((f.fileSize || f.size) / (1024 * 1024)).toFixed(1) + ' MB' : ((f.fileSize || f.size) / 1024).toFixed(0) + ' KB') : 'Tài liệu đề bài'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={async () => {
                            showToast(`Đang tải xuống: ${f.fileName || f.name}`, '⬇️');
                            await downloadJobAttachment(f, j.title, j.id);
                          }}
                        >
                          ⬇ Tải file về
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="jd-block">
                <h4>Bảo vệ từ SkillBridge</h4>
                <ul>
                  <li><Icon name="check" /> Được bảo vệ bởi Quỹ Bảo hiểm Tương hỗ Cộng đồng nếu phát sinh tranh chấp</li>
                  <li><Icon name="check" /> Nhà tuyển dụng đã xác thực danh tính</li>
                  <li><Icon name="check" /> Đánh giá hai chiều sau khi hoàn thành</li>
                </ul>
              </div>
            </div>

            <div className="jd-side">
              {showWorkArea && (
                <div id="jdWorkArea">
                  {currentWorkStatus === 'in_progress' && (
                    <div className="jd-card jd-work-card" style={{ border: '1.5px solid var(--primary)', background: 'var(--surface)' }}>
                      <div className="jdw-head">
                        <div>
                          <span className="chip chip-cyan" style={{ marginBottom: 6 }}>Đang thực hiện</span>
                          <h4 style={{ margin: 0 }}>Khu vực bàn giao công việc</h4>
                        </div>
                        <div className="jdw-dl"><Icon name="clock" /> Hạn chót: <b>{formatDeadline(j.deadlineAt || dashJob?.deadlineAt)}</b></div>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '10px 0' }}>Sau khi hoàn thành, hãy nộp sản phẩm kèm bản xem trước có đóng dấu bản quyền.</p>
                      <button className="btn btn-primary btn-block" style={{ marginBottom: 8 }} onClick={() => openModal('deliverable', { jobId: j.id, job: j })}>
                        📤 Nộp sản phẩm bàn giao
                      </button>
                      <button className="btn btn-outline btn-block" onClick={() => openChatWithPerson(j.emp)}>💬 Trao đổi với NTD</button>
                    </div>
                  )}
                  {currentWorkStatus === 'submitted' && (
                    <div className="jd-card">
                      <h4>⏳ Đã nộp bàn giao</h4>
                      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '6px 0 12px' }}>Đang chờ nhà tuyển dụng xác nhận hoặc yêu cầu sửa.</p>
                      {(dashJob?.deliverable) && <DeliverablePreview d={dashJob.deliverable} />}
                      <button className="btn btn-outline btn-block" style={{ marginTop: 8 }} onClick={() => openModal('deliverable', { jobId: j.id, job: j })}>
                        ✏️ Cập nhật bàn giao
                      </button>
                    </div>
                  )}
                  {currentWorkStatus === 'revision_requested' && (
                    <div className="jd-card" style={{ borderColor: 'var(--coral)' }}>
                      <h4>⚠️ Yêu cầu sửa đổi bàn giao</h4>
                      {dashJob?.deliverableFeedback && dashJob.deliverableFeedback.length > 0 && (
                        <div className="feedback-box" style={{ background: 'var(--coral-dim)', padding: 10, borderRadius: 8, margin: '8px 0' }}>
                          <b>Góp ý từ NTD:</b>
                          <p style={{ marginTop: 4, fontSize: 13 }}>{dashJob.deliverableFeedback[dashJob.deliverableFeedback.length - 1].text}</p>
                        </div>
                      )}
                      <button className="btn btn-primary btn-block" style={{ marginBottom: 8 }} onClick={() => openModal('deliverable', { jobId: j.id, job: j })}>📤 Nộp lại bàn giao</button>
                      <button className="btn btn-outline btn-block" onClick={() => openChatWithPerson(j.emp)}>💬 Hỏi thêm NTD</button>
                    </div>
                  )}
                  {currentWorkStatus === 'completed' && (
                    <div className="jd-card">
                      <h4>✅ Đã hoàn thành & nhận thanh toán</h4>
                      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>Cảm ơn bạn đã hoàn thành công việc trên SkillBridge.</p>
                      {dashJob?.deliverable && <DeliverablePreview d={dashJob.deliverable} revealFinal />}
                    </div>
                  )}
                  {currentWorkStatus === 'cancelled' && <div className="jd-card"><h4>🚫 Công việc đã bị hủy</h4></div>}
                </div>
              )}

              {isOwner ? (
                <div className="jd-card" style={{ border: '1.5px solid var(--primary)', background: 'rgba(108, 76, 255, 0.03)' }}>
                  <div className="jd-price">{fmtVND(j.budget)}</div>
                  <div className="jd-price-lbl">Ngân sách công việc</div>

                  {(() => {
                    const dur = formatDurationDetail(j.deadlineAt, j.postedAt);
                    if (!dur) return null;
                    return (
                      <div style={{ margin: '14px 0', padding: '10px 12px', background: 'rgba(108, 76, 255, 0.06)', borderRadius: 8, border: '1px solid rgba(108, 76, 255, 0.2)', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 2 }}>
                          ⏱️ Thời hạn hoàn thành: {dur}
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          Tính từ khi được nhà tuyển dụng xác nhận chọn làm việc
                        </span>
                      </div>
                    );
                  })()}

                  <div style={{ padding: '12px 14px', background: 'rgba(108, 76, 255, 0.08)', borderRadius: 10, margin: '14px 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>👑</span>
                    <div>
                      <b style={{ fontSize: 13.5, display: 'block', color: 'var(--ink)' }}>Tin tuyển dụng của bạn</b>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Bạn là chủ sở hữu của tin đăng này</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    style={{ marginBottom: 10, fontWeight: 700, padding: '10px 16px' }}
                    onClick={() => navigate(`/employer/jobs/${jobId}`)}
                  >
                    👥 Quản lý ứng viên ({apiJob?.applicantCount || 0}) →
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    style={{ marginBottom: 10 }}
                    onClick={() => navigate(`/employer/jobs/${jobId}/edit`)}
                  >
                    ✏️ Chỉnh sửa nội dung tin
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    onClick={() => navigate('/employer/jobs')}
                  >
                    📋 Về danh sách tin tuyển dụng
                  </button>
                </div>
              ) : isEmployer ? (
                <div className="jd-card" style={{ background: 'var(--surface)' }}>
                  <div className="jd-price">{fmtVND(j.budget)}</div>
                  <div className="jd-price-lbl">Ngân sách công việc</div>

                  {(() => {
                    const dur = formatDurationDetail(j.deadlineAt, j.postedAt);
                    if (!dur) return null;
                    return (
                      <div style={{ margin: '14px 0', padding: '10px 12px', background: 'rgba(108, 76, 255, 0.06)', borderRadius: 8, border: '1px solid rgba(108, 76, 255, 0.2)', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 2 }}>
                          ⏱️ Thời hạn hoàn thành: {dur}
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          Tính từ khi được nhà tuyển dụng xác nhận chọn làm việc
                        </span>
                      </div>
                    );
                  })()}

                  <div style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.03)', borderRadius: 10, margin: '14px 0 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🏢</div>
                    <b style={{ fontSize: 13.5, display: 'block', color: 'var(--ink)' }}>Tài khoản Nhà tuyển dụng</b>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginTop: 4 }}>
                      Bạn đang đăng nhập với vai trò Nhà tuyển dụng. Các tính năng nộp CV và lưu việc chỉ dành cho tài khoản Sinh viên / Ứng viên.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    style={{ marginBottom: 10 }}
                    onClick={() => navigate('/employer/post')}
                  >
                    ➕ Đăng tin tuyển dụng mới
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    onClick={() => navigate('/employer/dashboard')}
                  >
                    ← Về Dashboard của bạn
                  </button>
                </div>
              ) : (
                <div className="jd-card">
                  <div className="jd-price">{fmtVND(j.budget)}</div>
                  <div className="jd-price-lbl">Ngân sách công việc</div>

                  {(() => {
                    const dur = formatDurationDetail(j.deadlineAt, j.postedAt);
                    if (!dur) return null;
                    return (
                      <div style={{ margin: '14px 0', padding: '10px 12px', background: 'rgba(108, 76, 255, 0.06)', borderRadius: 8, border: '1px solid rgba(108, 76, 255, 0.2)', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 2 }}>
                          ⏱️ Thời hạn hoàn thành: {dur}
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          Tính từ khi được nhà tuyển dụng xác nhận chọn làm việc
                        </span>
                      </div>
                    );
                  })()}

                  <button
                    className="btn btn-primary btn-block"
                    style={{ marginBottom: 10 }}
                    disabled={applyDisabled}
                    onClick={handleStartApply}
                  >
                    {applyLabel}
                  </button>

                  <button className="btn btn-outline btn-block" style={{ marginBottom: 10 }} onClick={() => openChatWithPerson(j.emp)}>
                    <span className="msg-btn-inline"><Icon name="chat" style={{ width: 14, height: 14 }} /> Nhắn tin với nhà tuyển dụng</span>
                  </button>
                  <button
                    className="btn btn-outline btn-block"
                    style={{
                      marginBottom: 10,
                      color: (state.savedJobIds || []).includes(jobId) ? '#ef4444' : undefined,
                      borderColor: (state.savedJobIds || []).includes(jobId) ? '#ef4444' : undefined,
                      background: (state.savedJobIds || []).includes(jobId) ? 'rgba(239, 68, 68, 0.08)' : undefined
                    }}
                    onClick={async () => {
                      try {
                        await toggleSaveJobAsync(jobId);
                      } catch (err) {
                        console.error('Lỗi lưu công việc:', err);
                      }
                    }}
                  >
                    {(state.savedJobIds || []).includes(jobId) ? '❤️ Đã lưu vào yêu thích' : '🤍 Lưu công việc'}
                  </button>
                  <button className="btn btn-outline btn-block" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                    onClick={() => openModal('report', { withName: j.emp })}>🚩 Báo cáo nhà tuyển dụng</button>
                </div>
              )}
              <div className="jd-card">
                <div className="jd-emp-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/company/${slugify(j.emp)}`)}>
                  <Avatar name={j.emp} className="jd-emp-av" fontSize={16} />
                  <div>
                    <b>{j.emp}</b> <Icon name="check" style={{ width: 14, height: 14, display: 'inline', color: 'var(--primary)' }} />
                    <span>{j.loc} · Đã xác thực</span>
                  </div>
                </div>
                <div className="jd-rating"><Icon name="star" /> 4.9 · 21 công việc đã đăng</div>
                <div className="jd-rating"><Icon name="clock" /> Phản hồi trong ~10 phút</div>
                <button className="btn btn-outline btn-sm btn-block" style={{ marginTop: 12 }} onClick={() => navigate(`/company/${slugify(j.emp)}`)}>
                  Xem hồ sơ công ty →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {uploadCvModalOpen && (
        <ModalShell onClose={() => setUploadCvModalOpen(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 28 }}>📄</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Tải lên CV Ứng tuyển</h3>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                Vị trí: <b>{j.title}</b> · {j.emp}
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 158, 87, 0.12)', border: '1px solid rgba(255, 158, 87, 0.35)', padding: '12px 14px', borderRadius: 10, marginBottom: 16 }}>
            <b style={{ color: '#FF9E57', fontSize: 13.5, display: 'block', marginBottom: 2 }}>⚠️ Bạn chưa có bản CV nào trong hồ sơ</b>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
              Nhà tuyển dụng yêu cầu xem CV chuyên ngành để duyệt hồ sơ. Vui lòng tải lên CV (PDF hoặc Word) của bạn để tiếp tục ứng tuyển.
            </span>
          </div>

          <form onSubmit={handleUploadCvSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                File CV của bạn (.pdf, .docx, .doc) <span style={{ color: 'var(--coral)' }}>*</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const f = e.target.files[0];
                    setUploadFile(f);
                    if (!uploadLabel) {
                      setUploadLabel(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--primary)',
                  borderRadius: 12,
                  padding: '20px 16px',
                  textAlign: 'center',
                  background: 'rgba(108, 76, 255, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {uploadFile ? (
                  <div>
                    <span style={{ fontSize: 26 }}>📄</span>
                    <b style={{ display: 'block', marginTop: 6, fontSize: 14 }}>{uploadFile.name}</b>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {(uploadFile.size / 1024).toFixed(0)} KB · Bấm để đổi file khác
                    </span>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: 28 }}>☁️</span>
                    <b style={{ display: 'block', marginTop: 6, fontSize: 13.5 }}>Nhấn để chọn file CV từ thiết bị</b>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Hỗ trợ PDF, DOC, DOCX dung lượng tối đa 10MB</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Tên / Nhãn chuyên môn bản CV
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                placeholder="VD: CV Lập trình Frontend, CV Video Creator..."
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Chuyên ngành / Danh mục
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                <option value="">Khớp với vị trí này: {j.cat}</option>
                {(state.categories || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setUploadCvModalOpen(false)}>
                Huỷ
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Đang tải lên...' : 'Tải lên & Tiếp tục ứng tuyển →'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {applyModalOpen && (
        <ModalShell onClose={() => setApplyModalOpen(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 28 }}>📨</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Chọn bản CV ứng tuyển</h3>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                Vị trí: <b>{j.title}</b> · {j.emp}
              </span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.5 }}>
            Vui lòng chọn bản CV chuyên môn phù hợp nhất để gửi đến nhà tuyển dụng (chỉ bản CV được chọn sẽ hiển thị với nhà tuyển dụng):
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', marginBottom: 14 }}>
            {availableCvList.map((cv) => {
              const isSelected = selectedCvId === cv.id;
              const isMatch = cv.category === j.cat || cv.categoryId === j.categoryId;

              return (
                <div
                  key={cv.id}
                  onClick={() => setSelectedCvId(cv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: isSelected ? 'rgba(108, 76, 255, 0.08)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: isSelected ? '6px solid var(--primary)' : '2px solid var(--border)',
                        background: '#fff',
                        flexShrink: 0
                      }}
                    />
                    <div>
                      <b style={{ display: 'block', fontSize: 13.5, color: isSelected ? 'var(--primary)' : 'var(--ink)' }}>
                        {cv.label || cv.name}
                      </b>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                        <span className="chip" style={{ fontSize: 10.5, padding: '1px 7px' }}>{cv.category}</span>
                        {isMatch && (
                          <span className="chip chip-lime" style={{ fontSize: 10.5, padding: '1px 6px' }}>
                            🎯 Khớp ngành tuyển dụng
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: 18 }}>📄</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom: 14 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ width: '100%', borderStyle: 'dashed' }}
              onClick={() => {
                setApplyModalOpen(false);
                setUploadCvModalOpen(true);
              }}
            >
              + Tải lên một bản CV khác
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Lời nhắn / Đề xuất gửi nhà tuyển dụng (tùy chọn)
            </label>
            <textarea
              className="input"
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}
              placeholder="Nêu ngắn gọn thế mạnh hoặc kinh nghiệm liên quan của bạn đối với công việc này..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setApplyModalOpen(false)}>
              Huỷ
            </button>
            <button
              className="btn btn-primary"
              disabled={isSubmitting || !selectedCvId}
              onClick={handleConfirmApply}
            >
              {isSubmitting ? 'Đang nộp...' : '🚀 Xác nhận nộp hồ sơ'}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}