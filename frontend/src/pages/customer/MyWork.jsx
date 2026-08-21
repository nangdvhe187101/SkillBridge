import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';

function formatDeadline(ts) {
  if (!ts) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return 'Đã quá hạn';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `còn ${days} ngày ${hours} giờ`;
  return `còn ${hours} giờ`;
}

// Map trạng thái ứng tuyển hiển thị cho SV
const APP_STATUS_LABEL = {
  pending: 'Đang chờ duyệt',
  hired: '🎉 Đã được chọn',
  rejected: 'Chưa được chọn',
  submitted: 'Đã nộp bàn giao',
  revision_requested: 'Cần sửa lại',
  completed: '✅ Hoàn thành',
  cancelled: 'Đã hủy',
};

const APP_STATUS_COLOR = {
  hired: 'var(--lime)',
  submitted: 'var(--accent)',
  revision_requested: 'var(--coral)',
  completed: '#4B2FD1',
  pending: 'var(--ink-soft)',
  rejected: 'var(--ink-soft)',
  cancelled: 'var(--coral)',
};

export default function MyWork() {
  const { state, openChatWithPerson } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();

  const [appsPage, setAppsPage] = useState(1);
  const appsPageSize = 5;

  const activeWork = useMemo(() => state.myJobs.filter((j) =>
    ['in_progress', 'submitted', 'revision_requested'].includes(j.status) && j.hiredApplicant
  ), [state.myJobs]);

  const appsTotalPages = Math.ceil(state.myApplications.length / appsPageSize) || 1;
  const pagedApplications = useMemo(() => {
    const start = (appsPage - 1) * appsPageSize;
    return state.myApplications.slice(start, start + appsPageSize);
  }, [state.myApplications, appsPage]);

  return (
    <div className="page active">
      <div className="jobs-head">
        <div className="wrap">
          <h1>Việc của tôi</h1>
          <p>Theo dõi đơn ứng tuyển, việc đang làm và nộp bàn giao sản phẩm.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/jobs')}>Tìm việc mới</button>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 36, paddingBottom: 80 }}>
        <div className="pb-grid">

          {/* Cột trái: Việc đang làm */}
          <div>
            <div className="pcard">
              <h4>🎯 Việc đang làm / chờ nộp sản phẩm</h4>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.55 }}>
                Khi được thuê, công việc sẽ hiện ở đây để bạn nộp link sản phẩm và theo dõi hạn hoàn thành.
              </p>
              {activeWork.length === 0 ? (
                <div className="empty-state">Bạn chưa được chọn vào công việc nào đang thực hiện. Ứng tuyển nhiều hơn để tăng cơ hội!</div>
              ) : (
                activeWork.map((j) => {
                  const isSubmitted = j.status === 'submitted';
                  const isRevision = j.status === 'revision_requested';
                  const isInProgress = j.status === 'in_progress';
                  const empName = state.jobs.find((pj) => pj.dashJobId === j.id)?.emp || 'Nhà tuyển dụng';
                  return (
                    <div className="tx-row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }} key={j.id}>
                      <div className="tx-ic">{isRevision ? '✏️' : (isSubmitted ? '📤' : '🎯')}</div>
                      <div className="tx-main" style={{ flex: 1, minWidth: 140 }}>
                        <b>{j.title}</b>
                        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                          <span>{fmtVND(j.budget)}</span>
                          {j.deadlineAt && (
                            <span style={{ color: '#0284c7', fontWeight: 600 }}>⏰ Hạn: {formatDeadline(j.deadlineAt)}</span>
                          )}
                        </span>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {isRevision && (
                            <button className="btn btn-primary btn-sm" style={{ background: 'var(--coral)' }}
                              onClick={() => openModal('deliverable', { jobId: j.id })}>
                              📤 Nộp lại ({j.revisionCount}/{j.revisionLimit} lần sửa)
                            </button>
                          )}
                          {isSubmitted && (
                            <button className="btn btn-outline btn-sm"
                              onClick={() => openModal('deliverable', { jobId: j.id })}>
                              ✏️ Cập nhật bàn giao
                            </button>
                          )}
                          {isInProgress && (
                            <button className="btn btn-primary btn-sm"
                              onClick={() => openModal('deliverable', { jobId: j.id })}>
                              📤 Nộp bàn giao / sản phẩm
                            </button>
                          )}
                          <button className="btn btn-outline btn-sm" onClick={() => openChatWithPerson(empName)}>
                            💬 Chat với NTD
                          </button>
                        </div>
                        {isRevision && j.deliverableFeedback?.length > 0 && (
                          <div style={{ marginTop: 8, padding: 10, background: 'rgba(255,92,122,0.08)', borderRadius: 8, fontSize: 12.5 }}>
                            <b style={{ color: 'var(--coral)' }}>Góp ý mới nhất:</b>
                            <p style={{ marginTop: 4 }}>{j.deliverableFeedback[j.deliverableFeedback.length - 1].text}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className={'djr-status ' + j.status} style={{ display: 'inline-block' }}>
                          {isRevision ? 'Cần sửa lại' : (isSubmitted ? 'Đã nộp' : 'Đang làm')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cột phải: Đơn ứng tuyển */}
          <div>
            <div className="pcard">
              <h4>📨 Đơn ứng tuyển của bạn</h4>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.55 }}>
                Danh sách các việc bạn đã ứng tuyển và trạng thái phản hồi từ nhà tuyển dụng.
              </p>
              {state.myApplications.length === 0 ? (
                <div className="empty-state">Bạn chưa ứng tuyển công việc nào.</div>
              ) : (
                <>
                  {pagedApplications.map((a) => (
                    <div
                      className="tx-row"
                      style={{ cursor: a.jobId != null ? 'pointer' : 'default', alignItems: 'center' }}
                      key={a.id}
                      onClick={() => a.jobId != null && navigate(`/jobs/${a.jobId}`)}
                    >
                      <div className="tx-ic">📨</div>
                      <div className="tx-main" style={{ flex: 1, minWidth: 140 }}>
                        <b>{a.title}</b>
                        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                          {a.emp} · {fmtVND(a.budget)} · {a.appliedAt}
                        </span>
                      </div>
                      <div>
                        <span
                          className={'djr-status ' + a.status}
                          style={{ display: 'inline-block', color: APP_STATUS_COLOR[a.status] }}
                        >
                          {APP_STATUS_LABEL[a.status] || a.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  <Pagination
                    currentPage={appsPage}
                    totalPages={appsTotalPages}
                    totalItems={state.myApplications.length}
                    pageSize={appsPageSize}
                    onPageChange={setAppsPage}
                    itemLabel="đơn ứng tuyển"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pcard" style={{ marginTop: 8 }}>
          <h4>💡 Gợi ý nhanh</h4>
          <ul style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.7, paddingLeft: 18, listStyle: 'disc' }}>
            <li>Nộp bàn giao sớm trước hạn để giữ điểm Reliability cao.</li>
            <li>Sau khi NTD giải ngân, bạn có thể đánh giá 2 chiều từ thông báo hoặc Hồ sơ.</li>
            <li>Nếu NTD quỵt tiền, gửi khiếu nại tới Quỹ Bảo hiểm trong mục Ví của tôi.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}