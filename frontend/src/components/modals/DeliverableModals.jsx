import { useState } from 'react';
import ModalShell from './ModalShell';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';

function watermarkImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode-failed'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 8);
        ctx.font = `bold ${Math.max(18, Math.round(canvas.width / 16))}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        const label = 'SKILLBRIDGE · XEM TRƯỚC · CHƯA THANH TOÁN';
        const stepY = Math.max(60, canvas.height / 6);
        for (let y = -canvas.height; y < canvas.height; y += stepY) {
          ctx.strokeText(label, 0, y);
          ctx.fillText(label, 0, y);
        }
        ctx.restore();
        resolve({ previewDataUrl: canvas.toDataURL('image/png', 0.92), finalDataUrl: reader.result });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function DeliverablePreview({ d, revealFinal }) {
  if (!d) return null;
  if (d.mode === 'link') {
    return (
      <>
        <p style={{ margin: '6px 0', fontSize: 13 }}><b>Link:</b> <a href={d.url} target="_blank" rel="noopener noreferrer">{d.url}</a></p>
        <p style={{ fontSize: 11.5, color: 'var(--coral)' }}>⚠️ Link ngoài — SkillBridge không kiểm soát/bảo vệ được nội dung ở đây, 2 bên tự chịu rủi ro.</p>
      </>
    );
  }
  if (d.previewDataUrl) {
    return revealFinal ? (
      <>
        <div style={{ margin: '8px 0' }}><img src={d.finalDataUrl} style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)' }} alt="Bàn giao" /></div>
        <a className="btn btn-outline btn-sm" href={d.finalDataUrl} download={d.fileName || 'deliverable'}>⬇️ Tải bản gốc (không watermark)</a>
      </>
    ) : (
      <>
        <div style={{ margin: '8px 0' }}>
          <img src={d.previewDataUrl} onContextMenu={(e) => e.preventDefault()} style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)', userSelect: 'none', pointerEvents: 'none' }} alt="Xem trước có watermark" />
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>🔒 Bản xem trước có watermark — bản gốc chỉ mở khi xác nhận & giải ngân.</p>
      </>
    );
  }
  return revealFinal && d.finalDataUrl ? (
    <div style={{ margin: '8px 0' }}><a className="btn btn-outline btn-sm" href={d.finalDataUrl} download={d.fileName || 'deliverable'}>⬇️ Tải {d.fileName || 'file bàn giao'}</a></div>
  ) : (
    <div className="empty-state" style={{ textAlign: 'left', background: 'var(--surface)', borderRadius: 10, padding: 12, margin: '8px 0' }}>
      🔒 <b>{d.fileName || 'Tệp đính kèm'}</b>{d.fileSize ? ` (${Math.round(d.fileSize / 1024)} KB)` : ''}
      <br /><span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Nội dung đầy đủ được khoá — chỉ mở khi xác nhận & giải ngân.</span>
    </div>
  );
}
export { DeliverablePreview };

export function DeliverableModal({ onClose, jobId }) {
  const { state, submitDeliverable } = useStore();
  const job = state.myJobs.find((j) => j.id === jobId);
  const prev = job?.deliverable || {};
  const [mode, setMode] = useState(prev.mode || 'file');
  const [url, setUrl] = useState(prev.url || '');
  const [note, setNote] = useState(prev.note || '');
  const [file, setFile] = useState(null);
  if (!job) return null;
  const isUpdate = ['submitted', 'revision_requested'].includes(job.status) && !!(prev.url || prev.fileName);
  const lastFeedback = job.status === 'revision_requested' && job.deliverableFeedback?.length
    ? job.deliverableFeedback[job.deliverableFeedback.length - 1] : null;

  const submit = async () => {
    if (mode === 'link') {
      if (!url.trim()) return;
      submitDeliverable({ jobId, mode: 'link', url: url.trim(), note });
      onClose();
      return;
    }
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File tối đa 5MB.'); return; }
    if (file.type.startsWith('image/')) {
      try {
        const { previewDataUrl, finalDataUrl } = await watermarkImageFile(file);
        submitDeliverable({ jobId, mode: 'file', fileName: file.name, fileSize: file.size, previewDataUrl, finalDataUrl, note });
      } catch {
        submitDeliverable({ jobId, mode: 'file', fileName: file.name, fileSize: file.size, note });
      }
    } else {
      submitDeliverable({ jobId, mode: 'file', fileName: file.name, fileSize: file.size, note });
    }
    onClose();
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>📤 {isUpdate ? 'Cập nhật' : 'Nộp'} bàn giao công việc</h3>
      <p>Gửi sản phẩm hoàn thiện cho "<b>{job.title}</b>" để nhà tuyển dụng xác nhận và giải ngân.</p>
      {lastFeedback && (
        <div className="empty-state" style={{ textAlign: 'left', background: 'var(--surface)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <b style={{ fontSize: 12.5, color: 'var(--coral)' }}>✏️ NTD yêu cầu sửa:</b>
          <p style={{ marginTop: 4, fontSize: 13 }}>{lastFeedback.text}</p>
        </div>
      )}
      <div className="field">
        <label>Cách nộp bàn giao</label>
        <div style={{ display: 'flex', gap: 16, margin: '4px 0 10px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <input type="radio" checked={mode === 'file'} onChange={() => setMode('file')} /> 📁 Tải file lên
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <input type="radio" checked={mode === 'link'} onChange={() => setMode('link')} /> 🔗 Dán link
          </label>
        </div>
      </div>
      {mode === 'file' ? (
        <div className="upload-zone">
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <div className="uz-ic">📁</div>
          <b>Kéo thả hoặc bấm để chọn file sản phẩm</b>
          <span>Tối đa 5MB · demo lưu tên/kích thước file, không tải lên server thật</span>
          {file && <div style={{ fontSize: 12.5, marginTop: 6, color: 'var(--ink-soft)' }}>Đã chọn: {file.name} ({Math.round(file.size / 1024)} KB)</div>}
        </div>
      ) : (
        <div className="field">
          <label>Link sản phẩm (Drive, Behance, Figma, GitHub, web app...)</label>
          <input type="text" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>Ghi chú bàn giao</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mô tả những gì đã hoàn thành..." />
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={submit}>{isUpdate ? 'Cập nhật bàn giao' : 'Gửi bàn giao'}</button>
        <button className="btn btn-outline" onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function RevisionModal({ onClose, jobId }) {
  const { state, requestRevision } = useStore();
  const job = state.myJobs.find((j) => j.id === jobId);
  const [text, setText] = useState('');
  if (!job) return null;
  const submit = () => {
    if (!text.trim()) return;
    requestRevision({ jobId, text: text.trim() });
    onClose();
  };
  return (
    <ModalShell onClose={onClose}>
      <h3>✏️ Yêu cầu sửa bàn giao</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        Cho <b>{job.hiredApplicant}</b> biết cần chỉnh sửa gì. Lượt {(job.revisionCount || 0) + 1}/{job.revisionLimit}.
      </p>
      <div className="field">
        <label>Nội dung cần sửa</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="VD: Đổi màu chủ đạo sang xanh dương, thêm logo công ty ở góc trên..." />
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" style={{ background: 'var(--coral)' }} onClick={submit}>Gửi yêu cầu sửa</button>
        <button className="btn btn-outline" onClick={onClose}>Quay lại</button>
      </div>
    </ModalShell>
  );
}

export function DeliverableReviewModal({ onClose, jobId }) {
  const { state, markJobComplete } = useStore();
  const { openModal } = useModal();
  const job = state.myJobs.find((j) => j.id === jobId);
  if (!job || !job.deliverable) return null;
  const limitReached = job.revisionCount >= job.revisionLimit;

  return (
    <ModalShell onClose={onClose}>
      <h3>📥 Bàn giao từ {job.hiredApplicant} — phiên bản {job.deliverable.version || 1}</h3>
      <p><b>{job.title}</b></p>
      <DeliverablePreview d={job.deliverable} revealFinal={false} />
      <div className="checkout-summary" style={{ marginTop: 8 }}>
        <div className="cs-row"><span>Ghi chú</span><span>{job.deliverable.note || '—'}</span></div>
        <div className="cs-row"><span>Nộp lúc</span><span>{job.deliverable.submittedAt}</span></div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10 }}>
        Xác nhận để giải ngân {fmtVND(job.escrowAmount || job.budget)} cho sinh viên, hoặc yêu cầu sửa lại nếu sản phẩm chưa đạt.
      </p>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={() => { onClose(); markJobComplete(job.id); openModal('receipt', { justCompletedId: job.id }); }}>
          ✓ Xác nhận & Giải ngân
        </button>
        <button className="btn btn-outline" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} disabled={limitReached}
          onClick={() => { onClose(); openModal('revision', { jobId: job.id }); }}>
          ✏️ Yêu cầu sửa
        </button>
        <button className="btn btn-outline" onClick={onClose}>Để sau</button>
      </div>
    </ModalShell>
  );
}
