import { useState, useEffect } from 'react';
import ModalShell from './ModalShell';
import Icon from '../Icon';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { submitJobDeliverable, getJobDeliverables } from '../../api/deliverableApi';
import { getAccessToken } from '../../api/tokenStore';
import { downloadDeliverableFile } from '../../utils/fileDownloader';
import { SecureDocumentViewer } from '../SecureDocViewer';

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
        if (fallbackSrc?.startsWith('data:')) {
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
      } catch {
        if (isMounted) {
          if (fallbackSrc?.startsWith('data:')) {
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
      <div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Đang tải...</span>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className="empty-state" style={{ padding: '20px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <b style={{ fontSize: 13, color: 'var(--ink)' }}>{alt || 'Hình ảnh bàn giao'}</b>
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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    let blobUrl = null;

    async function loadVideo() {
      if (!jobId || !deliverableId) {
        if (fallbackSrc?.startsWith('data:')) {
          setVideoSrc(fallbackSrc);
        }
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(false);
        setErrorMessage('');
        const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";
        const type = isFinal ? 'final' : 'preview';
        const url = `${API_URL}/jobs/${jobId}/deliverables/${deliverableId}/download?type=${type}`;
        const token = getAccessToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(url, { headers, credentials: 'include' });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || `Lỗi máy chủ (${res.status}): Không thể tải video.`);
        }
        const blob = await res.blob();
        
        // Đảm bảo MIME type cho browser HTML5 video player decode được (đặc biệt là .mov container)
        let finalBlob = blob;
        if (!blob.type || blob.type === 'video/quicktime' || blob.type === 'application/octet-stream') {
          finalBlob = new Blob([blob], { type: 'video/mp4' });
        }

        blobUrl = URL.createObjectURL(finalBlob);
        if (isMounted) {
          setVideoSrc(blobUrl);
          setError(false);
        }
      } catch (err) {
        if (isMounted) {
          if (fallbackSrc?.startsWith('data:')) {
            setVideoSrc(fallbackSrc);
          } else {
            setError(true);
            setErrorMessage(err.message || 'Không thể tải video xem trước.');
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
        <span style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="hourglass" width="15" height="15" /> Đang tải video xem trước (vui lòng chờ trong giây lát)...
        </span>
      </div>
    );
  }

  if (error || !videoSrc) {
    return (
      <div className="empty-state" style={{ padding: '20px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(108, 76, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', margin: '0 auto 8px' }}>
          <Icon name="video" width="22" height="22" />
        </div>
        <b style={{ fontSize: 13, color: 'var(--ink)' }}>{alt || 'Video sản phẩm bàn giao'}</b>
        <p style={{ fontSize: 12, color: 'var(--coral, #e11d48)', margin: '6px 0 0' }}>{errorMessage || 'Không thể hiển thị video xem trước.'}</p>
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

      {/* Lớp phủ chữ ký bản quyền đè trong video (Copyright Watermark Overlay - tinh giản, chữ bé mờ nhẹ để kiểm tra chất lượng rõ nét) */}
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
            zIndex: 3,
            userSelect: 'none'
          }}
        >
          {/* Dòng chữ ký bản quyền chéo thanh mảnh, chữ bé và mờ nhẹ để không che tầm nhìn khi kiểm tra chất lượng */}
          <div
            style={{
              transform: 'rotate(-20deg)',
              color: 'rgba(255, 255, 255, 0.22)',
              fontSize: 'clamp(10px, 1.5vw, 12.5px)',
              fontWeight: 500,
              letterSpacing: '1.2px',
              textShadow: '0 0 2px rgba(0,0,0,0.7)',
              textAlign: 'center',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            SKILLBRIDGE · BẢN XEM TRƯỚC · CHƯA THANH TOÁN
          </div>

          {/* Huy hiệu bản quyền nhỏ gọn ở góc dưới bên phải */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 10,
              background: 'rgba(0, 0, 0, 0.45)',
              borderRadius: 4,
              padding: '2px 7px',
              color: 'rgba(255, 255, 255, 0.55)',
              fontSize: 9.5,
              fontWeight: 500,
              letterSpacing: '0.4px',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            © SkillBridge Protected
          </div>
        </div>
      )}
    </div>
  );
}

function formatDeliverableDisplayName(fileName, isImage = false, version = 1, jobId = null) {
  if (!fileName) return isImage ? `Hình ảnh sản phẩm (v${version || 1})` : `Tệp sản phẩm (v${version || 1})`;
  const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
  const cleanExt = ext ? `.${ext}` : '';
  if (jobId) {
    return `SkillBridge_Job${jobId}_v${version || 1}${cleanExt}`;
  }
  if (fileName.toLowerCase().startsWith('skillbridge_job')) {
    return fileName;
  }
  return `SkillBridge_BanGiao_v${version || 1}${cleanExt}`;
}

function DeliverablePreview({ d, revealFinal }) {
  if (!d) return null;
  if (!d.previewFileUrl && !d.finalFileUrl && !d.externalUrl) {
    return (
      <div style={{ padding: '8px 12px', background: 'rgba(148, 163, 184, 0.08)', borderRadius: 6, textAlign: 'center', margin: '8px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Bản nháp v{d.version} (Đã lưu trữ)
        </span>
      </div>
    );
  }
  if (d.mode === 'link' || (!d.previewFileUrl && d.externalUrl) || d.fileType === 'url') {
    const url = d.url || d.externalUrl || d.previewFileUrl;
    return (
      <div style={{ margin: '8px 0' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Liên kết sản phẩm: </span>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>{url}</a>
      </div>
    );
  }

  const isVideo =
    (d.fileType && ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv', 'wmv', 'flv', 'video'].includes(d.fileType.toLowerCase())) ||
    (d.fileName && /\.(mp4|mov|m4v|webm|avi|mkv|wmv|flv)$/i.test(d.fileName));

  if (isVideo) {
    return (
      <>
        <div style={{ margin: '8px 0', textAlign: 'center' }}>
          <DeliverableVideo
            jobId={d.jobId}
            deliverableId={d.id}
            fallbackSrc={revealFinal ? (d.finalDataUrl || d.finalFileUrl || d.previewFileUrl) : (d.previewDataUrl || d.previewFileUrl)}
            alt="Video bàn giao"
            isFinal={revealFinal}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          {revealFinal ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
              style={{ fontWeight: 600 }}
            >
              Tải video hoàn thiện
            </button>
          ) : d.canDownloadPreview && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'preview')}
              style={{ fontSize: 12.5 }}
            >
              Tải video xem trước
            </button>
          )}
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
    return (
      <>
        <div style={{ margin: '8px 0' }}>
          <DeliverableImage
            jobId={d.jobId}
            deliverableId={d.id}
            fallbackSrc={revealFinal ? (d.finalDataUrl || d.finalFileUrl || d.previewFileUrl) : (d.previewDataUrl || d.previewFileUrl)}
            alt="Hình ảnh bàn giao"
            isFinal={revealFinal}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          {revealFinal ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
              style={{ fontWeight: 600 }}
            >
              Tải ảnh gốc
            </button>
          ) : d.canDownloadPreview && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'preview')}
              style={{ fontSize: 12.5 }}
            >
              Tải ảnh xem trước
            </button>
          )}
        </div>
      </>
    );
  }

  const docViewer = SecureDocumentViewer({ d, revealFinal });
  if (docViewer) {
    return (
      <div style={{ margin: '10px 0' }}>
        {docViewer}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          {revealFinal ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
              style={{ fontWeight: 600 }}
            >
              Tải tệp hoàn thiện
            </button>
          ) : d.canDownloadPreview && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'preview')}
              style={{ fontSize: 12 }}
            >
              Tải bản xem trước
            </button>
          )}
        </div>
      </div>
    );
  }

  const cleanDisplayName = formatDeliverableDisplayName(d.fileName, false, d.version);

  return (
    <div
      className="empty-state"
      style={{
        textAlign: 'left',
        background: 'var(--surface)',
        borderRadius: 10,
        padding: '14px 16px',
        margin: '10px 0',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <b style={{ fontSize: 14, color: 'var(--ink)', display: 'block', wordBreak: 'break-all' }}>
          {cleanDisplayName}
        </b>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {d.fileSize ? `${Math.round(d.fileSize / 1024)} KB · ` : ''}
          {revealFinal ? 'Bản hoàn thiện' : 'Bản nộp'}
        </span>
      </div>

      <div>
        {revealFinal ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'final')}
          >
            Tải tệp hoàn thiện
          </button>
        ) : d.canDownloadPreview ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => downloadDeliverableFile(d.jobId, d.id, d.fileName, 'preview')}
          >
            Tải bản xem trước
          </button>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', padding: '4px 8px', background: 'rgba(0,0,0,0.04)', borderRadius: 4 }}>
            Mở tải sau khi nghiệm thu
          </span>
        )}
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
  const isOverdue = job?.deadlineAt && (new Date(job.deadlineAt).getTime() <= Date.now());
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

    if (isOverdue) {
      setErrorMsg('Công việc đã quá hạn bàn giao (Deadline). Vui lòng liên hệ Nhà tuyển dụng để được gia hạn thời gian.');
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

    const allowedExtensions = [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'json', 'xml', 'rtf',
      'zip', 'rar', '7z', 'tar', 'gz', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'psd', 'ai', 'fig', 'xd', 'sketch', 'eps',
      'mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv', 'wmv', 'flv',
      'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'
    ];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      setErrorMsg('Định dạng file không được hỗ trợ. Vui lòng tải lên tài liệu (PDF, Word, Excel, PowerPoint), file nén (ZIP, RAR), video, âm thanh, hình ảnh hoặc file thiết kế.');
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
      <h3>{isUpdate ? 'Cập nhật' : 'Nộp'} sản phẩm bàn giao</h3>
      <p>Gửi sản phẩm cho "<b>{job.title}</b>" để nhà tuyển dụng xác nhận.</p>
      {isOverdue && (
        <div style={{
          background: '#fee2e2',
          border: '1.5px solid #fca5a5',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 14,
          fontSize: 13,
          color: '#991b1b',
          lineHeight: 1.5
        }}>
          <b>Công việc đã quá hạn bàn giao</b>
          <div style={{ marginTop: 4 }}>
            Vui lòng liên hệ với Nhà tuyển dụng để được gia hạn thời gian trước khi nộp bài.
          </div>
        </div>
      )}
      {lastFeedback && (
        <div className="empty-state" style={{ textAlign: 'left', background: 'var(--surface)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <b style={{ fontSize: 12.5, color: 'var(--coral)' }}>Yêu cầu chỉnh sửa:</b>
          <p style={{ marginTop: 4, fontSize: 13 }}>{lastFeedback.text}</p>
        </div>
      )}
      <div className="field">
        <label>Phương thức nộp</label>
        <div style={{ display: 'flex', gap: 16, margin: '4px 0 10px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <input type="radio" checked={mode === 'file'} onChange={() => setMode('file')} /> Tải file lên
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <input type="radio" checked={mode === 'link'} onChange={() => setMode('link')} /> Đường dẫn liên kết
          </label>
        </div>
      </div>
      {mode === 'file' ? (
        <div className="upload-zone" style={{ border: '2px dashed var(--primary, #5b4cf5)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.xml,.rtf,.zip,.rar,.7z,.tar,.gz,.png,.jpg,.jpeg,.webp,.gif,.svg,.psd,.ai,.fig,.xd,.sketch,.eps,.mp4,.mov,.m4v,.webm,.avi,.mkv,.wmv,.flv,.mp3,.wav,.m4a,.aac,.flac,.ogg"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
          <b>Kéo thả hoặc bấm để chọn file sản phẩm</b>
          <p style={{ fontSize: 12, color: 'var(--muted, #666)', margin: '4px 0 0' }}>Tài liệu, file nén, hình ảnh, video (Tối đa 25MB).</p>
          {file && <div style={{ fontSize: 13, marginTop: 8, color: 'var(--primary, #5b4cf5)', fontWeight: 600 }}>Đã chọn: {file.name} ({Math.round(file.size / 1024)} KB)</div>}
        </div>
      ) : (
        <div className="field">
          <label>Link sản phẩm (Drive, Figma, GitHub...)</label>
          <input type="text" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      )}
      <div className="field" style={{ marginTop: 12 }}>
        <label>Ghi chú bàn giao</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mô tả nội dung đã hoàn thành..." />
      </div>

      {errorMsg && <div style={{ color: 'var(--coral, #f43f5e)', fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>}

      {isSubmitting && file && (
        <div style={{ margin: '10px 0 14px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 8, border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: 12.5, color: 'var(--ink)' }}>
          Đang tải tệp lên, vui lòng chờ...
        </div>
      )}

      <div className="modal-actions">
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={isSubmitting || isOverdue}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            opacity: isOverdue ? 0.6 : 1,
            cursor: isOverdue ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? (
            <>
              <span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              <span>Đang tải {file ? `(${(file.size / (1024 * 1024)).toFixed(1)} MB)...` : '...'}</span>
            </>
          ) : isOverdue ? (
            'Đã quá hạn bàn giao'
          ) : (
            isUpdate ? 'Cập nhật bàn giao' : 'Gửi bàn giao'
          )}
        </button>
        <button className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Đóng</button>
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
      setErrorMsg('Không tìm thấy thông tin bản bàn giao hợp lệ để gửi yêu cầu sửa đổi.');
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
      <h3>Yêu cầu chỉnh sửa sản phẩm</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        Gửi yêu cầu chỉnh sửa cho <b>{job.hiredApplicant || 'sinh viên'}</b> (Lượt {(job.revisionCount || 0) + 1}/{job.revisionLimit || 2}).
      </p>
      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
          Đang tải dữ liệu...
        </div>
      ) : !deliverable ? (
        <div style={{ padding: '16px 0', color: 'var(--coral)', fontSize: 13 }}>
          Không tìm thấy bản bàn giao tương ứng để yêu cầu chỉnh sửa.
        </div>
      ) : (
        <div className="field">
          <label>Nội dung cần chỉnh sửa</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Chi tiết các điểm cần chỉnh sửa hoặc bổ sung..." />
        </div>
      )}
      {errorMsg && <div style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>}
      <div className="modal-actions">
        <button className="btn btn-primary" style={{ background: 'var(--coral)' }} onClick={submit} disabled={isSubmitting || loading || !deliverable}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
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
      setErrorMsg('Không tìm thấy thông tin bản bàn giao hợp lệ để nghiệm thu.');
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
          Đang tải dữ liệu...
        </div>
      ) : !deliverable ? (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
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
          <h3>Sản phẩm bàn giao (v{deliverable.version || 1})</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{job.title}</p>
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
            Xác nhận nghiệm thu để thanh toán {fmtVND(job.escrowAmount || job.budget)} cho sinh viên, hoặc gửi yêu cầu chỉnh sửa.
          </p>
          {errorMsg && <div style={{ color: 'var(--coral)', fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>}
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={handleAccept} disabled={isSubmitting}>
              {isSubmitting ? 'Đang xử lý...' : 'Nghiệm thu & Giải ngân'}
            </button>
            <button className="btn btn-outline" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} disabled={limitReached || isSubmitting}
              onClick={() => { onClose(); openModal('revision', { jobId: job.id || numericJobId, deliverable, job, onReviewed }); }}>
              Yêu cầu chỉnh sửa
            </button>
            <button className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Để sau</button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
