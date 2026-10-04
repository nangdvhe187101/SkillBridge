import ModalShell from './ModalShell';
import Icon from '../Icon';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useNavigate } from 'react-router-dom';
import { downloadJobAttachment } from '../../utils/fileDownloader';

import { printReceipt, downloadReceiptTxt } from '../../utils/receiptExporter';

export function ReceiptModal({ onClose, justCompletedId, job: propJob }) {
  const { state } = useStore();
  const { openModal } = useModal();
  const numericCompletedId = justCompletedId ? Number(justCompletedId) : null;
  let receipt = numericCompletedId
    ? state.receipts.find((r) => r.dashJobId === numericCompletedId || r.jobId === numericCompletedId || r.dashJobId === justCompletedId)
    : state.receipts[0];

  const job = propJob 
    || (numericCompletedId ? state.myJobs.find((j) => j.id === numericCompletedId) : null)
    || (receipt ? state.myJobs.find((j) => j.id === receipt.dashJobId || j.id === receipt.jobId || j.title === receipt.jobTitle) : null);

  // Fallback nếu chưa có receipt trong state.receipts nhưng có job
  if (!receipt && job) {
    receipt = {
      id: `rc-${job.id}`,
      code: `SB-REC-${job.id}`,
      dashJobId: job.id,
      jobId: job.id,
      jobTitle: job.title,
      student: job.hiredApplicant || 'Sinh viên thực hiện',
      studentSchool: job.studentSchool || 'Đại học FPT',
      studentId: job.hiredApplicantId || 'VERIFIED',
      employer: job.employer || state.currentUser?.fullName || state.currentUser?.companyName || 'Nhà tuyển dụng SkillBridge',
      employerTaxCode: state.currentUser?.taxCode || '0109988776',
      employerRepresentative: state.currentUser?.representative || state.currentUser?.fullName || 'Đại diện Doanh nghiệp',
      budget: job.budget || 0,
      commission: 0,
      total: job.budget || 0,
      net: job.budget || 0,
      date: job.completedAt ? new Date(job.completedAt).toLocaleString('vi-VN') : (job.date || new Date().toLocaleString('vi-VN')),
    };
  } else if (receipt) {
    receipt = {
      ...receipt,
      employer: receipt.employer || state.currentUser?.fullName || state.currentUser?.companyName || 'Nhà tuyển dụng SkillBridge',
      employerTaxCode: receipt.employerTaxCode || state.currentUser?.taxCode || '0109988776',
      employerRepresentative: receipt.employerRepresentative || state.currentUser?.representative || state.currentUser?.fullName || 'Đại diện Doanh nghiệp',
      studentSchool: receipt.studentSchool || (job && job.studentSchool) || 'Đại học đối tác',
    };
  }

  if (!receipt) {
    onClose();
    return null;
  }

  const proceed = () => {
    onClose();
    if (job && (job.status === 'completed' || job.status === 'closed') && (job.hiredApplicant || receipt.student)) {
      openModal('review', {
        jobTitle: job.title,
        withName: job.hiredApplicant || receipt.student,
        direction: 'toStudent',
        dashJobId: job.id
      });
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 18 }}>
          <Icon name="receipt" width="22" height="22" /> Phiếu nghiệm thu & Hóa đơn điện tử
        </h3>
        <span className="badge badge-success" style={{ fontSize: 12, padding: '4px 8px' }}>
          Đã giải ngân
        </span>
      </div>

      <div style={{ background: 'rgba(2, 132, 199, 0.06)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: 'var(--ink-soft)' }}>Mã biên lai / Hóa đơn:</span>
          <b><code>{receipt.code || `SB-REC-${receipt.jobId || '2026'}`}</code></b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--ink-soft)' }}>Hồ sơ kế toán:</span>
          <span style={{ color: '#0369a1', fontWeight: 600 }}>Biên bản nghiệm thu & Quyết toán ký quỹ</span>
        </div>
      </div>

      <div className="checkout-summary">
        <div className="cs-row"><span>Công việc / Dự án</span><span style={{ fontWeight: 600 }}>{receipt.jobTitle}</span></div>
        <div className="cs-row"><span>Đơn vị chi trả (Bên A)</span><span>{receipt.employer}</span></div>
        <div className="cs-row"><span>Sinh viên thụ hưởng (Bên B)</span><span>{receipt.student}</span></div>
        <div className="cs-row"><span>Tổng giá trị hợp đồng</span><span>{fmtVND(receipt.budget)}</span></div>
        <div className="cs-row">
          <span>Phí nền tảng & ký quỹ</span>
          <span>{receipt.commission > 0 ? fmtVND(receipt.commission) : '0đ (Miễn phí nền tảng)'}</span>
        </div>
        <div className="cs-row total">
          <span>Thực thanh toán</span>
          <span style={{ color: 'var(--primary)', fontSize: 16 }}>{fmtVND(receipt.total || receipt.budget)}</span>
        </div>
        <div className="cs-row"><span>Thời gian nghiệm thu</span><span>{receipt.date}</span></div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, marginBottom: 18, lineHeight: 1.5 }}>
        Biên bản nghiệm thu và phiếu thu điện tử có đầy đủ chữ ký số điện tử của SkillBridge Platform. Nhà tuyển dụng có thể tải file PDF hoặc in trực tiếp để lưu trữ vào hồ sơ chứng từ kế toán nội bộ.
      </p>

      {/* Download / Print Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => printReceipt(receipt)}
            title="Mở giao diện in và lưu file PDF Phiếu nghiệm thu tiêu chuẩn A4"
          >
            <Icon name="download" width="16" height="16" /> Tải về file PDF Phiếu nghiệm thu
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => downloadReceiptTxt(receipt)}
            title="Tải văn bản chi tiết sao kê dạng TXT"
          >
            Tải .TXT
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {job && (job.status === 'completed' || job.status === 'closed') && (job.hiredApplicant || receipt.student) && (
            <button 
              type="button" 
              className="btn btn-lime" 
              style={{ flex: 1 }}
              onClick={proceed}
            >
              Tiếp tục đánh giá sinh viên →
            </button>
          )}
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ minWidth: 80 }}
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ViewJobModal({ onClose, jobId }) {
  const { state, startEditJob } = useStore();
  const navigate = useNavigate();
  const job = state.myJobs.find((j) => j.id === jobId);
  if (!job) return null;
  const hasHired = !!job.hiredApplicant;

  return (
    <ModalShell onClose={onClose}>
      <h3>{job.title}</h3>
      <div className="modal-tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0 14px' }}>
        <span className="chip chip-lime" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="folder" width="13" height="13" /> {job.cat}
        </span>
        <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="wallet" width="13" height="13" /> {fmtVND(job.budget)}
        </span>
        {job.urgent && (
          <span className="chip chip-coral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="bolt" width="13" height="13" /> Tuyển gấp
          </span>
        )}
        <span className={'djr-status ' + job.status} style={{ display: 'inline-block' }}>
          {job.status === 'open' ? 'Đang tuyển' : job.status === 'in_progress' ? 'Đang thực hiện' : job.status === 'submitted' ? 'Chờ xác nhận bàn giao' : job.status === 'completed' ? 'Đã hoàn thành' : job.status}
        </span>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>MÔ TẢ CÔNG VIỆC</h4>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{job.desc}</p>
      </div>

      {job.req && job.req.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>YÊU CẦU CÔNG VIỆC</h4>
          <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
            {job.req.map((r, idx) => <li key={idx} style={{ marginBottom: 4 }}>{r}</li>)}
          </ul>
        </div>
      )}

      {job.attachments && job.attachments.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="paperclip" width="14" height="14" /> TÀI LIỆU ĐÍNH KÈM ({job.attachments.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {job.attachments.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-card, rgba(255,255,255,0.05))', borderRadius: 6, fontSize: 12.5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="file-text" width="14" height="14" /> <b>{f.name}</b> {f.size ? `(${f.size > 1024*1024 ? (f.size/(1024*1024)).toFixed(1)+' MB' : (f.size/1024).toFixed(0)+' KB'})` : ''}
                </span>
                <span className="chip" style={{ fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => downloadJobAttachment(f, job.title)}>
                  <Icon name="download" width="12" height="12" /> Tải về
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {job.hiredApplicant && (
        <div style={{ background: 'rgba(87, 199, 255, 0.1)', border: '1px solid var(--accent)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <b style={{ color: 'var(--accent)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="users" width="15" height="15" /> Đã thuê: {job.hiredApplicant}
          </b>
        </div>
      )}

      <div className="modal-actions">
        {!hasHired && (
          <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => { onClose(); startEditJob(job.id); navigate('/dashboard?tab=post'); }}>
            <Icon name="edit" width="14" height="14" /> Chỉnh sửa tin
          </button>
        )}
        <button className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => { onClose(); navigate(`/dashboard/jobs/${job.id}`); }}>
          <Icon name="users" width="14" height="14" /> Xem ứng viên ({job.applicants?.length || 0})
        </button>
        <button className="btn btn-outline" onClick={onClose}>Đóng</button>
      </div>
    </ModalShell>
  );
}

export function ReportModal({ onClose, withName }) {
  return (
    <ModalShell onClose={onClose}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="flag" width="20" height="20" style={{ color: 'var(--coral)' }} /> Báo cáo {withName}
      </h3>
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
        <p style={{ color: 'var(--ink-soft)', marginTop: 8 }}>{message}</p>
      </div>
      <div className="modal-actions"><button className="btn btn-primary btn-block" onClick={onClose}>Đóng</button></div>
    </ModalShell>
  );
}