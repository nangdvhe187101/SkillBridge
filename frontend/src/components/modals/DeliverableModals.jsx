import { useState, useEffect } from 'react';
import ModalShell from './ModalShell';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { submitJobDeliverable, getJobDeliverables } from '../../api/deliverableApi';
import { downloadDeliverableFile } from '../../utils/fileDownloader';

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
  if (d.mode === 'link' || (!d.previewFileUrl && d.externalUrl) || d.fileType === 'url') {
    const url = d.url || d.externalUrl || d.previewFileUrl;
    return (
      <>
        <p style={{ margin: '6px 0', fontSize: 13 }}><b>Link:</b> <a href={url} target="_blank" rel="noopener noreferrer">{url}</a></p>
        <p style={{ fontSize: 11.5, color: 'var(--coral)' }}>⚠️ Link ngoài — SkillBridge không kiểm soát/bảo vệ được nội dung ở đây, 2 bên tự chịu rủi ro.</p>
      </>
    );
  }

  const previewUrl = d.previewFileUrl || d.previewDataUrl;
  const finalUrl = d.finalFileUrl || d.finalDataUrl;

  if (previewUrl && (previewUrl.startsWith('data:image') || previewUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i))) {
    return revealFinal ? (
      <>
        <div style={{ margin: '8px 0' }}><img src={finalUrl || previewUrl} style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)' }} alt="Bàn giao" /></div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
        >
          ⬇️ Tải bản gốc
        </button>
      </>
    ) : (
      <>
        <div style={{ margin: '8px 0' }}>
          <img src={previewUrl} onContextMenu={(e) => e.preventDefault()} style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)', userSelect: 'none', pointerEvents: 'none' }} alt="Xem trước có watermark" />
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>🔒 Bản xem trước có watermark — bản gốc chỉ mở khi xác nhận & giải ngân.</p>
      </>
    );
  }

  return revealFinal && finalUrl ? (
    <div style={{ margin: '8px 0' }}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
      >
        ⬇️ Tải {d.fileName || 'file bàn giao'}
      </button>
    </div>
  ) : (
    <div className="empty-state" style={{ textAlign: 'left', background: 'var(--surface)', borderRadius: 10, padding: 12, margin: '8px 0' }}>
      🔒 <b>{d.fileName || 'Tệp đính kèm'}</b>{d.fileSize ? ` (${Math.round(d.fileSize / 1024)} KB)` : ''}
      <br /><span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Nội dung đầy đủ được lưu trên Cloudflare R2 và bảo vệ an toàn.</span>
      {finalUrl && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
          >
            Tải file an toàn
          </button>
        </div>
      )}
    </div>
  );
}
export { DeliverablePreview };

export function DeliverableModal({ onClose, jobId, job: propJob, onSubmitted }) {
  const { state, submitDeliverable, refreshMyApplications } = useStore();
  const localJob = state.myJobs.find((j) => j.id === jobId) ||
                   state.myApplications.find((a) => a.jobId === jobId || a.id === jobId);
  const job = propJob || localJob || { id: jobId, title: 'Công việc', status: 'in_progress' };
  const [apiDeliverable, setApiDeliverable] = useState(null);
  const [apiFeedbacks, setApiFeedbacks] = useState([]);

  useEffect(() => {
    if (jobId && !isNaN(Number(jobId)) && (!job?.deliverableFeedback?.length || !job?.deliverable)) {
      getJobDeliverables(Number(jobId))
        .then((res) => {
          const delivs = Array.isArray(res) ? res : (res?.items || []);
          if (delivs.length > 0) {
            const latest = delivs[0];
            setApiDeliverable(latest);
            if (latest.externalUrl) setUrl((prevUrl) => prevUrl || latest.externalUrl);
            if (latest.note) setNote((prevNote) => prevNote || latest.note);
            if (latest.feedbacks?.length) {
              setApiFeedbacks(latest.feedbacks.map((f) => ({
                version: latest.version,
                text: f.content || f.feedbackText || '',
                at: f.createdAt ? new Date(f.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
                author: f.authorName || 'Nhà tuyển dụng',
              })));
            }
          }
        })
        .catch(() => {});
    }
  }, [jobId]);

  const prev = job?.deliverable || apiDeliverable || {};
  const [mode, setMode] = useState(prev.mode || (prev.externalUrl ? 'link' : 'file'));
  const [url, setUrl] = useState(prev.url || prev.externalUrl || '');
  const [note, setNote] = useState(prev.note || '');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!job) return null;
  const isUpdate = ['submitted', 'revision_requested'].includes(job.status) && !!(prev.url || prev.fileName || prev.externalUrl);
  const allFeedbacks = job.deliverableFeedback?.length ? job.deliverableFeedback : apiFeedbacks;
  const lastFeedback = job.status === 'revision_requested' && allFeedbacks.length
    ? allFeedbacks[allFeedbacks.length - 1] : null;

  const submit = async () => {
    setErrorMsg('');
    if (mode === 'link') {
      if (!url.trim()) {
        setErrorMsg('Vui lòng nhập đường dẫn sản phẩm.');
        return;
      }
      setIsSubmitting(true);
      try {
        if (typeof jobId === 'number' && jobId > 0) {
          const formData = new FormData();
          formData.append('externalUrl', url.trim());
          if (note) formData.append('note', note.trim());
          await submitJobDeliverable(jobId, formData);
        }
        submitDeliverable({ jobId, mode: 'link', url: url.trim(), note });
        if (typeof refreshMyApplications === 'function') {
          refreshMyApplications();
        }
        onSubmitted?.();
        onClose();
      } catch (err) {
        setErrorMsg(err?.message || 'Không thể gửi bàn giao.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!file) {
      setErrorMsg('Vui lòng chọn file sản phẩm để tải lên.');
      return;
    }

    const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'dll', 'vbs', 'msi', 'com', 'scr', 'ps1'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (blockedExts.includes(ext)) {
      setErrorMsg('Định dạng file thực thi có rủi ro bảo mật và không được phép tải lên.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Dung lượng file vượt quá giới hạn cho phép (tối đa 25MB).');
      return;
    }

    setIsSubmitting(true);
    try {
      let r2Result = null;
      if (typeof jobId === 'number' && jobId > 0) {
        const formData = new FormData();
        formData.append('file', file);
        if (note) formData.append('note', note.trim());
        r2Result = await submitJobDeliverable(jobId, formData);
      }

      if (file.type.startsWith('image/')) {
        try {
          const { previewDataUrl, finalDataUrl } = await watermarkImageFile(file);
          submitDeliverable({
            jobId,
            mode: 'file',
            fileName: file.name,
            fileSize: file.size,
            previewDataUrl,
            finalDataUrl: r2Result?.previewFileUrl || finalDataUrl,
            note
          });
        } catch {
          submitDeliverable({
            jobId,
            mode: 'file',
            fileName: file.name,
            fileSize: file.size,
            finalDataUrl: r2Result?.previewFileUrl,
            note
          });
        }
      } else {
        submitDeliverable({
          jobId,
          mode: 'file',
          fileName: file.name,
          fileSize: file.size,
          finalDataUrl: r2Result?.previewFileUrl,
          note
        });
      }
      if (typeof refreshMyApplications === 'function') {
        refreshMyApplications();
      }
      onSubmitted?.();
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Không thể tải lên file bàn giao.');
    } finally {
      setIsSubmitting(false);
    }
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
            <input type="radio" checked={mode === 'file'} onChange={() => setMode('file')} /> 📁 Tải file lên Cloudflare R2
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <input type="radio" checked={mode === 'link'} onChange={() => setMode('link')} /> 🔗 Dán link ngoài
          </label>
        </div>
      </div>
      {mode === 'file' ? (
        <div className="upload-zone" style={{ border: '2px dashed var(--primary, #5b4cf5)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
          <div className="uz-ic" style={{ fontSize: 32, marginBottom: 6 }}>📁</div>
          <b>Kéo thả hoặc bấm để chọn file sản phẩm</b>
          <p style={{ fontSize: 12, color: 'var(--muted, #666)', margin: '4px 0 0' }}>Hỗ trợ mọi định dạng (Tối đa 25MB). File được lưu trực tiếp lên Cloudflare R2.</p>
          {file && <div style={{ fontSize: 13, marginTop: 8, color: 'var(--primary, #5b4cf5)', fontWeight: 600 }}>Đã chọn: {file.name} ({Math.round(file.size / 1024)} KB)</div>}
        </div>
      ) : (
        <div className="field">
          <label>Link sản phẩm (Drive, Behance, Figma, GitHub, web app...)</label>
          <input type="text" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      )}
      <div className="field" style={{ marginTop: 12 }}>
        <label>Ghi chú bàn giao</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mô tả những gì đã hoàn thành..." />
      </div>

      {errorMsg && <div style={{ color: 'var(--coral, #f43f5e)', fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>}

      <div className="modal-actions">
        <button className="btn btn-primary" onClick={submit} disabled={isSubmitting}>
          {isSubmitting ? 'Đang tải lên Cloudflare R2...' : (isUpdate ? 'Cập nhật bàn giao' : 'Gửi bàn giao')}
        </button>
        <button className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function RevisionModal({ onClose, jobId, deliverable: propDeliverable, job: propJob, onReviewed }) {
  const { state, requestRevision, reviewDeliverableAsync } = useStore();
  const localJob = state.myJobs.find((j) => j.id === jobId);
  const job = propJob || localJob || { id: jobId, title: 'Công việc', revisionCount: 0, revisionLimit: 2 };
  const deliverable = propDeliverable || job?.deliverable;
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!job) return null;

  const submit = async () => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (typeof jobId === 'number' && deliverable?.id) {
        if (typeof reviewDeliverableAsync === 'function') {
          await reviewDeliverableAsync(jobId, deliverable.id, {
            status: 'revision_requested',
            feedbackComment: text.trim()
          });
        }
      } else {
        requestRevision({ jobId, text: text.trim() });
      }
      onReviewed?.();
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Không thể gửi yêu cầu chỉnh sửa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>✏️ Yêu cầu sửa bàn giao</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        Cho <b>{job.hiredApplicant || 'sinh viên'}</b> biết cần chỉnh sửa gì. Lượt {(job.revisionCount || 0) + 1}/{job.revisionLimit || 2}.
      </p>
      <div className="field">
        <label>Nội dung cần sửa</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="VD: Đổi màu chủ đạo sang xanh dương, thêm logo công ty ở góc trên..." />
      </div>
      {errorMsg && <div style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>}
      <div className="modal-actions">
        <button className="btn btn-primary" style={{ background: 'var(--coral)' }} onClick={submit} disabled={isSubmitting}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu sửa'}
        </button>
        <button className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Quay lại</button>
      </div>
    </ModalShell>
  );
}

export function DeliverableReviewModal({ onClose, jobId, deliverable: propDeliverable, job: propJob, onReviewed }) {
  const { state, markJobComplete, reviewDeliverableAsync } = useStore();
  const { openModal } = useModal();
  const localJob = state.myJobs.find((j) => j.id === jobId);
  const job = propJob || localJob;
  const deliverable = propDeliverable || job?.deliverable;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!job || !deliverable) return null;
  const limitReached = (job.revisionCount || 0) >= (job.revisionLimit || 2);

  const handleAccept = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (typeof jobId === 'number' && deliverable?.id) {
        if (typeof reviewDeliverableAsync === 'function') {
          await reviewDeliverableAsync(jobId, deliverable.id, {
            status: 'accepted'
          });
        }
      } else {
        markJobComplete(job.id);
      }
      onReviewed?.();
      onClose();
      openModal('receipt', { justCompletedId: job.id });
    } catch (err) {
      setErrorMsg(err?.message || 'Không thể nghiệm thu công việc.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>📥 Bàn giao từ {job.hiredApplicant || 'sinh viên'} — phiên bản {deliverable.version || 1}</h3>
      <p><b>{job.title}</b></p>
      <DeliverablePreview d={deliverable} revealFinal={false} />
      <div className="checkout-summary" style={{ marginTop: 8 }}>
        <div className="cs-row"><span>Ghi chú</span><span>{deliverable.note || '—'}</span></div>
        <div className="cs-row"><span>Nộp lúc</span><span>{deliverable.submittedAt || 'Vừa xong'}</span></div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10 }}>
        Xác nhận để giải ngân {fmtVND(job.escrowAmount || job.budget)} cho sinh viên, hoặc yêu cầu sửa lại nếu sản phẩm chưa đạt.
      </p>
      {errorMsg && <div style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>}
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={handleAccept} disabled={isSubmitting}>
          {isSubmitting ? 'Đang giải ngân...' : '✓ Xác nhận & Giải ngân'}
        </button>
        <button className="btn btn-outline" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} disabled={limitReached || isSubmitting}
          onClick={() => { onClose(); openModal('revision', { jobId: job.id, deliverable, job, onReviewed }); }}>
          ✏️ Yêu cầu sửa
        </button>
        <button className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Để sau</button>
      </div>
    </ModalShell>
  );
}
