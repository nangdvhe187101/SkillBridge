import { useNavigate } from 'react-router-dom';
import { useStore, fmtVND } from '../context/StoreContext';
import { useModal } from '../context/ModalContext';

function formatDeadline(ts) {
  if (!ts) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return 'Đã quá hạn';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `còn ${days} ngày ${hours} giờ`;
  return `còn ${hours} giờ`;
}

const APP_STATUS_LABEL = {
  pending: 'Đang chờ duyệt', hired: '🎉 Đã được chọn', rejected: 'Chưa được chọn', submitted: 'Đã nộp bàn giao',
  revision_requested: 'Đang chờ sửa lại', completed: '✅ Hoàn thành', cancelled: 'Đã hủy',
};

export default function MyWork() {
  const { state } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();

  const active = state.myJobs.filter((j) => ['in_progress', 'submitted', 'revision_requested'].includes(j.status));

  return (
    <div className="page active">
      <div className="jobs-head">
        <div className="wrap">
          <h1>Việc của tôi</h1>
          <p>Theo dõi đơn ứng tuyển, việc đang làm và nộp bàn giao sản phẩm — tách riêng khỏi Hồ sơ cá nhân.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/jobs')}>Tìm việc mới</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}>Xem hồ sơ</button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/wallet')}>Ví & thanh toán</button>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 36, paddingBottom: 80 }}>
        <div className="pb-grid">
          <div>
            <div className="pcard">
              <h4>🎯 Việc đang làm / chờ nộp sản phẩm</h4>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.55 }}>
                Khi được thuê, công việc sẽ hiện ở đây để bạn nộp link sản phẩm và theo dõi hạn hoàn thành.
              </p>
              {active.length === 0 ? (
                <div className="empty-state">Chưa có việc đang thực hiện. Khi bạn được thuê, việc sẽ hiện ở đây để nộp sản phẩm.</div>
              ) : (
                active.map((j) => {
                  const isSubmitted = j.status === 'submitted';
                  const isRevision = j.status === 'revision_requested';
                  const chipLabel = isRevision ? 'Cần sửa lại' : (isSubmitted ? 'Đã nộp' : 'Đang làm');
                  const empName = state.jobs.find((pj) => pj.dashJobId === j.id)?.emp || 'Nhà tuyển dụng';
                  return (
                    <div className="tx-row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }} key={j.id}>
                      <div className="tx-ic">{isRevision ? '✏️' : (isSubmitted ? '📤' : '🎯')}</div>
                      <div className="tx-main" style={{ flex: 1, minWidth: 140 }}>
                        <b>{j.title}</b>
                        <span>{j.hiredApplicant || 'Bạn'} · {fmtVND(j.budget)} · Hạn: {formatDeadline(j.deadlineAt)}</span>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {isRevision && (
                            <button className="btn btn-primary btn-sm" style={{ background: 'var(--coral)' }} onClick={() => openModal('deliverable', { jobId: j.id })}>
                              📤 Nộp lại bàn giao (lượt {j.revisionCount}/{j.revisionLimit})
                            </button>
                          )}
                          {isSubmitted && (
                            <>
                              <button className="btn btn-outline btn-sm" onClick={() => openModal('deliverable', { jobId: j.id })}>✏️ Cập nhật bàn giao</button>
                              <button className="btn btn-primary btn-sm" onClick={() => openModal('deliverableReview', { jobId: j.id })}>📥 Xem & giải ngân (NTD)</button>
                            </>
                          )}
                          {!isSubmitted && !isRevision && (
                            <button className="btn btn-primary btn-sm" onClick={() => openModal('deliverable', { jobId: j.id })}>📤 Nộp bàn giao / sản phẩm</button>
                          )}
                          <button className="btn btn-outline btn-sm" onClick={() => openModal('chat', { withName: empName })}>💬 Chat với NTD</button>
                        </div>
                      </div>
                      <div><span className={'djr-status ' + j.status} style={{ display: 'inline-block' }}>{chipLabel}</span></div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="pcard">
              <h4>📨 Đơn ứng tuyển của bạn</h4>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.55 }}>
                Danh sách các việc bạn đã ứng tuyển và trạng thái phản hồi từ nhà tuyển dụng.
              </p>
              {state.myApplications.length === 0 ? (
                <div className="empty-state">Bạn chưa ứng tuyển công việc nào.</div>
              ) : (
                state.myApplications.map((a) => (
                  <div className="tx-row" style={{ cursor: 'pointer', alignItems: 'center' }} key={a.id}
                    onClick={() => a.jobId != null && navigate(`/jobs/${a.jobId}`)}>
                    <div className="tx-ic">📨</div>
                    <div className="tx-main" style={{ flex: 1, minWidth: 140 }}><b>{a.title}</b><span>{a.emp} · {fmtVND(a.budget)} · {a.appliedAt}</span></div>
                    <div><span className={'djr-status ' + a.status} style={{ display: 'inline-block' }}>{APP_STATUS_LABEL[a.status] || a.status}</span></div>
                  </div>
                ))
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
