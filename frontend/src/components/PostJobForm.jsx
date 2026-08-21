import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useStore, fmtVND } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';

const CATS = [
    'Video Editing',
    'Graphic Design',
    'Content Marketing',
    'Data Entry',
    'Programming',
    'Translation',
    'Tutoring',
    'Photography',
];

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📕';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return '🎬';
    return '📄';
}

export default function PostJobForm({ onDone, onCancelEdit }) {
    const { state, submitJobForm, clearEditJob } = useStore();
    const { showToast } = useToast();
    const fileInputRef = useRef(null);

    const editingJob = state.editingJobId ? state.myJobs.find((j) => j.id === state.editingJobId) : null;

    const [title, setTitle] = useState('');
    const [cat, setCat] = useState(CATS[0]);
    const [budget, setBudget] = useState('');
    const [desc, setDesc] = useState('');
    const [urgent, setUrgent] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (editingJob) {
            setTitle(editingJob.title || '');
            setCat(editingJob.cat || CATS[0]);
            setBudget(String(editingJob.budget || ''));
            setDesc(editingJob.desc || '');
            setUrgent(!!editingJob.urgent);
            setAttachments(editingJob.attachments || []);
        }
    }, [editingJob]);

    const triZeroLeft = Math.max(0, 3 - state.triZeroUsed);

    const handleFiles = (fileList) => {
        const newFiles = Array.from(fileList).map((f) => ({
            id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: f.name,
            size: f.size,
            type: f.type,
        }));
        setAttachments((prev) => [...prev, ...newFiles]);
        showToast(`Đã thêm ${newFiles.length} tài liệu đính kèm.`, '📎');
    };

    const handleFileChange = (e) => {
        if (e.target.files?.length) {
            handleFiles(e.target.files);
            e.target.value = '';
        }
    };

    const handleRemoveFile = (fileId) => {
        setAttachments((prev) => prev.filter((f) => f.id !== fileId));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        if (!title.trim() || !desc.trim() || !budget) {
            showToast('Vui lòng điền đầy đủ tiêu đề, ngân sách và mô tả.', '⚠️');
            return;
        }
        submitJobForm({
            title: title.trim(),
            cat,
            budget: Number(budget),
            desc: desc.trim(),
            urgent,
            attachments,
            editingId: editingJob?.id || null,
        });
        showToast(editingJob ? 'Đã cập nhật tin tuyển dụng!' : 'Đã đăng tin tuyển dụng thành công!', '✓');
        onDone?.();
    };

    const cancelEdit = () => {
        clearEditJob();
        (onCancelEdit || onDone)?.();
    };

    return (
        <div className="post-grid">
            <form className="post-form-card" onSubmit={submit}>
                <h2>{editingJob ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng mới'}</h2>
                <div className="sub">
                    {editingJob
                        ? 'Cập nhật thông tin — các thay đổi sẽ tự động hiển thị ngay cho ứng viên.'
                        : (triZeroLeft > 0
                            ? `Còn ${triZeroLeft}/3 lượt đăng tin miễn phí hoa hồng nền tảng theo chính sách Triple-Zero.`
                            : 'Đã dùng hết lượt Triple-Zero — phí nền tảng tiêu chuẩn sẽ được áp dụng khi hoàn thành công việc.')}
                </div>

                <div className="field">
                    <label>Tiêu đề công việc <span style={{ color: 'var(--coral)' }}>*</span></label>
                    <input
                        type="text"
                        placeholder="Ví dụ: Dựng video TikTok quảng cáo trà sữa 30s"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div className="field-row">
                    <div className="field">
                        <label>Danh mục ngành nghề</label>
                        <select value={cat} onChange={(e) => setCat(e.target.value)}>
                            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label>Ngân sách chi trả (VND) <span style={{ color: 'var(--coral)' }}>*</span></label>
                        <input
                            type="number"
                            min="50000"
                            step="10000"
                            placeholder="250000"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="field">
                    <label>Mô tả chi tiết & Yêu cầu công việc <span style={{ color: 'var(--coral)' }}>*</span></label>
                    <textarea
                        placeholder="Mô tả cụ thể mục tiêu, định dạng bàn giao, yêu cầu kỹ năng, thời hạn hoàn thành..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        rows={5}
                        required
                    />
                </div>

                {/* Upload Zone for Job Brief & Attachments */}
                <div className="field">
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📎 Tài liệu đính kèm (Brief, ảnh mẫu, file đề bài)</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 400 }}>Tùy chọn</span>
                    </label>

                    <div
                        className="upload-zone"
                        style={{
                            cursor: 'pointer',
                            border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border)',
                            background: isDragging ? 'rgba(108, 76, 255, 0.08)' : 'var(--surface)',
                            borderRadius: 12,
                            padding: '20px 16px',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.png,.jpg,.jpeg,.mp4"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <div className="uz-ic" style={{ fontSize: 28, marginBottom: 4 }}>📤</div>
                        <b style={{ display: 'block', fontSize: 14 }}>Bấm để tải lên hoặc kéo thả file vào đây</b>
                        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                            Hỗ trợ PDF, Word, Excel, ZIP, Ảnh minh họa, Footage mẫu (Tối đa 50MB/file)
                        </span>
                    </div>

                    {attachments.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                                Đã đính kèm ({attachments.length} file):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {attachments.map((f) => (
                                    <span
                                        key={f.id}
                                        className="chip"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '5px 10px',
                                            fontSize: 12.5,
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                        }}
                                    >
                                        <span>{getFileIcon(f.name)}</span>
                                        <b>{f.name}</b>
                                        <span style={{ color: 'var(--ink-soft)', fontSize: 11 }}>({formatFileSize(f.size)})</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveFile(f.id);
                                            }}
                                            style={{
                                                marginLeft: 4,
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--coral)',
                                                fontWeight: 'bold',
                                                padding: '0 2px',
                                            }}
                                            title="Xóa file này"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="check-row" style={{ marginTop: 8 }}>
                    <input type="checkbox" id="pjUrgent" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
                    <label htmlFor="pjUrgent">
                        ⚡ Đánh dấu là công việc cần tuyển gấp (Ưu tiên hiển thị Featured Listing, +20.000đ)
                    </label>
                </div>

                <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary btn-block">
                        {editingJob ? 'Lưu thay đổi' : 'Đăng tin ngay'}
                    </button>
                    {editingJob && (
                        <button type="button" className="btn btn-outline" onClick={cancelEdit}>
                            Hủy
                        </button>
                    )}
                </div>
            </form>

            {/* Live Preview Card */}
            <div>
                <div className="preview-label" style={{ fontWeight: 600, marginBottom: 10, color: 'var(--ink-soft)' }}>
                    👁 Xem trước thẻ tin đăng
                </div>

                <div className="job-card" style={{ cursor: 'default' }}>
                    <div className="jc-top">
                        <div className="jc-emp">
                            <div className="jc-av" style={{ background: 'linear-gradient(135deg,var(--primary),var(--coral))' }} />
                            <div>
                                <b>Doanh nghiệp của bạn <Icon name="check" style={{ width: 12, height: 12, display: 'inline' }} /></b>
                                <span>TP.HCM · Đã xác thực</span>
                            </div>
                        </div>
                        {urgent && <span className="chip chip-coral">Gấp</span>}
                    </div>

                    <h3>{title || 'Tiêu đề công việc sẽ hiển thị ở đây'}</h3>

                    <div className="jc-tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="chip">{cat}</span>
                        {attachments.length > 0 && (
                            <span className="chip chip-lime" style={{ fontSize: 11 }}>
                                📎 {attachments.length} file đính kèm
                            </span>
                        )}
                    </div>

                    <div className="jc-foot">
                        <span className="jc-price">{budget ? fmtVND(Number(budget)) : '—'}</span>
                        <span className="jc-time">Vừa đăng</span>
                    </div>
                </div>

                <div className="pcard" style={{ marginTop: 16 }}>
                    <h4>Lợi ích khi đăng tin trên SkillBridge</h4>
                    <ul className="price-feat" style={{ marginBottom: 0 }}>
                        <li><Icon name="check" /> Ghép ứng viên phù hợp chỉ trong 15 phút</li>
                        <li><Icon name="check" /> 100% sinh viên đã xác thực email trường đại học</li>
                        <li><Icon name="check" /> Ký quỹ an toàn Escrow — chỉ thanh toán khi hài lòng</li>
                        <li><Icon name="check" /> Quản lý file brief & sản phẩm bàn giao tập trung</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}