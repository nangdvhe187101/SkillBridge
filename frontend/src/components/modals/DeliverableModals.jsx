import { useState, useEffect } from 'react';
import ModalShell from './ModalShell';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { submitJobDeliverable, getJobDeliverables } from '../../api/deliverableApi';
import { getAccessToken } from '../../api/tokenStore';
import { downloadDeliverableFile } from '../../utils/fileDownloader';
import { SecureDocumentViewer } from '../SecureDocViewer';

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

function DeliverableImage({ jobId, deliverableId, fallbackSrc, alt, isFinal }) {
  const [imageSrc, setImageSrc] = useState(fallbackSrc?.startsWith('data:') ? fallbackSrc : null);
  const [loading, setLoading] = useState(!fallbackSrc?.startsWith('data:'));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (fallbackSrc?.startsWith('data:')) {
      setImageSrc(fallbackSrc);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let blobUrl = null;

    async function loadImage() {
      if (!jobId || !deliverableId) {
        if (fallbackSrc && !fallbackSrc.startsWith('job-deliverables')) {
          setImageSrc(fallbackSrc);
        }
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";
        const type = isFinal ? 'final' : 'preview';
        const url = `${API_URL}/jobs/${jobId}/deliverables/${deliverableId}/download?type=${type}`;
        const token = getAccessToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(url, { headers, credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load image');
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setImageSrc(blobUrl);
          setError(false);
        }
      } catch (err) {
        if (isMounted) {
          if (fallbackSrc && !fallbackSrc.startsWith('job-deliverables')) {
            setImageSrc(fallbackSrc);
          } else {
            setError(true);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadImage();

    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [jobId, deliverableId, isFinal, fallbackSrc]);

  if (loading) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px dashed var(--border)' }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>⏳ Đang tải bản xem trước có watermark...</span>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className="empty-state" style={{ padding: '20px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>🖼️</div>
        <b style={{ fontSize: 13, color: 'var(--ink)' }}>{alt || 'Hình ảnh bàn giao'}</b>
        <p style={{ fontSize: 11.5, color: 'var(--muted, #666)', margin: '4px 0 0' }}>Bản xem trước có watermark được bảo vệ an toàn trên hệ thống.</p>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        maxWidth: '100%',
        maxHeight: 380,
        objectFit: 'contain',
        borderRadius: 10,
        border: '1px solid var(--border)',
        display: 'block',
        margin: '0 auto',
        userSelect: 'none'
      }}
    />
  );
}

function DeliverableVideo({ jobId, deliverableId, fallbackSrc, alt, isFinal }) {
  const [videoSrc, setVideoSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let blobUrl = null;

    async function loadVideo() {
      if (!jobId || !deliverableId) {
        if (fallbackSrc && !fallbackSrc.startsWith('job-deliverables')) {
          setVideoSrc(fallbackSrc);
        }
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";
        const type = isFinal ? 'final' : 'preview';
        const url = `${API_URL}/jobs/${jobId}/deliverables/${deliverableId}/download?type=${type}`;
        const token = getAccessToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(url, { headers, credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load video');
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setVideoSrc(blobUrl);
          setError(false);
        }
      } catch (err) {
        if (isMounted) {
          if (fallbackSrc && !fallbackSrc.startsWith('job-deliverables')) {
            setVideoSrc(fallbackSrc);
          } else {
            setError(true);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVideo();

    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [jobId, deliverableId, isFinal, fallbackSrc]);

  if (loading) {
    return (
      <div style={{ padding: '28px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px dashed var(--border)' }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>⏳ Đang nạp video xem trước...</span>
      </div>
    );
  }

  if (error || !videoSrc) {
    return (
      <div className="empty-state" style={{ padding: '20px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🎥</div>
        <b style={{ fontSize: 13, color: 'var(--ink)' }}>{alt || 'Video sản phẩm bàn giao'}</b>
        <p style={{ fontSize: 11.5, color: 'var(--muted, #666)', margin: '4px 0 0' }}>Video được bảo vệ an toàn trên hệ thống.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        maxWidth: '100%',
        width: 'fit-content',
        maxHeight: 440,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#0a0a0a',
        margin: '0 auto',
        boxShadow: '0 4px 18px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <video
        src={videoSrc}
        controls
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        style={{
          maxWidth: '100%',
          maxHeight: 420,
          display: 'block',
          objectFit: 'contain'
        }}
      >
        Trình duyệt của bạn không hỗ trợ phát định dạng video này.
      </video>

      {/* Watermark Overlay chống quay chụp & bảo vệ bản quyền */}
      {!isFinal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            zIndex: 2
          }}
        >
          {/* Dòng chữ chéo thanh mảnh, trong suốt xuyên thấu */}
          <div
            style={{
              transform: 'rotate(-22deg)',
              color: 'rgba(255, 255, 255, 0.22)',
              fontSize: 'clamp(11px, 2.6vw, 15px)',
              fontWeight: 600,
              letterSpacing: '1.5px',
              textShadow: '0 0 2px rgba(0,0,0,0.6)',
              textAlign: 'center',
              userSelect: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            SKILLBRIDGE · BẢN XEM TRƯỚC · CHƯA NGHIỆM THU
          </div>
          {/* Huy hiệu bản quyền nhỏ ở góc dưới */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 12,
              color: 'rgba(255, 255, 255, 0.35)',
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: '0.5px',
              textShadow: '0 0 2px rgba(0,0,0,0.8)'
            }}
          >
            © SkillBridge Protected
          </div>
        </div>
      )}
    </div>
  );
}

function getFileIcon(fileName) {
  const ext = (fileName || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return '📦';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
    case 'csv':
      return '📊';
    case 'pdf':
      return '📑';
    case 'ppt':
    case 'pptx':
      return '📊';
    case 'js':
    case 'ts':
    case 'py':
    case 'java':
    case 'cpp':
    case 'html':
    case 'css':
    case 'json':
      return '💻';
    case 'mp4':
    case 'mov':
    case 'm4v':
    case 'webm':
    case 'avi':
    case 'mkv':
    case 'wmv':
    case 'flv':
      return '🎥';
    case 'mp3':
    case 'wav':
    case 'm4a':
    case 'aac':
    case 'flac':
    case 'ogg':
      return '🎵';
    default:
      return '📁';
  }
}

function formatDeliverableDisplayName(fileName, isImage = false, version = 1) {
  if (!fileName) return isImage ? 'Hình ảnh sản phẩm' : 'Tệp sản phẩm bàn giao';
  if (isImage || fileName.length > 25 || /^[a-z0-9_]{20,}\.[a-z0-9]+$/i.test(fileName)) {
    return isImage ? `Hình ảnh sản phẩm (v${version || 1})` : `Tệp sản phẩm bàn giao (v${version || 1})`;
  }
  return fileName;
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

  const isVideo =
    (d.fileType && ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv', 'wmv', 'flv', 'video'].includes(d.fileType.toLowerCase())) ||
    (d.fileName && /\.(mp4|mov|m4v|webm|avi|mkv|wmv|flv)$/i.test(d.fileName));

  if (isVideo) {
    return revealFinal ? (
      <>
        <div style={{ margin: '8px 0', textAlign: 'center' }}>
          <DeliverableVideo
            jobId={d.jobId}
            deliverableId={d.id}
            fallbackSrc={d.finalDataUrl || d.finalFileUrl || d.previewFileUrl}
            alt="Bản gốc video bàn giao"
            isFinal={true}
          />
        </div>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            ⬇️ Tải video gốc hoàn thiện
          </button>
        </div>
      </>
    ) : (
      <>
        <div style={{ margin: '8px 0', textAlign: 'center' }}>
          <DeliverableVideo
            jobId={d.jobId}
            deliverableId={d.id}
            fallbackSrc={d.previewDataUrl || d.previewFileUrl}
            alt="Video xem trước có watermark"
            isFinal={false}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            🔒 Video sản phẩm bàn giao (Bản xem trước có watermark)
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'preview')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
          >
            ⬇️ Tải video xem trước
          </button>
        </div>
      </>
    );
  }

  const isImage =
    (d.fileType && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'image'].includes(d.fileType.toLowerCase())) ||
    (d.fileName && /\.(png|jpg|jpeg|webp|gif)$/i.test(d.fileName)) ||
    (d.previewDataUrl && d.previewDataUrl.startsWith('data:image')) ||
    (d.previewFileUrl && /\.(png|jpg|jpeg|webp|gif)$/i.test(d.previewFileUrl));

  if (isImage) {
    return revealFinal ? (
      <>
        <div style={{ margin: '8px 0' }}>
          <DeliverableImage
            jobId={d.jobId}
            deliverableId={d.id}
            fallbackSrc={d.finalDataUrl || d.finalFileUrl || d.previewFileUrl}
            alt="Bản gốc bàn giao"
            isFinal={true}
          />
        </div>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            ⬇️ Tải ảnh gốc hoàn thiện
          </button>
        </div>
      </>
    ) : (
      <>
        <div style={{ margin: '8px 0' }}>
          <DeliverableImage
            jobId={d.jobId}
            deliverableId={d.id}
            fallbackSrc={d.previewDataUrl || d.previewFileUrl}
            alt="Xem trước có watermark"
            isFinal={false}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            🔒 Hình ảnh sản phẩm (Bản xem trước có watermark)
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'preview')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
          >
            ⬇️ Tải ảnh xem trước
          </button>
        </div>
      </>
    );
  }

  const docViewer = SecureDocumentViewer({ d, revealFinal });
  if (docViewer) {
    return (
      <div style={{ margin: '10px 0' }}>
        {docViewer}
        {revealFinal && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              ⬇️ Tải tệp gốc hoàn thiện
            </button>
          </div>
        )}
      </div>
    );
  }

  const fileIcon = getFileIcon(d.fileName);
  const downloadType = revealFinal ? 'final' : 'preview';
  const cleanDisplayName = formatDeliverableDisplayName(d.fileName, false, d.version);

  return (
    <div
      className="empty-state"
      style={{
        textAlign: 'left',
        background: 'var(--surface)',
        borderRadius: 12,
        padding: '16px',
        margin: '10px 0',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 32 }}>{fileIcon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 14, color: 'var(--ink)', display: 'block', wordBreak: 'break-all' }}>
            {cleanDisplayName}
          </b>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            {d.fileSize ? `${Math.round(d.fileSize / 1024)} KB · ` : ''}
            {revealFinal ? 'Bản gốc hoàn thiện đã giải ngân' : 'Bản nộp xem trước (Đã khóa định danh & lưu vết)'}
          </span>
        </div>
      </div>

      {/* Escrow & Copyright Guarantee Badge */}
      <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.18)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 16, lineHeight: 1.2 }}>🛡️</span>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
          <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: 2 }}>Bảo hộ bản quyền & Ký quỹ Escrow SkillBridge:</strong>
          {revealFinal ? (
            <span>Tệp sản phẩm đã hoàn tất nghiệm thu và chính thức bàn giao quyền sở hữu cho Nhà tuyển dụng.</span>
          ) : (
            <span>Tệp đã được ghi nhận dấu thời gian (Timestamp) lưu vết trên hệ thống. Bản gốc hoàn thiện sẽ được chính thức bàn giao sau khi bạn nhấn nghiệm thu.</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
          {revealFinal ? '✅ Bản gốc hoàn thiện đã sẵn sàng' : '💡 Tải về để xem trước nội dung & kiểm tra chất lượng'}
        </span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, downloadType)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          ⬇️ {revealFinal ? 'Tải bản gốc hoàn thiện' : 'Tải file về kiểm tra'}
        </button>
      </div>
    </div>
  );
}
export { DeliverablePreview };

export function DeliverableModal({ onClose, jobId, job: propJob, onSubmitted }) {
  const { state, refreshMyApplications } = useStore();
  const numericJobId = Number(jobId);
  const localJob = state.myJobs.find((j) => Number(j.id) === numericJobId) ||
                   state.myApplications.find((a) => Number(a.jobId) === numericJobId || Number(a.id) === numericJobId);
  const job = propJob || localJob || { id: jobId, title: 'Công việc', status: 'in_progress' };
  const [apiDeliverable, setApiDeliverable] = useState(null);
  const [apiFeedbacks, setApiFeedbacks] = useState([]);

  useEffect(() => {
    if (numericJobId && !isNaN(numericJobId) && (!job?.deliverableFeedback?.length || !job?.deliverable)) {
      getJobDeliverables(numericJobId)
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
  }, [numericJobId]);

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
    if (!numericJobId || isNaN(numericJobId)) {
      setErrorMsg('Mã công việc không hợp lệ.');
      return;
    }

    if (mode === 'link') {
      if (!url.trim()) {
        setErrorMsg('Vui lòng nhập đường dẫn sản phẩm.');
        return;
      }
      setIsSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('externalUrl', url.trim());
        if (note) formData.append('note', note.trim());
        const result = await submitJobDeliverable(numericJobId, formData);
        if (typeof refreshMyApplications === 'function') {
          await refreshMyApplications();
        }
        onSubmitted?.(result);
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
      const formData = new FormData();
      formData.append('file', file);
      if (note) formData.append('note', note.trim());
      const r2Result = await submitJobDeliverable(numericJobId, formData);

      if (typeof refreshMyApplications === 'function') {
        await refreshMyApplications();
      }
      onSubmitted?.(r2Result);
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
            <input type="radio" checked={mode === 'file'} onChange={() => setMode('file')} /> 📁 Tải file trực tiếp
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
          <p style={{ fontSize: 12, color: 'var(--muted, #666)', margin: '4px 0 0' }}>Hỗ trợ mọi định dạng (Tối đa 25MB). File được mã hóa và bảo mật an toàn.</p>
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
          {isSubmitting ? 'Đang tải file lên...' : (isUpdate ? 'Cập nhật bàn giao' : 'Gửi bàn giao')}
        </button>
        <button className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function RevisionModal({ onClose, jobId, deliverable: propDeliverable, job: propJob, onReviewed }) {
  const { state, reviewDeliverableAsync } = useStore();
  const numericJobId = Number(jobId);
  const localJob = state.myJobs.find((j) => Number(j.id) === numericJobId);
  const job = propJob || localJob || { id: jobId, title: 'Công việc', revisionCount: 0, revisionLimit: 2 };
  const [deliverable, setDeliverable] = useState(propDeliverable || job?.deliverable || null);
  const [loading, setLoading] = useState(!propDeliverable?.id && !job?.deliverable?.id && !!numericJobId);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (numericJobId && !deliverable?.id) {
      setLoading(true);
      getJobDeliverables(numericJobId)
        .then((res) => {
          const delivs = Array.isArray(res) ? res : (res?.items || []);
          if (delivs.length > 0) {
            setDeliverable(delivs[0]);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi tải thông tin sản phẩm bàn giao:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [numericJobId]);

  if (!job) return null;

  const submit = async () => {
    if (!text.trim()) {
      setErrorMsg('Vui lòng nhập nội dung cần chỉnh sửa.');
      return;
    }
    const targetDeliverableId = deliverable?.id;
    if (!numericJobId || !targetDeliverableId) {
      setErrorMsg('Không tìm thấy thông tin bản bàn giao hợp lệ trên máy chủ để gửi yêu cầu sửa đổi.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (typeof reviewDeliverableAsync === 'function') {
        await reviewDeliverableAsync(numericJobId, targetDeliverableId, {
          status: 'revision_requested',
          feedbackComment: text.trim()
        });
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
      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
          Đang tải dữ liệu bàn giao...
        </div>
      ) : !deliverable ? (
        <div style={{ padding: '16px 0', color: 'var(--coral)', fontSize: 13 }}>
          ⚠️ Không tìm thấy bản bàn giao tương ứng để yêu cầu chỉnh sửa.
        </div>
      ) : (
        <div className="field">
          <label>Nội dung cần sửa</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="VD: Đổi màu chủ đạo sang xanh dương, thêm logo công ty ở góc trên..." />
        </div>
      )}
      {errorMsg && <div style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>}
      <div className="modal-actions">
        <button className="btn btn-primary" style={{ background: 'var(--coral)' }} onClick={submit} disabled={isSubmitting || loading || !deliverable}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu sửa'}
        </button>
        <button className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Quay lại</button>
      </div>
    </ModalShell>
  );
}

export function DeliverableReviewModal({ onClose, jobId, deliverable: propDeliverable, job: propJob, onReviewed }) {
  const { state, reviewDeliverableAsync } = useStore();
  const { openModal } = useModal();
  const numericJobId = Number(jobId);
  const localJob = state.myJobs.find((j) => Number(j.id) === numericJobId);
  const job = propJob || localJob;
  const [deliverable, setDeliverable] = useState(propDeliverable || job?.deliverable || null);
  const [loading, setLoading] = useState(!propDeliverable?.id && !job?.deliverable?.id && !!numericJobId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (numericJobId && !deliverable?.id) {
      setLoading(true);
      getJobDeliverables(numericJobId)
        .then((res) => {
          const delivs = Array.isArray(res) ? res : (res?.items || []);
          if (delivs.length > 0) {
            setDeliverable(delivs[0]);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi tải thông tin sản phẩm bàn giao:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [numericJobId]);

  if (!job) return null;
  const limitReached = (job.revisionCount || 0) >= (job.revisionLimit || 2);

  const handleAccept = async () => {
    const targetDeliverableId = deliverable?.id;
    if (!numericJobId || !targetDeliverableId) {
      setErrorMsg('Không tìm thấy thông tin bản bàn giao hợp lệ trên máy chủ để nghiệm thu.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (typeof reviewDeliverableAsync === 'function') {
        await reviewDeliverableAsync(numericJobId, targetDeliverableId, {
          status: 'accepted'
        });
      }
      onReviewed?.();
      onClose();
      openModal('receipt', { justCompletedId: job.id || numericJobId });
    } catch (err) {
      setErrorMsg(err?.message || 'Không thể nghiệm thu công việc.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      {loading ? (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
          Đang tải dữ liệu bàn giao từ máy chủ...
        </div>
      ) : !deliverable ? (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <b>Chưa tìm thấy sản phẩm bàn giao</b>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
            Không tìm thấy bản bàn giao nào của sinh viên trong hệ thống cho công việc này.
          </p>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-outline" onClick={onClose}>Đóng</button>
          </div>
        </div>
      ) : (
        <>
          <h3>📥 Bàn giao từ {job.hiredApplicant || 'sinh viên'} — phiên bản {deliverable.version || 1}</h3>
          <p><b>{job.title}</b></p>
          <DeliverablePreview d={deliverable} revealFinal={false} />
          <div className="checkout-summary" style={{ marginTop: 8 }}>
            <div className="cs-row"><span>Ghi chú</span><span>{deliverable.note || '—'}</span></div>
            <div className="cs-row">
              <span>Nộp lúc</span>
              <span>
                {deliverable.submittedAt
                  ? (new Date(deliverable.submittedAt).toString() !== 'Invalid Date'
                      ? new Date(deliverable.submittedAt).toLocaleString('vi-VN')
                      : deliverable.submittedAt)
                  : 'Vừa xong'}
              </span>
            </div>
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
              onClick={() => { onClose(); openModal('revision', { jobId: job.id || numericJobId, deliverable, job, onReviewed }); }}>
              ✏️ Yêu cầu sửa
            </button>
            <button className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Để sau</button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
