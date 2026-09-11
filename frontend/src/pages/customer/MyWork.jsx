import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import Avatar from '../../components/Avatar';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { getJobDeliverables } from '../../api/deliverableApi';
import { getJobById } from '../../api/jobApi';
import { downloadJobAttachment, downloadDeliverableFile } from '../../utils/fileDownloader';
import { DeliverablePreview } from '../../components/modals/DeliverableModals';

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '';
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function getDeliverableFileMeta(fileName, fileType) {
  const ext = (fileType || fileName || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz':
      return { icon: '📦', label: 'Tệp nén lưu trữ (Archive)', color: '#d97706', bg: '#fef3c7' };
    case 'doc': case 'docx':
      return { icon: '📝', label: 'Tài liệu Word', color: '#2563eb', bg: '#eff6ff' };
    case 'xls': case 'xlsx': case 'csv':
      return { icon: '📊', label: 'Bảng tính Excel', color: '#16a34a', bg: '#f0fdf4' };
    case 'pdf':
      return { icon: '📑', label: 'Tài liệu PDF', color: '#dc2626', bg: '#fef2f2' };
    case 'ppt': case 'pptx':
      return { icon: '📊', label: 'Bài trình chiếu PowerPoint', color: '#ea580c', bg: '#fff7ed' };
    case 'png': case 'jpg': case 'jpeg': case 'webp': case 'gif': case 'svg': case 'image':
      return { icon: '🖼️', label: 'Hình ảnh thiết kế', color: '#7c3aed', bg: '#f5f3ff' };
    case 'mp4': case 'mov': case 'm4v': case 'webm': case 'avi': case 'mkv': case 'video':
      return { icon: '🎬', label: 'Video sản phẩm', color: '#0284c7', bg: '#e0f2fe' };
    case 'mp3': case 'wav': case 'm4a': case 'aac': case 'flac':
      return { icon: '🎵', label: 'Tệp âm thanh', color: '#db2777', bg: '#fdf2f8' };
    case 'url':
      return { icon: '🔗', label: 'Liên kết ngoài', color: '#4f46e5', bg: '#eef2ff' };
    default:
      return { icon: '📁', label: 'Tệp sản phẩm', color: '#475569', bg: '#f1f5f9' };
  }
}

function formatDeliverableDisplayName(fileName, jobId, version = 1, isExternal = false) {
  if (isExternal || !fileName) return fileName || 'Liên kết sản phẩm';
  const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
  const cleanExt = ext ? `.${ext}` : '';
  if (fileName.toLowerCase().startsWith('skillbridge_job')) {
    return fileName;
  }
  return `SkillBridge_Job${jobId}_v${version || 1}${cleanExt}`;
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

function getDeadlineUrgency(ts) {
  if (!ts) return 'normal';
  const time = typeof ts === 'string' || ts instanceof Date ? new Date(ts).getTime() : ts;
  if (isNaN(time)) return 'normal';
  const diff = time - Date.now();
  if (diff <= 0) return 'overdue';
  if (diff < 24 * 3600000) return 'urgent';
  return 'normal';
}

// Map trạng thái ứng tuyển hiển thị cho SV
const APP_STATUS_LABEL = {
  pending: 'Đang chờ duyệt',
  hired: '🎉 Đã được chọn',
  rejected: 'Chưa phù hợp',
  submitted: 'Đã nộp bàn giao',
  revision_requested: 'Cần sửa đổi',
  completed: '✅ Hoàn thành',
  cancelled: 'Đã hủy',
};


export default function MyWork() {
  const {
    state,
    openChatWithPerson,
    refreshMyApplications,
    cancelStudentWorkAsync,
    withdrawApplicationAsync
  } = useStore();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'applications'
  const [appFilter, setAppFilter] = useState('all'); // 'all' | 'pending' | 'hired' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [appsPage, setAppsPage] = useState(1);
  const [deliverablesMap, setDeliverablesMap] = useState({});
  const [jobDetailsMap, setJobDetailsMap] = useState({});
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState({});
  const [cancelModalJob, setCancelModalJob] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const appsPageSize = 6;

  // Làm mới danh sách ứng tuyển khi vào trang
  useEffect(() => {
    if (typeof refreshMyApplications === 'function') {
      refreshMyApplications();
    }
  }, [refreshMyApplications]);

  // Lọc các ứng tuyển đang trong giai đoạn làm việc thực tế
  const activeApps = useMemo(() => {
    return (state.myApplications || []).filter((a) =>
      ['hired', 'submitted', 'revision_requested'].includes(a.status) ||
      ['in_progress', 'submitted', 'revision_requested'].includes(a.jobStatus)
    );
  }, [state.myApplications]);

  // Nạp danh sách deliverables và chi tiết job thật cho các việc đang làm
  const loadDeliverables = useCallback(async () => {
    if (!activeApps.length) return;
    setLoadingDeliverables(true);
    const results = {};
    const jobResults = {};
    await Promise.allSettled(
      activeApps.map(async (a) => {
        const jId = a.jobId || a.id;
        if (!jId || isNaN(Number(jId))) return;
        const numJobId = Number(jId);
        try {
          const [delivRes, jobRes] = await Promise.allSettled([
            getJobDeliverables(numJobId),
            getJobById(numJobId)
          ]);

          if (delivRes.status === 'fulfilled') {
            const res = delivRes.value;
            const delivs = Array.isArray(res) ? res : (res?.items || []);
            const latest = delivs[0] || null;
            const allFeedbacks = [];
            delivs.forEach((d) => {
              (d.feedbacks || []).forEach((f) => {
                allFeedbacks.push({
                  version: d.version,
                  text: f.content || f.feedbackText || '',
                  at: f.createdAt ? new Date(f.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
                  author: f.authorName || 'Nhà tuyển dụng',
                });
              });
            });
            results[jId] = {
              deliverable: latest,
              deliverableFeedback: allFeedbacks,
              allDeliverables: delivs,
            };
          }

          if (jobRes.status === 'fulfilled' && jobRes.value) {
            jobResults[jId] = jobRes.value;
          }
        } catch {
          // ignore error if fetch fails
        }
      })
    );
    setDeliverablesMap(results);
    setJobDetailsMap(jobResults);
    setLoadingDeliverables(false);
  }, [activeApps]);

  useEffect(() => {
    loadDeliverables();
  }, [loadDeliverables]);

  const activeWork = useMemo(() => {
    // Lấy danh sách việc đang làm từ myApplications
    const appsWork = activeApps.map((a) => {
      const targetJobId = a.jobId || a.id;
      const jobInfo = jobDetailsMap[targetJobId];
      const matchingJob = (state.jobs || []).find((j) => j.id === targetJobId || (a.dashJobId && j.dashJobId === a.dashJobId)) || jobInfo;
      const delivData = deliverablesMap[targetJobId] || {};

      let effectiveStatus = a.jobStatus || jobInfo?.status;
      if (!effectiveStatus || effectiveStatus === 'open' || effectiveStatus === 'filled') {
        effectiveStatus = a.status === 'hired' ? 'in_progress' : a.status;
      }

      const employerAvatar = jobInfo?.employerAvatar || jobInfo?.employerAvatarUrl || a.employerAvatarUrl || a.empAvatar || matchingJob?.empAvatar || matchingJob?.employerAvatar || null;

      const rawReq = jobInfo?.requirements || matchingJob?.req || matchingJob?.requirements || [];
      const reqList = Array.isArray(rawReq)
        ? rawReq.map((r) => (typeof r === 'string' ? r : r.requirementText || r.text || ''))
        : [];
      const attachmentsList = Array.isArray(jobInfo?.attachments)
        ? jobInfo.attachments
        : (Array.isArray(matchingJob?.attachments) ? matchingJob.attachments : []);

      return {
        id: targetJobId,
        jobId: targetJobId,
        title: a.jobTitle || a.title || jobInfo?.title || matchingJob?.title || 'Công việc',
        desc: jobInfo?.description || matchingJob?.desc || matchingJob?.description || '',
        req: reqList,
        attachments: attachmentsList,
        cat: jobInfo?.categoryName || matchingJob?.cat || 'Dự án Freelance',
        budget: a.budget || jobInfo?.budget || matchingJob?.budget || 0,
        status: effectiveStatus,
        deadlineAt: a.deadlineAt || jobInfo?.deadlineAt || matchingJob?.deadlineAt || null,
        revisionCount: a.revisionCount !== undefined && a.revisionCount !== null ? a.revisionCount : (matchingJob?.revisionCount || 0),
        revisionLimit: a.revisionLimit !== undefined && a.revisionLimit !== null ? a.revisionLimit : (matchingJob?.revisionLimit || 2),
        deliverable: delivData.deliverable || matchingJob?.deliverable || null,
        deliverableFeedback: (delivData.deliverableFeedback?.length > 0)
          ? delivData.deliverableFeedback
          : (matchingJob?.deliverableFeedback || []),
        allDeliverables: delivData.allDeliverables || (delivData.deliverable ? [delivData.deliverable] : (matchingJob?.deliverable ? [matchingJob.deliverable] : [])),
        emp: a.employerName || a.emp || jobInfo?.employerName || matchingJob?.emp || 'Nhà tuyển dụng',
        empAvatar: employerAvatar,
      };
    });

    // Nếu người dùng đã đăng nhập, luôn sử dụng dữ liệu thực tế (kể cả khi rỗng, không rò rỉ mock)
    if (state.currentUser) {
      return appsWork;
    }

    if (appsWork.length > 0) return appsWork;

    // Fallback cho dữ liệu mock state.myJobs (chỉ khi chưa đăng nhập / demo)
    return (state.myJobs || []).filter((j) =>
      ['in_progress', 'submitted', 'revision_requested'].includes(j.status) && j.hiredApplicant
    ).map((j) => ({
      ...j,
      jobId: j.id,
      cat: j.cat || 'Dự án Freelance',
      emp: state.jobs.find((pj) => pj.dashJobId === j.id)?.emp || 'Nhà tuyển dụng',
      empAvatar: j.employerAvatar || j.empAvatar || null
    }));
  }, [activeApps, deliverablesMap, state.jobs, state.myJobs, state.currentUser]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const inProgressCount = activeWork.filter(w => ['in_progress', 'hired'].includes(w.status)).length;
    const submittedCount = activeWork.filter(w => w.status === 'submitted').length;
    const revisionCount = activeWork.filter(w => w.status === 'revision_requested').length;
    const totalBudget = activeWork.reduce((acc, curr) => acc + (curr.budget || 0), 0);
    const totalApps = (state.myApplications || []).length;
    return { inProgressCount, submittedCount, revisionCount, totalBudget, totalApps };
  }, [activeWork, state.myApplications]);

  // Bộ lọc danh sách ứng tuyển
  const filteredApplications = useMemo(() => {
    let list = (state.myApplications || []);
    if (appFilter === 'pending') {
      list = list.filter(a => a.status === 'pending');
    } else if (appFilter === 'hired') {
      list = list.filter(a => ['hired', 'submitted', 'revision_requested', 'completed'].includes(a.status));
    } else if (appFilter === 'rejected') {
      list = list.filter(a => a.status === 'rejected');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        (a.title || a.jobTitle || '').toLowerCase().includes(q) ||
        (a.emp || a.employerName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.myApplications, appFilter, searchQuery]);

  const appsTotalPages = Math.ceil(filteredApplications.length / appsPageSize) || 1;
  const pagedApplications = useMemo(() => {
    const start = (appsPage - 1) * appsPageSize;
    return filteredApplications.slice(start, start + appsPageSize);
  }, [filteredApplications, appsPage]);

  const handleOpenDeliverableModal = (targetJobId, j) => {
    openModal('deliverable', {
      jobId: targetJobId,
      job: j,
      onSubmitted: () => {
        loadDeliverables();
        if (typeof refreshMyApplications === 'function') {
          refreshMyApplications();
        }
      }
    });
  };

  const handleConfirmCancelJob = async () => {
    if (!cancelModalJob) return;
    setIsCancelling(true);
    try {
      const jId = cancelModalJob.jobId || cancelModalJob.id;
      await cancelStudentWorkAsync(jId, cancelReason);
      setCancelModalJob(null);
      setCancelReason('');
      if (typeof refreshMyApplications === 'function') {
        await refreshMyApplications();
      }
      await loadDeliverables();
    } catch {
      // error toast handled in store action
    } finally {
      setIsCancelling(false);
    }
  };

  const handleWithdrawApp = async (targetJobId) => {
    if (window.confirm('Bạn có chắc chắn muốn rút đơn ứng tuyển này không?')) {
      await withdrawApplicationAsync(targetJobId);
    }
  };

  return (
    <div className="page active" style={{ background: 'var(--bg, #f8fafc)', minHeight: '100vh' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        color: '#fff',
        padding: '44px 0 36px',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: '#a5b4fc',
              marginBottom: 10
            }}>
              Không gian làm việc
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Quản lý công việc & Bàn giao
            </h1>
            <p style={{ margin: 0, fontSize: 14.5, color: '#c7d2fe', maxWidth: 620, lineHeight: 1.5 }}>
              Theo dõi tiến độ việc đang làm, nộp sản phẩm đúng hạn và xem kết quả ứng tuyển.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              style={{
                background: '#ffffff',
                color: '#4338ca',
                fontWeight: 700,
                padding: '10px 22px',
                borderRadius: 10,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                border: 'none'
              }}
              onClick={() => navigate('/jobs')}
            >
              🔍 Tìm việc mới
            </button>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
        {/* KPI Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Đang thực hiện</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {stats.inProgressCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>công việc</span>
              </div>
              {stats.totalBudget > 0 && (
                <div style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                  Tổng thù lao: {fmtVND(stats.totalBudget)}
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}>
              📤
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Chờ nghiệm thu</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {stats.submittedCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>sản phẩm</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>NTD đang xem xét</div>
            </div>
          </div>

          <div style={{
            background: stats.revisionCount > 0 ? '#fff1f2' : '#ffffff',
            borderRadius: 14,
            padding: '18px 20px',
            border: stats.revisionCount > 0 ? '1px solid #fecdd3' : '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: stats.revisionCount > 0 ? '#ffe4e6' : '#fff7ed',
              color: stats.revisionCount > 0 ? '#e11d48' : '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}>
              ✏️
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: stats.revisionCount > 0 ? '#be123c' : '#64748b', fontWeight: 600 }}>Yêu cầu sửa lại</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: stats.revisionCount > 0 ? '#be123c' : '#0f172a' }}>
                {stats.revisionCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>cần sửa</span>
              </div>
              <div style={{ fontSize: 11.5, color: stats.revisionCount > 0 ? '#e11d48' : '#64748b', marginTop: 2 }}>
                {stats.revisionCount > 0 ? 'Cần cập nhật sớm' : 'Không có yêu cầu'}
              </div>
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#faf5ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}>
              📨
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Đơn ứng tuyển</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {stats.totalApps} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>hồ sơ</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Tổng số đã nộp</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          paddingBottom: 2
        }}>
          <button
            type="button"
            style={{
              padding: '12px 20px',
              fontSize: 15,
              fontWeight: 700,
              color: activeTab === 'active' ? '#4338ca' : '#64748b',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'active' ? '3px solid #4338ca' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -2,
              transition: 'all 0.2s'
            }}
            onClick={() => setActiveTab('active')}
          >
            🎯 Việc đang làm & Bàn giao
            <span style={{
              background: activeTab === 'active' ? '#4338ca' : '#e2e8f0',
              color: activeTab === 'active' ? '#ffffff' : '#475569',
              fontSize: 12,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 12
            }}>
              {activeWork.length}
            </span>
          </button>

          <button
            type="button"
            style={{
              padding: '12px 20px',
              fontSize: 15,
              fontWeight: 700,
              color: activeTab === 'applications' ? '#4338ca' : '#64748b',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'applications' ? '3px solid #4338ca' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -2,
              transition: 'all 0.2s'
            }}
            onClick={() => setActiveTab('applications')}
          >
            📨 Đơn ứng tuyển của bạn
            <span style={{
              background: activeTab === 'applications' ? '#4338ca' : '#e2e8f0',
              color: activeTab === 'applications' ? '#ffffff' : '#475569',
              fontSize: 12,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 12
            }}>
              {state.myApplications.length}
            </span>
          </button>
        </div>

        {/* TAB 1: VIỆC ĐANG LÀM */}
        {activeTab === 'active' && (
          <div>
            {activeWork.length === 0 ? (
              <div style={{
                background: '#ffffff',
                border: '2px dashed #cbd5e1',
                borderRadius: 16,
                padding: '60px 20px',
                textAlign: 'center',
                margin: '10px 0 20px'
              }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🚀</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
                  Chưa có công việc nào đang thực hiện
                </h3>
                <p style={{ color: '#64748b', fontSize: 14, maxWidth: 460, margin: '0 auto 20px' }}>
                  Khi được nhà tuyển dụng lựa chọn và ký quỹ, dự án sẽ xuất hiện ở đây để bạn nộp bài và nhận thù lao.
                </p>
                <button className="btn btn-primary" onClick={() => navigate('/jobs')}>
                  🔍 Khám phá việc làm ngay
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activeWork.map((j) => {
                  const isSubmitted = j.status === 'submitted';
                  const isRevision = j.status === 'revision_requested';
                  const isCompleted = j.status === 'completed';
                  const isInProgress = !isSubmitted && !isRevision && !isCompleted;
                  const empName = j.emp || 'Nhà tuyển dụng';
                  const targetJobId = j.jobId || j.id;
                  const urgency = getDeadlineUrgency(j.deadlineAt);
                  const isOverdue = urgency === 'overdue' || (j.deadlineAt && (new Date(j.deadlineAt).getTime() <= Date.now()));

                  return (
                    <div
                      key={j.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: 16,
                        border: isRevision ? '2px solid #fda4af' : '1px solid #e2e8f0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                    >
                      {/* Top status header */}
                      <div style={{
                        background: isRevision ? '#fff1f2' : (isSubmitted ? '#f0fdf4' : '#f8fafc'),
                        padding: '12px 24px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            background: '#e0e7ff',
                            color: '#4338ca',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 6
                          }}>
                            {j.cat}
                          </span>
                          <span style={{
                            fontSize: 12,
                            color: '#16a34a',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            Đã ký quỹ bảo đảm
                          </span>
                        </div>

                        <div>
                          {isRevision && (
                            <span style={{ background: '#f43f5e', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Yêu cầu sửa đổi (Lượt {(j.revisionCount || 0) + 1}/{j.revisionLimit || 2})
                            </span>
                          )}
                          {isSubmitted && (
                            <span style={{ background: '#0284c7', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Đã nộp bàn giao (Chờ duyệt)
                            </span>
                          )}
                          {isCompleted && (
                            <span style={{ background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Đã hoàn thành
                            </span>
                          )}
                          {isInProgress && (
                            <span style={{ background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Đang thực hiện
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Card Content */}
                      <div style={{ padding: '22px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                          <div style={{ flex: 1, minWidth: 260 }}>
                            <h2
                              style={{
                                fontSize: 20,
                                fontWeight: 800,
                                margin: '0 0 10px',
                                color: '#1e293b',
                                cursor: 'pointer',
                                lineHeight: 1.3
                              }}
                              onClick={() => targetJobId && navigate(`/jobs/${targetJobId}`)}
                            >
                              {j.title}
                            </h2>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar name={empName} src={j.empAvatar} fontSize={13} style={{ width: 26, height: 26 }} />
                                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#475569' }}>{empName}</span>
                              </div>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <div style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                fontWeight: 800,
                                fontSize: 14,
                                padding: '4px 10px',
                                borderRadius: 8
                              }}>
                                💰 Thù lao: {fmtVND(j.budget)}
                              </div>
                              {j.deadlineAt && (
                                <>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <div style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    background: urgency === 'overdue' ? '#fee2e2' : (urgency === 'urgent' ? '#ffedd5' : '#f0f9ff'),
                                    color: urgency === 'overdue' ? '#b91c1c' : (urgency === 'urgent' ? '#c2410c' : '#0369a1'),
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                  }}>
                                    ⏰ Hạn bàn giao: {formatDeadline(j.deadlineAt)}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Timeline Progress */}
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: 12,
                          padding: '14px 18px',
                          margin: '12px 0 16px',
                          border: '1px solid #f1f5f9'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                            {/* Line */}
                            <div style={{
                              position: 'absolute',
                              top: 14,
                              left: 20,
                              right: 20,
                              height: 3,
                              background: '#e2e8f0',
                              zIndex: 1
                            }}>
                              <div style={{
                                height: '100%',
                                width: isSubmitted ? '100%' : (isInProgress ? '50%' : '50%'),
                                background: 'linear-gradient(90deg, #10b981, #6366f1)',
                                transition: 'width 0.3s'
                              }} />
                            </div>

                            {/* Step 1 */}
                            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: '#10b981',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                margin: '0 auto 4px'
                              }}>
                                ✓
                              </div>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#10b981' }}>Nhận việc & Ký quỹ</span>
                            </div>

                            {/* Step 2 */}
                            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: isSubmitted ? '#10b981' : (isRevision ? '#f43f5e' : '#6366f1'),
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                margin: '0 auto 4px',
                                boxShadow: '0 0 0 3px #fff'
                              }}>
                                {isSubmitted ? '✓' : (isRevision ? '✏️' : '2')}
                              </div>
                              <span style={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: isRevision ? '#f43f5e' : '#4338ca'
                              }}>
                                {isRevision ? 'Yêu cầu sửa đổi' : (isSubmitted ? 'Đã bàn giao' : 'Đang thực hiện')}
                              </span>
                            </div>

                            {/* Step 3 */}
                            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: isSubmitted ? '#6366f1' : '#e2e8f0',
                                color: isSubmitted ? '#fff' : '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                margin: '0 auto 4px',
                                boxShadow: '0 0 0 3px #fff'
                              }}>
                                3
                              </div>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: isSubmitted ? '#4338ca' : '#94a3b8' }}>
                                Nghiệm thu & Nhận tiền
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Job Description & Requirements block */}
                        {(j.desc || (j.req && j.req.length > 0)) && (
                          <div style={{
                            background: '#f8fafc',
                            borderRadius: 12,
                            padding: '14px 18px',
                            margin: '12px 0 14px',
                            border: '1px solid #e2e8f0'
                          }}>
                            {j.desc && (
                              <div style={{ marginBottom: j.req?.length ? 10 : 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                  📝 Mô tả công việc:
                                </div>
                                <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                                  {j.desc}
                                </p>
                              </div>
                            )}

                            {j.req && j.req.length > 0 && (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                                  🎯 Yêu cầu bàn giao:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {j.req.map((r, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155' }}>
                                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> {r}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Employer Attachments / Tài liệu & Đề bài đính kèm */}
                        {j.attachments && j.attachments.length > 0 && (
                          <div style={{
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: 12,
                            padding: '14px 18px',
                            margin: '12px 0 14px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 10
                            }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
                                📎 Tài liệu & Đề bài từ NTD ({j.attachments.length} file)
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {j.attachments.map((f) => (
                                <div
                                  key={f.id || f.fileName}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#ffffff',
                                    border: '1px solid #e0f2fe',
                                    borderRadius: 8,
                                    padding: '8px 12px',
                                    flexWrap: 'wrap',
                                    gap: 8
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, flex: 1 }}>
                                    <span style={{ fontSize: 18 }}>📁</span>
                                    <div style={{ overflow: 'hidden' }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {f.fileName || f.name}
                                      </div>
                                      <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                        {(f.fileSize || f.size) ? ((f.fileSize || f.size) > 1024 * 1024 ? ((f.fileSize || f.size) / (1024 * 1024)).toFixed(1) + ' MB' : ((f.fileSize || f.size) / 1024).toFixed(0) + ' KB') : 'File đính kèm'}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    style={{
                                      fontSize: 12,
                                      padding: '4px 10px',
                                      borderColor: '#0284c7',
                                      color: '#0284c7',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                    onClick={async () => {
                                      showToast(`Đang tải file: ${f.fileName || f.name}`);
                                      await downloadJobAttachment(f, j.title, targetJobId);
                                    }}
                                  >
                                    Tải file về
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Overdue Alert Banner if deadline has passed */}
                        {isOverdue && (
                          <div style={{
                            background: '#fff1f2',
                            border: '1.5px solid #fda4af',
                            borderRadius: 12,
                            padding: '12px 16px',
                            margin: '12px 0 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                              <span style={{ fontSize: 22 }}>⏰</span>
                              <div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#be123c' }}>
                                  Đã quá hạn bàn giao ({formatDeadline(j.deadlineAt)})
                                </div>
                                <div style={{ fontSize: 12, color: '#9f1239', marginTop: 2 }}>
                                  Hệ thống tạm khóa tính năng nộp và cập nhật sản phẩm. Vui lòng nhắn tin trao đổi với Nhà tuyển dụng để được hỗ trợ gia hạn thêm deadline.
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                background: '#be123c',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '7px 14px',
                                borderRadius: 8,
                                cursor: 'pointer'
                              }}
                              onClick={() => openChatWithPerson(empName, `Chào ${empName}, dự án "${j.title}" hiện đã hết hạn nộp sản phẩm. Em xin phép trao đổi để anh/chị hỗ trợ gia hạn deadline giúp em nhé!`)}
                            >
                              💬 Nhắn tin xin gia hạn
                            </button>
                          </div>
                        )}

                        {/* Revision feedback alert box */}
                        {isRevision && j.deliverableFeedback?.length > 0 && (
                          <div style={{
                            background: '#fff1f2',
                            border: '1px solid #fecdd3',
                            borderRadius: 12,
                            padding: '14px 18px',
                            margin: '14px 0',
                            fontSize: 13
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e11d48', fontWeight: 700, marginBottom: 4 }}>
                              <span>✏️ Góp ý từ Nhà tuyển dụng (Lần {j.deliverableFeedback[j.deliverableFeedback.length - 1].version || 1}):</span>
                            </div>
                            <p style={{ margin: 0, color: '#9f1239', lineHeight: 1.5, fontWeight: 500 }}>
                              "{j.deliverableFeedback[j.deliverableFeedback.length - 1].text}"
                            </p>
                          </div>
                        )}

                        {/* DELIVERABLE SHOWCASE SECTION */}
                        {j.deliverable ? (
                          <div style={{
                            background: '#ffffff',
                            border: isRevision ? '1.5px solid #fda4af' : (isSubmitted ? '1.5px solid #bae6fd' : '1px solid #e2e8f0'),
                            borderRadius: 14,
                            margin: '16px 0 12px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
                          }}>
                            {/* Deliverable Header */}
                            <div style={{
                              padding: '12px 18px',
                              background: isRevision
                                ? 'linear-gradient(135deg, #fff1f2, #ffe4e6)'
                                : (isSubmitted ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' : '#f8fafc'),
                              borderBottom: isRevision ? '1px solid #fecdd3' : (isSubmitted ? '1px solid #bae6fd' : '1px solid #e2e8f0'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 10
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 20 }}>📦</span>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                    Sản phẩm bàn giao (Phiên bản v{j.deliverable.version || 1})
                                  </div>
                                  {j.deliverable.submittedAt && (
                                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                      🕒 Đã nộp lúc: {formatDateTime(j.deliverable.submittedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {isSubmitted && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '4px 12px',
                                    borderRadius: 20,
                                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                                  }}>
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
                                    Đang chờ NTD nghiệm thu
                                  </span>
                                )}
                                {isRevision && (
                                  <span style={{
                                    background: '#e11d48',
                                    color: '#ffffff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '4px 12px',
                                    borderRadius: 20
                                  }}>
                                    ✏️ Cần nộp lại bản sửa
                                  </span>
                                )}
                                {isCompleted && (
                                  <span style={{
                                    background: '#059669',
                                    color: '#ffffff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '4px 12px',
                                    borderRadius: 20
                                  }}>
                                    Đã nghiệm thu
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Deliverable Body */}
                            <div style={{ padding: '16px 18px' }}>
                              {/* Asset Info Card */}
                              {(() => {
                                const fileMeta = getDeliverableFileMeta(j.deliverable.fileName, j.deliverable.fileType);
                                const isExternal = j.deliverable.mode === 'link' || (!j.deliverable.previewFileUrl && j.deliverable.externalUrl) || j.deliverable.fileType === 'url';
                                const assetUrl = j.deliverable.url || j.deliverable.externalUrl || j.deliverable.previewFileUrl;

                                return (
                                  <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 10,
                                    padding: '12px 14px',
                                    marginBottom: 14,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 12
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 }}>
                                      <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 10,
                                        background: fileMeta.bg,
                                        color: fileMeta.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 22,
                                        flexShrink: 0
                                      }}>
                                        {fileMeta.icon}
                                      </div>
                                      <div style={{ overflow: 'hidden' }}>
                                        <div style={{
                                          fontSize: 13.5,
                                          fontWeight: 700,
                                          color: '#1e293b',
                                          wordBreak: 'break-all'
                                        }}>
                                          {formatDeliverableDisplayName(j.deliverable.fileName, targetJobId, j.deliverable.version, isExternal)}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2, fontSize: 11.5, color: '#64748b' }}>
                                          <span style={{ fontWeight: 600, color: fileMeta.color }}>{fileMeta.label}</span>
                                          {j.deliverable.fileSize && (
                                            <>
                                              <span>•</span>
                                              <span>{formatFileSize(j.deliverable.fileSize)}</span>
                                            </>
                                          )}
                                          <span>•</span>
                                          <span>{isExternal ? 'Liên kết ngoài' : 'Tệp đính kèm'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      {isExternal ? (
                                        <a
                                          href={assetUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn btn-outline btn-sm"
                                          style={{
                                            fontSize: 12,
                                            padding: '6px 14px',
                                            borderColor: '#4338ca',
                                            color: '#4338ca',
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontWeight: 600
                                          }}
                                        >
                                          Mở liên kết
                                        </a>
                                      ) : (!j.deliverable.previewFileUrl && !j.deliverable.finalFileUrl) ? (
                                        <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '6px 10px' }}>
                                          (Đã lưu trữ)
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          className="btn btn-outline btn-sm"
                                          style={{
                                            fontSize: 12,
                                            padding: '6px 14px',
                                            borderColor: '#0284c7',
                                            color: '#0284c7',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontWeight: 600
                                          }}
                                          onClick={async () => {
                                            showToast(`Đang tải file: ${j.deliverable.fileName || 'deliverable.zip'}`);
                                            await downloadDeliverableFile(targetJobId, j.deliverable.id, j.deliverable.fileName, 'final');
                                          }}
                                        >
                                          Tải file đã nộp
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Protected Live Preview */}
                              <div style={{ marginBottom: 14 }}>
                                <DeliverablePreview d={j.deliverable} revealFinal={isCompleted} />
                              </div>

                              {/* Student Note */}
                              {j.deliverable.note ? (
                                <div style={{
                                  background: '#f8fafc',
                                  borderLeft: '4px solid #4338ca',
                                  borderRadius: '0 8px 8px 0',
                                  padding: '10px 14px',
                                  marginBottom: 14,
                                  fontSize: 13
                                }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span>Ghi chú bàn giao:</span>
                                  </div>
                                  <div style={{ color: '#334155', fontStyle: 'italic', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                                    "{j.deliverable.note}"
                                  </div>
                                </div>
                              ) : (
                                <div style={{
                                  fontSize: 12,
                                  color: '#94a3b8',
                                  fontStyle: 'italic',
                                  marginBottom: 14
                                }}>
                                  (Bạn không để lại ghi chú khi nộp sản phẩm này)
                                </div>
                              )}

                              {/* Version History Toggle & Details (If more than 1 version) */}
                              {j.allDeliverables && j.allDeliverables.length > 1 && (
                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedVersions(prev => ({ ...prev, [targetJobId]: !prev[targetJobId] }))}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#4338ca',
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: 0
                                    }}
                                  >
                                    <span>{expandedVersions[targetJobId] ? 'Thu gọn' : 'Xem'} lịch sử bàn giao ({j.allDeliverables.length})</span>
                                  </button>

                                  {expandedVersions[targetJobId] && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                                      {j.allDeliverables.map((vItem) => (
                                        <div
                                          key={vItem.id || vItem.version}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            background: vItem.version === j.deliverable.version ? '#eef2ff' : '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            fontSize: 12,
                                            flexWrap: 'wrap',
                                            gap: 8
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 700, color: '#4338ca' }}>v{vItem.version}</span>
                                            <span style={{ color: '#334155' }}>{formatDeliverableDisplayName(vItem.fileName, targetJobId, vItem.version, vItem.fileType === 'url')}</span>
                                            <span style={{ color: '#94a3b8' }}>• {formatDateTime(vItem.submittedAt)}</span>
                                            {vItem.version === j.deliverable.version && (
                                              <span style={{ background: '#c7d2fe', color: '#3730a3', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                                                Mới nhất
                                              </span>
                                            )}
                                          </div>
                                          {vItem.id && (
                                            <button
                                              type="button"
                                              className="btn btn-outline btn-sm"
                                              style={{ fontSize: 11, padding: '2px 8px' }}
                                              onClick={() => downloadDeliverableFile(targetJobId, vItem.id, vItem.fileName, 'final')}
                                            >
                                              Tải v{vItem.version}
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : isSubmitted ? (
                          /* Fallback card if job is submitted but deliverable object is pending */
                          <div style={{
                            background: '#f0f9ff',
                            border: '1.5px solid #bae6fd',
                            borderRadius: 14,
                            padding: '16px 20px',
                            margin: '16px 0 12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0369a1' }}>
                                  Dự án đã bàn giao
                                </div>
                                <div style={{ fontSize: 12.5, color: '#0284c7', marginTop: 2 }}>
                                  Đang chờ nhà tuyển dụng xem xét nghiệm thu.
                                </div>
                              </div>
                              <span style={{
                                background: '#0284c7',
                                color: '#ffffff',
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '4px 12px',
                                borderRadius: 20
                              }}>
                                Chờ nghiệm thu
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                          {isRevision && (
                            isOverdue ? (
                              <button
                                className="btn btn-primary"
                                style={{ background: '#94a3b8', cursor: 'not-allowed', opacity: 0.75, fontWeight: 700, border: 'none' }}
                                disabled={true}
                                title="Đã quá hạn bàn giao, vui lòng xin gia hạn deadline từ NTD"
                              >
                                🔒 Đã quá hạn — Khóa nộp bài sửa
                              </button>
                            ) : (
                              <button
                                className="btn btn-primary"
                                style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', fontWeight: 700 }}
                                onClick={() => handleOpenDeliverableModal(targetJobId, j)}
                              >
                                📤 Nộp lại bài sửa (Lượt {(j.revisionCount || 0) + 1}/{j.revisionLimit || 2})
                              </button>
                            )
                          )}
                          {isSubmitted && (
                            isOverdue ? (
                              <button
                                className="btn btn-outline"
                                style={{ borderColor: '#cbd5e1', color: '#94a3b8', cursor: 'not-allowed', opacity: 0.75, fontWeight: 600 }}
                                disabled={true}
                                title="Đã quá hạn bàn giao, không thể cập nhật thêm"
                              >
                                🔒 Đã quá hạn — Khóa cập nhật
                              </button>
                            ) : (
                              <button
                                className="btn btn-outline"
                                style={{ borderColor: '#4338ca', color: '#4338ca', fontWeight: 600 }}
                                onClick={() => handleOpenDeliverableModal(targetJobId, j)}
                              >
                                ✏️ Cập nhật file / link bàn giao
                              </button>
                            )
                          )}
                          {isInProgress && (
                            isOverdue ? (
                              <button
                                className="btn btn-primary"
                                style={{ background: '#94a3b8', cursor: 'not-allowed', opacity: 0.75, fontWeight: 700, border: 'none' }}
                                disabled={true}
                                title="Đã quá hạn bàn giao, vui lòng xin gia hạn deadline từ NTD"
                              >
                                🔒 Đã quá hạn — Khóa nộp sản phẩm
                              </button>
                            ) : (
                              <button
                                className="btn btn-primary"
                                style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', fontWeight: 700 }}
                                onClick={() => handleOpenDeliverableModal(targetJobId, j)}
                              >
                                📤 Nộp bàn giao / sản phẩm
                              </button>
                            )
                          )}

                          <button
                            className="btn btn-outline"
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => openChatWithPerson(empName, `Chào ${empName}, em đã gửi sản phẩm bàn giao cho dự án "${j.title}". Anh/chị kiểm tra và nghiệm thu giúp em nhé!`)}
                          >
                            💬 Chat với NTD
                          </button>

                          <button
                            className="btn btn-outline"
                            style={{ color: '#64748b' }}
                            onClick={() => targetJobId && navigate(`/jobs/${targetJobId}`)}
                          >
                            👁️ Xem chi tiết tin
                          </button>

                          <button
                            className="btn btn-outline"
                            style={{ color: '#ef4444', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setCancelModalJob(j)}
                          >
                            🚫 Hủy nhận việc
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TẤT CẢ ĐƠN ỨNG TUYỂN */}
        {activeTab === 'applications' && (
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: '24px' }}>
            {/* Filter toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${appFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setAppFilter('all'); setAppsPage(1); }}
                >
                  Tất cả ({state.myApplications.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${appFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setAppFilter('pending'); setAppsPage(1); }}
                >
                  ⏳ Đang chờ duyệt ({state.myApplications.filter(a => a.status === 'pending').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${appFilter === 'hired' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setAppFilter('hired'); setAppsPage(1); }}
                >
                  🎉 Đã được chọn ({state.myApplications.filter(a => ['hired', 'submitted', 'revision_requested', 'completed'].includes(a.status)).length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${appFilter === 'rejected' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setAppFilter('rejected'); setAppsPage(1); }}
                >
                  Chưa phù hợp ({state.myApplications.filter(a => a.status === 'rejected').length})
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Tìm theo tên việc hoặc NTD..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setAppsPage(1); }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    minWidth: 240
                  }}
                />
              </div>
            </div>

            {/* List */}
            {filteredApplications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                <b>Không tìm thấy đơn ứng tuyển nào</b>
                <p style={{ fontSize: 13, marginTop: 4 }}>Thử thay đổi bộ lọc tìm kiếm hoặc khám phá các công việc mới.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pagedApplications.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 18px',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      transition: 'all 0.2s',
                      flexWrap: 'wrap',
                      gap: 14
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20
                      }}>
                        📨
                      </div>
                      <div>
                        <div
                          style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', cursor: a.jobId ? 'pointer' : 'default' }}
                          onClick={() => a.jobId && navigate(`/jobs/${a.jobId}`)}
                        >
                          {a.jobTitle || a.title || 'Công việc'}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>🏢 {a.employerName || a.emp || 'Nhà tuyển dụng'}</span>
                          <span>•</span>
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>💰 {fmtVND(a.budget)}</span>
                          <span>•</span>
                          <span>🗓️ {a.appliedAt || 'Gần đây'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div>
                        <span style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          fontSize: 12.5,
                          fontWeight: 700,
                          background: a.status === 'hired' ? '#dcfce7' : (a.status === 'rejected' ? '#f1f5f9' : '#e0e7ff'),
                          color: a.status === 'hired' ? '#15803d' : (a.status === 'rejected' ? '#64748b' : '#4338ca')
                        }}>
                          {APP_STATUS_LABEL[a.status] || a.status}
                        </span>
                      </div>

                      {a.jobId && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/jobs/${a.jobId}`)}
                        >
                          Xem việc
                        </button>
                      )}

                      {a.status === 'pending' && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                          onClick={() => handleWithdrawApp(a.jobId || a.id)}
                        >
                          🚫 Rút đơn
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 20 }}>
                  <Pagination
                    currentPage={appsPage}
                    totalPages={appsTotalPages}
                    totalItems={filteredApplications.length}
                    pageSize={appsPageSize}
                    onPageChange={setAppsPage}
                    itemLabel="đơn ứng tuyển"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal xác nhận hủy nhận việc */}
      {cancelModalJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !isCancelling) setCancelModalJob(null); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e11d48', marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Xác nhận hủy nhận việc</h3>
            </div>

            <p style={{ fontSize: 14, color: '#334155', margin: '0 0 12px' }}>
              Bạn đang yêu cầu hủy công việc: <b>{cancelModalJob.title}</b>
            </p>

            <div style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 13,
              color: '#9f1239',
              marginBottom: 16,
              lineHeight: 1.5
            }}>
              <b>Lưu ý quan trọng:</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>Bạn sẽ <b>bị trừ 10 điểm uy tín (Reliability Score)</b> vì hủy công việc đang trong quá trình thực hiện.</li>
                <li>Công việc sẽ tự động được mở lại để Nhà tuyển dụng lựa chọn ứng viên khác.</li>
                <li>Toàn bộ tiền ký quỹ Escrow sẽ được hoàn trả lại cho NTD.</li>
              </ul>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Lý do hủy việc (tùy chọn):
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do bạn không thể tiếp tục thực hiện công việc..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={isCancelling}
                onClick={() => setCancelModalJob(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#e11d48', borderColor: '#e11d48', fontWeight: 700 }}
                disabled={isCancelling}
                onClick={handleConfirmCancelJob}
              >
                {isCancelling ? 'Đang xử lý...' : 'Xác nhận hủy (Trừ 10đ uy tín)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}