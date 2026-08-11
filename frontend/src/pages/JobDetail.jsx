import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { useStore, fmtVND } from '../context/StoreContext';
import { useModal } from '../context/ModalContext';
import { useConfirm } from '../context/ConfirmContext';
import { DeliverablePreview } from '../components/modals/DeliverableModals';
import { slugify } from '../data/companies';

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
  const { state, applyJob, studentAbandonJob } = useStore();
  const { openModal } = useModal();
  const confirm = useConfirm();
  useTick(30000);

  const j = state.jobs.find((x) => x.id === jobId);
  if (!j) {
    return (
      <div className="page active">
        <div className="wrap" style={{ padding: '100px 0', textAlign: 'center' }}>Không tìm thấy công việc.</div>
      </div>
    );
  }

  const dashJob = j.dashJobId ? state.myJobs.find((dj) => dj.id === j.dashJobId) : null;
  const myApp = state.myApplications.find((x) => x.jobId === jobId);
  const appStatus = myApp?.status;

  let applyLabel = 'Ứng tuyển ngay';
  let applyDisabled = false;
  if (state.appliedJobIds.includes(jobId) || (appStatus && ['hired', 'submitted', 'completed', 'rejected', 'cancelled'].includes(appStatus))) {
    applyDisabled = true;
    if (appStatus === 'hired') applyLabel = '✓ Đã trúng tuyển — nộp bàn giao bên trên';
    else if (appStatus === 'submitted') applyLabel = '📤 Đã nộp bàn giao — chờ xác nhận';
    else if (appStatus === 'completed') applyLabel = '✅ Đã hoàn thành';
    else if (appStatus === 'rejected') applyLabel = 'Rất tiếc, bạn chưa được chọn';
    else if (appStatus === 'cancelled') applyLabel = 'Đã hủy';
    else applyLabel = '✓ Đã ứng tuyển';
  } else if (j.status && j.status !== 'open') {
    applyLabel = 'Đã đóng tuyển';
    applyDisabled = true;
  }

  const showWorkArea = dashJob && ['in_progress', 'submitted', 'revision_requested', 'completed', 'cancelled'].includes(dashJob.status) && (dashJob.hiredApplicant || dashJob.hiredApplicantIsMe);

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
                {j.urgent && <span className="chip chip-coral">Gấp</span>}
                <span className="chip">{j.time}</span>
              </div>
              <div className="jd-block">
                <h4>Mô tả công việc</h4>
                <p>{j.desc}</p>
              </div>
              <div className="jd-block">
                <h4>Yêu cầu</h4>
                <ul>{j.req.map((r, i) => <li key={i}><Icon name="check" /> {r}</li>)}</ul>
              </div>
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
                  {dashJob.status === 'in_progress' && (
                    <div className="jd-card" style={{ border: '1.5px solid var(--primary)', background: 'var(--surface)' }}>
                      <h4 style={{ marginBottom: 8 }}>🎯 Đã trúng tuyển — hãy nộp sản phẩm</h4>
                      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>Người được thuê: <b>{dashJob.hiredApplicant || 'Bạn'}</b></p>
                      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>Hạn bàn giao: <b>{formatDeadline(dashJob.deadlineAt)}</b></p>
                      <button className="btn btn-primary btn-block" style={{ marginBottom: 8 }} onClick={() => openModal('deliverable', { jobId: dashJob.id })}>📤 Nộp bàn giao / sản phẩm</button>
                      <button className="btn btn-outline btn-block" style={{ marginBottom: 8 }} onClick={() => openModal('chat', { withName: j.emp })}>💬 Nhắn tin NTD</button>
                      <button className="btn btn-outline btn-block" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                        onClick={async () => { if (await confirm(`Bạn chắc chắn muốn bỏ ngang công việc "${j.title}"? Điểm uy tín của bạn sẽ bị trừ và nhà tuyển dụng sẽ được hoàn tiền ký quỹ.`, { danger: true, confirmLabel: 'Bỏ việc' })) studentAbandonJob(dashJob.id); }}>
                        Bỏ việc giữa chừng
                      </button>
                    </div>
                  )}
                  {dashJob.status === 'submitted' && (
                    <div className="jd-card" style={{ border: '1.5px solid var(--lime)' }}>
                      <h4 style={{ marginBottom: 8 }}>📤 Đã nộp bàn giao{dashJob.deliverable?.version > 1 ? ' — phiên bản ' + dashJob.deliverable.version : ''}</h4>
                      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Đang chờ nhà tuyển dụng xác nhận và giải ngân <b>{fmtVND(dashJob.escrowAmount || dashJob.budget)}</b>.</p>
                      <DeliverablePreview d={dashJob.deliverable} />
                      <button className="btn btn-outline btn-block" onClick={() => openModal('deliverable', { jobId: dashJob.id })}>✏️ Cập nhật lại bàn giao</button>
                    </div>
                  )}
                  {dashJob.status === 'revision_requested' && (
                    <div className="jd-card" style={{ border: '1.5px solid var(--coral)' }}>
                      <h4 style={{ marginBottom: 8 }}>✏️ Nhà tuyển dụng yêu cầu sửa lại</h4>
                      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>Lượt {dashJob.revisionCount}/{dashJob.revisionLimit}.</p>
                      {dashJob.deliverableFeedback?.length > 0 && (
                        <div className="empty-state" style={{ textAlign: 'left', background: 'var(--surface)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                          <b style={{ fontSize: 12.5, color: 'var(--coral)' }}>Góp ý mới nhất:</b>
                          <p style={{ marginTop: 4, fontSize: 13 }}>{dashJob.deliverableFeedback[dashJob.deliverableFeedback.length - 1].text}</p>
                        </div>
                      )}
                      <button className="btn btn-primary btn-block" style={{ marginBottom: 8 }} onClick={() => openModal('deliverable', { jobId: dashJob.id })}>📤 Nộp lại bàn giao</button>
                      <button className="btn btn-outline btn-block" onClick={() => openModal('chat', { withName: j.emp })}>💬 Hỏi thêm NTD</button>
                    </div>
                  )}
                  {dashJob.status === 'completed' && (
                    <div className="jd-card">
                      <h4>✅ Đã hoàn thành & nhận thanh toán</h4>
                      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>Cảm ơn bạn đã hoàn thành công việc trên SkillBridge.</p>
                      {dashJob.deliverable && <DeliverablePreview d={dashJob.deliverable} revealFinal />}
                    </div>
                  )}
                  {dashJob.status === 'cancelled' && <div className="jd-card"><h4>🚫 Công việc đã bị hủy</h4></div>}
                </div>
              )}

              <div className="jd-card">
                <div className="jd-price">{fmtVND(j.budget)}</div>
                <div className="jd-price-lbl">Ngân sách công việc</div>
                <button className="btn btn-primary btn-block" style={{ marginBottom: 10 }} disabled={applyDisabled}
                  onClick={() => applyJob(j.id)}>{applyLabel}</button>
                <button className="btn btn-outline btn-block" style={{ marginBottom: 10 }} onClick={() => openModal('chat', { withName: j.emp })}>
                  <span className="msg-btn-inline"><Icon name="chat" style={{ width: 14, height: 14 }} /> Nhắn tin với nhà tuyển dụng</span>
                </button>
                <button className="btn btn-outline btn-block" style={{ marginBottom: 10 }}>Lưu công việc</button>
                <button className="btn btn-outline btn-block" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                  onClick={() => openModal('report', { withName: j.emp })}>🚩 Báo cáo nhà tuyển dụng</button>
              </div>
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
    </div>
  );
}
