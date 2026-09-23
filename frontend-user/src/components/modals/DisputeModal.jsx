import { useState, useRef } from 'react';
import ModalShell from './ModalShell';
import Icon from '../Icon';
import { fmtVND } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { createDispute } from '../../api/disputeApi';

const DEFAULT_REASONS = [
  'Đối tác không phản hồi quá 48 giờ',
  'Yêu cầu sửa đổi vượt quá thỏa thuận ban đầu',
  'Sản phẩm bàn giao không đúng yêu cầu kỹ thuật',
  'Nhà tuyển dụng từ chối nghiệm thu không có lý do chính đáng',
  'Sinh viên không hoàn thành đúng tiến độ cam kết',
  'Lý do khác'
];

export default function DisputeModal({ job, deliverableId, onClose, onSuccess }) {
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState(DEFAULT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(f => f.size <= 25 * 1024 * 1024);
    if (validFiles.length < newFiles.length) {
      toast.warning?.('Một số tệp vượt quá 25MB đã được loại bỏ.') || alert('Một số tệp vượt quá 25MB.');
    }
    setFiles(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Lý do khác' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      toast.error?.('Vui lòng chọn hoặc nhập lý do khiếu nại.') || alert('Vui lòng nhập lý do khiếu nại.');
      return;
    }
    if (finalReason.length < 10) {
      toast.error?.('Lý do khiếu nại cần chi tiết tối thiểu 10 ký tự.') || alert('Lý do tối thiểu 10 ký tự.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('jobId', job.id);
      formData.append('reason', finalReason);
      formData.append('origin', 'manual');
      if (deliverableId) formData.append('deliverableId', deliverableId);

      files.forEach((f) => {
        formData.append('files', f);
      });

      const res = await createDispute(formData);
      toast.success?.('Đã tạo hồ sơ khiếu nại thành công. Vụ việc đã được chuyển đến Ban Trọng tài.') || alert('Tạo khiếu nại thành công.');
      onSuccess?.(res);
      onClose();
    } catch (err) {
      const errMsg = err?.message || 'Không thể tạo khiếu nại. Vui lòng thử lại sau.';
      toast.error?.(errMsg) || alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose} wide>
      <div style={{ padding: '4px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            ⚖️
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Mở Khiếu Nại & Trọng Tài Tranh Chấp
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
              Công việc: <strong>{job.title}</strong> · Số tiền ký quỹ Escrow: <strong>{fmtVND(job.escrowAmount || job.budget)}</strong>
            </p>
          </div>
        </div>

        {/* Regulatory Banner */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          color: 'var(--ink)'
        }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>ℹ️</span>
          <div>
            <strong>Quy định Trọng tài SkillBridge:</strong> Sau khi mở khiếu nại, tiền ký quỹ Escrow sẽ tiếp tục được khóa an toàn. Cả hai bên có <strong>72 giờ (3 ngày)</strong> để nộp bổ sung chứng cứ trước khi Trọng tài viên xem xét và ra quyết định phân xử chính thức.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Reason selection */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--ink)' }}>
              Lý do khiếu nại <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DEFAULT_REASONS.map((r) => (
                <label
                  key={r}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: selectedReason === r ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedReason === r ? 'rgba(79, 70, 229, 0.04)' : 'var(--surface)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="disputeReason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                  />
                  <span style={{ color: 'var(--ink)', fontWeight: selectedReason === r ? 600 : 400 }}>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom detail textarea */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--ink)' }}>
              Mô tả chi tiết sự việc <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={4}
              required
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Vui lòng nêu rõ các mốc thời gian, thỏa thuận ban đầu và các điểm mâu thuẫn cần Trọng tài viên phân xử..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Evidence File Upload (Drag & Drop) */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--ink)' }}>
              Đính kèm bằng chứng (Ảnh chụp màn hình, biên bản, tài liệu liên quan)
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragActive ? '2px dashed var(--primary)' : '2px dashed var(--border)',
                borderRadius: '10px',
                padding: '24px 16px',
                textAlign: 'center',
                background: dragActive ? 'rgba(79, 70, 229, 0.05)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) handleFileChange(e.target.files);
                }}
              />
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
                Kéo thả tệp vào đây hoặc <span style={{ color: 'var(--primary)' }}>chọn từ máy tính</span>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                Hỗ trợ PNG, JPG, PDF, ZIP, DOCX (Tối đa 5 tệp, tối đa 25MB/tệp)
              </p>
            </div>

            {/* Selected files list */}
            {files.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--surface-2)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span>📄</span>
                      <span style={{ color: 'var(--ink)', fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {file.name}
                      </span>
                      <span style={{ color: 'var(--ink-soft)', fontSize: '0.75rem' }}>
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Xóa tệp"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px' }} />
                  Đang gửi hồ sơ...
                </>
              ) : (
                <>
                  <span>⚖️</span>
                  Xác nhận mở khiếu nại
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
