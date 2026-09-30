import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useStore, fmtVND } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { getJobById, uploadJobAttachment, deleteJobAttachment } from '../api/jobApi';
import { downloadJobAttachment } from '../utils/fileDownloader';

const DEFAULT_CATS = [
    { id: 1, name: 'Thiết kế đồ hoạ' },
    { id: 2, name: 'Viết nội dung' },
    { id: 3, name: 'Lập trình web' },
    { id: 4, name: 'Dựng video' },
    { id: 5, name: 'Dịch thuật' },
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
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'file-text';
    if (['doc', 'docx'].includes(ext)) return 'file-text';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'chart-bar';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    return 'file-text';
}

export default function PostJobForm({ onDone, onCancelEdit }) {
    const { state, createJobPost, updateJobPost, clearEditJob, refreshJobs, refreshMyJobs, refreshWallet } = useStore();
    const { showToast } = useToast();
    const { openModal } = useModal();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const categoriesList = state.categories && state.categories.length > 0 ? state.categories : DEFAULT_CATS;

    const editingJob = state.editingJobId ? state.myJobs.find((j) => j.id === state.editingJobId) : null;
    const isEditing = Boolean(state.editingJobId || editingJob);

    // Tính toán hạn mức tin tuyển dụng mở đồng thời theo gói dịch vụ
    const openJobs = (state.myJobs || []).filter((j) => j.status === 'open' && (!editingJob || j.id !== editingJob.id));
    const openJobsCount = openJobs.length;

    const planCode = state.activePlanCode || (state.vipBusiness ? 'EMP_VIP' : 'FREE');
    let maxActiveJobs = 1;
    let planName = 'Gói Cơ bản (Miễn phí)';
    if (planCode === 'EMP_VIP' || state.vipBusiness) {
        maxActiveJobs = Infinity;
        planName = 'Gói Doanh nghiệp VIP';
    } else if (planCode === 'EMP_GROWTH' || planCode?.includes('GROWTH')) {
        maxActiveJobs = 15;
        planName = 'Gói Tăng trưởng (Growth)';
    } else if (planCode === 'EMP_STARTER' || planCode?.includes('STARTER')) {
        maxActiveJobs = 5;
        planName = 'Gói Khởi động (Starter)';
    }

    const isLimitReached = !isEditing && maxActiveJobs !== Infinity && openJobsCount >= maxActiveJobs;
    const walletBalance = Number(state.balance || 0);
    const hasEnoughWalletForUrgent = walletBalance >= 20000;
    const urgentShortfall = Math.max(0, 20000 - walletBalance);

    const [title, setTitle] = useState('');
    const [categoryId, setCategoryId] = useState(categoriesList[0]?.id || 1);
    const [budget, setBudget] = useState('');
    const [desc, setDesc] = useState('');
    const [urgent, setUrgent] = useState(false);
    const [location, setLocation] = useState('TP.HCM');
    const [durationDays, setDurationDays] = useState(3);
    const [durationHours, setDurationHours] = useState(0);
    const [requirementsText, setRequirementsText] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (categoriesList.length > 0 && !categoryId) {
            setCategoryId(categoriesList[0].id);
        }
    }, [categoriesList]);

    useEffect(() => {
        if (state.editingJobId) {
            getJobById(state.editingJobId)
                .then((detail) => {
                    if (!detail) return;
                    setTitle(detail.title || '');
                    setCategoryId(detail.categoryId || 1);
                    setBudget(String(detail.budget || ''));
                    setDesc(detail.description || '');
                    setUrgent(!!detail.isUrgent);
                    setLocation(detail.location || 'TP.HCM');
                    if (detail.deadlineAt) {
                        const diffMs = new Date(detail.deadlineAt).getTime() - new Date(detail.postedAt || Date.now()).getTime();
                        if (diffMs > 0) {
                            const totalHours = Math.max(1, Math.round(diffMs / 3600000));
                            const d = Math.floor(totalHours / 24);
                            const h = totalHours % 24;
                            setDurationDays(d);
                            setDurationHours(h);
                        }
                    }
                    if (detail.requirements && Array.isArray(detail.requirements)) {
                        setRequirementsText(detail.requirements.map((r) => (typeof r === 'string' ? r : r.requirementText || '')).join('\n'));
                    }
                    const atts = (detail.attachments || []).map((a) => ({
                        id: a.id,
                        name: a.fileName,
                        size: a.fileSize,
                        type: a.fileType,
                        fileUrl: a.fileUrl,
                        isExisting: true,
                    }));
                    setAttachments(atts);
                })
                .catch((err) => {
                    console.error('Lỗi khi tải chi tiết tin để sửa:', err);
                    if (editingJob) {
                        setTitle(editingJob.title || '');
                        setBudget(String(editingJob.budget || ''));
                        setDesc(editingJob.desc || '');
                        setAttachments(editingJob.attachments || []);
                    }
                });
        } else {
            // Khi không ở chế độ sửa tin, làm sạch form để đăng tin mới
            setTitle('');
            setCategoryId(categoriesList[0]?.id || 1);
            setBudget('');
            setDesc('');
            setUrgent(false);
            setLocation('TP.HCM');
            setDurationDays(3);
            setDurationHours(0);
            setRequirementsText('');
            setAttachments([]);
        }
    }, [state.editingJobId, categoriesList]);

    const triZeroLeft = Math.max(0, 3 - state.triZeroUsed);

    const handleFiles = (fileList) => {
        const newFiles = Array.from(fileList).map((f) => ({
            id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: f.name,
            size: f.size,
            type: f.type,
            fileObject: f,
            isExisting: false,
        }));
        setAttachments((prev) => [...prev, ...newFiles]);
        showToast(`Đã thêm ${newFiles.length} tài liệu đính kèm mới.`, 'check');
    };

    const handleFileChange = (e) => {
        if (e.target.files?.length) {
            handleFiles(e.target.files);
            e.target.value = '';
        }
    };

    const handleRemoveFile = async (fileId) => {
        const fileToRemove = attachments.find((f) => f.id === fileId);
        const jobId = state.editingJobId || editingJob?.id;

        if (jobId && (typeof fileId === 'number' || fileToRemove?.isExisting)) {
            try {
                await deleteJobAttachment(jobId, fileId);
                showToast(`Đã xóa vĩnh viễn tệp "${fileToRemove?.name || 'tài liệu'}" khỏi tin tuyển dụng.`, 'trash');
            } catch (e) {
                console.error('Lỗi xóa attachment trên server:', e);
                showToast('Không thể xóa tệp trên server, vui lòng thử lại.', 'alert-triangle');
                return;
            }
        } else {
            showToast('Đã bỏ chọn tệp đính kèm.', 'trash');
        }

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

    const submit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !desc.trim() || !budget) {
            showToast('Vui lòng điền đầy đủ tiêu đề, ngân sách và mô tả.', 'alert-triangle');
            return;
        }

        const numBudget = Math.round(Number(budget));
        if (isNaN(numBudget) || numBudget <= 0) {
            showToast('Ngân sách phải là số nguyên dương (VNĐ).', 'alert-triangle');
            return;
        }

        // Kiểm tra hạn mức đăng tin của NTD trước khi submit
        if (isLimitReached && !urgent) {
            showToast(`Bạn hiện có ${openJobsCount}/${maxActiveJobs} tin đang mở (đạt hạn mức ${planName}). Vui lòng chọn 'Đăng tin tuyển gấp (+20.000đ)' hoặc đóng bớt tin cũ để đăng thêm.`, 'alert-triangle');
            return;
        }

        if (urgent && !hasEnoughWalletForUrgent) {
            showToast(`Đăng tin tuyển gấp (+20.000đ) yêu cầu số dư ví tối thiểu 20.000đ (Hiện có: ${fmtVND(walletBalance)}). Vui lòng nạp thêm tiền vào ví.`, 'alert-triangle');
            openModal?.('topup', { initialAmount: Math.max(urgentShortfall, 50000), autoCreate: true });
            return;
        }

        const reqList = requirementsText
            .split('\n')
            .map(r => r.trim())
            .filter(Boolean);

        const currentCategory = categoriesList.find(c => c.id === Number(categoryId)) || categoriesList[0];

        const totalDurationHours = (Math.max(0, Number(durationDays) || 0) * 24) + Math.max(0, Number(durationHours) || 0);
        let calculatedDeadlineAt = null;
        if (totalDurationHours > 0) {
            calculatedDeadlineAt = new Date(Date.now() + totalDurationHours * 3600000).toISOString();
        }

        const jobPayload = {
            title: title.trim(),
            description: desc.trim(),
            categoryId: Number(categoryId) || currentCategory.id,
            location: location.trim(),
            budget: numBudget,
            isUrgent: urgent,
            deadlineAt: calculatedDeadlineAt,
            requirements: reqList.length > 0 ? reqList : ['Hoàn thành đúng tiến độ cam kết', 'Bàn giao sản phẩm chất lượng'],
        };

        setIsSubmitting(true);
        try {
            let savedJobResult = null;
            if (editingJob) {
                if (typeof updateJobPost === 'function') {
                    savedJobResult = await updateJobPost(editingJob.id, jobPayload);
                }
            } else {
                if (typeof createJobPost === 'function') {
                    savedJobResult = await createJobPost(jobPayload);
                }
            }

            const targetJobId = editingJob?.id || savedJobResult?.id;

            // Upload pending file attachments to R2
            const pendingFiles = attachments.filter((f) => f.fileObject);
            if (targetJobId && pendingFiles.length > 0) {
                for (const f of pendingFiles) {
                    try {
                        await uploadJobAttachment(targetJobId, f.fileObject);
                    } catch (uploadErr) {
                        console.error('Lỗi khi tải lên file đính kèm:', uploadErr);
                    }
                }
                // Refresh lại danh sách để có đầy đủ file vừa đính kèm từ backend
                await Promise.allSettled([refreshJobs?.(), refreshMyJobs?.(), refreshWallet?.()]);
            } else {
                await Promise.allSettled([refreshJobs?.(), refreshMyJobs?.(), refreshWallet?.()]);
            }

            showToast(urgent && !editingJob ? 'Đăng tin tuyển gấp thành công! (-20.000đ phí ghim nổi bật)' : (editingJob ? 'Lưu thay đổi thành công!' : 'Đăng tin tuyển dụng thành công!'), 'success');
            clearEditJob();
            onDone?.();
        } catch (err) {
            showToast(err.message || 'Không thể lưu tin tuyển dụng, vui lòng thử lại.', 'alert-triangle');
        } finally {
            setIsSubmitting(false);
        }
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

                {/* Banner cảnh báo Hạn mức đăng tin tuyển dụng */}
                {isLimitReached ? (
                    <div style={{
                        marginTop: 14,
                        marginBottom: 18,
                        padding: '16px 18px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(234, 88, 12, 0.06) 100%)',
                        border: '1.5px solid rgba(245, 158, 11, 0.45)',
                        borderRadius: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#d97706',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Icon name="alert-triangle" style={{ width: 20, height: 20 }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                    <b style={{ color: '#b45309', fontSize: 14 }}>Thông báo: Đã đạt hạn mức tin mở đồng thời</b>
                                    <span className="chip chip-coral" style={{ fontSize: 11, padding: '2px 8px' }}>
                                        {openJobsCount} / {maxActiveJobs} tin đang mở ({planName})
                                    </span>
                                </div>
                                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                                    Theo quy định của <b>{planName}</b>, bạn chỉ có thể mở tối đa <b>{maxActiveJobs} tin tuyển dụng miễn phí</b> cùng một lúc. Để đăng tin này ngay lập tức, bạn có thể chọn một trong các phương án sau:
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                                    {/* Option 1: Urgent posting */}
                                    <div style={{
                                        padding: '12px 14px',
                                        borderRadius: 10,
                                        border: urgent ? '2px solid #f59e0b' : '1px solid var(--border)',
                                        background: urgent ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <b style={{ fontSize: 13, color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Icon name="zap" style={{ width: 14, height: 14 }} />
                                                Đăng tin Tuyển gấp
                                            </b>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>+20.000đ</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                                            Vượt hạn mức ngay lập tức, ghim nổi bật tin lên đầu danh sách việc làm.
                                        </p>
                                        {!urgent ? (
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm"
                                                style={{ width: '100%', fontSize: 12, background: '#f59e0b', borderColor: '#f59e0b', marginTop: 'auto' }}
                                                onClick={() => setUrgent(true)}
                                            >
                                                Bật tuyển gấp (+20k)
                                            </button>
                                        ) : (
                                            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
                                                <span style={{ color: hasEnoughWalletForUrgent ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                                    Ví: {fmtVND(walletBalance)} {hasEnoughWalletForUrgent ? '✓ Đủ phí' : `(Thiếu ${fmtVND(urgentShortfall)})`}
                                                </span>
                                                {!hasEnoughWalletForUrgent && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-sm"
                                                        style={{ width: '100%', fontSize: 11.5, borderColor: '#f59e0b', color: '#d97706' }}
                                                        onClick={() => openModal?.('topup', { initialAmount: Math.max(urgentShortfall, 50000), autoCreate: true })}
                                                    >
                                                        Nạp thêm vào ví
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Option 2: Close old job */}
                                    <div style={{
                                        padding: '12px 14px',
                                        borderRadius: 10,
                                        border: '1px solid var(--border)',
                                        background: 'var(--surface)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                    }}>
                                        <b style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Icon name="file-text" style={{ width: 14, height: 14 }} />
                                            Đóng bớt tin tuyển cũ
                                        </b>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                                            Đóng các tin đã tuyển đủ ứng viên để giải phóng chỉ tiêu tin miễn phí.
                                        </p>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm"
                                            style={{ width: '100%', fontSize: 12, marginTop: 'auto' }}
                                            onClick={() => navigate('/employer/jobs')}
                                        >
                                            Quản lý tin đã đăng →
                                        </button>
                                    </div>

                                    {/* Option 3: Upgrade plan */}
                                    <div style={{
                                        padding: '12px 14px',
                                        borderRadius: 10,
                                        border: '1px solid var(--border)',
                                        background: 'var(--surface)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                    }}>
                                        <b style={{ fontSize: 13, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Icon name="crown" style={{ width: 14, height: 14 }} />
                                            Nâng cấp gói dịch vụ
                                        </b>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                                            Mở 5 tin (Starter), 15 tin (Growth) hoặc không giới hạn (VIP).
                                        </p>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm"
                                            style={{ width: '100%', fontSize: 12, marginTop: 'auto', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                                            onClick={() => navigate('/pricing')}
                                        >
                                            Xem bảng giá →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    !isEditing && maxActiveJobs !== Infinity && (
                        <div style={{
                            marginTop: 10,
                            marginBottom: 16,
                            padding: '8px 14px',
                            borderRadius: 8,
                            background: 'rgba(22, 163, 74, 0.08)',
                            border: '1px solid rgba(22, 163, 74, 0.25)',
                            fontSize: 12.5,
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8
                        }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <Icon name="check" style={{ width: 14, height: 14 }} />
                                <span>Hạn mức tin mở đồng thời: <b>{openJobsCount}/{maxActiveJobs}</b> tin ({planName}).</span>
                            </span>
                            <span style={{ fontWeight: 600 }}>Còn {maxActiveJobs - openJobsCount} tin miễn phí</span>
                        </div>
                    )
                )}

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
                        <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
                            {categoriesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label>Địa điểm / Hình thức</label>
                        <input
                            type="text"
                            placeholder="Ví dụ: TP.HCM / Remote"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </div>
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

                {/* Thời gian hoàn thành dự kiến */}
                <div className="field">
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="clock" style={{ width: 15, height: 15, color: 'var(--primary)' }} />
                            <span>Thời hạn hoàn thành công việc <span style={{ color: 'var(--coral)' }}>*</span></span>
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                            {durationDays > 0 ? `${durationDays} ngày ` : ''}{durationHours > 0 ? `${durationHours} giờ` : (durationDays === 0 ? '0 giờ' : '')}
                        </span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="input-with-suffix">
                            <input
                                type="number"
                                min="0"
                                max="60"
                                placeholder="0"
                                value={durationDays}
                                onChange={(e) => setDurationDays(Math.max(0, Number(e.target.value)))}
                            />
                            <span className="suffix-label">
                                ngày
                            </span>
                        </div>
                        <div className="input-with-suffix">
                            <input
                                type="number"
                                min="0"
                                max="23"
                                placeholder="0"
                                value={durationHours}
                                onChange={(e) => setDurationHours(Math.max(0, Math.min(23, Number(e.target.value))))}
                            />
                            <span className="suffix-label">
                                giờ
                            </span>
                        </div>
                    </div>
                    {/* Presets */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', alignSelf: 'center', marginRight: 4 }}>Chọn nhanh:</span>
                        {[
                            { label: '12 giờ', d: 0, h: 12, urgent: true },
                            { label: '24 giờ (1 ngày)', d: 1, h: 0, urgent: true },
                            { label: '2 ngày', d: 2, h: 0 },
                            { label: '3 ngày', d: 3, h: 0 },
                            { label: '5 ngày', d: 5, h: 0 },
                            { label: '7 ngày', d: 7, h: 0 },
                        ].map((preset, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{
                                    fontSize: 11.5,
                                    padding: '2px 8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: durationDays === preset.d && durationHours === preset.h ? 'rgba(108, 76, 255, 0.12)' : 'transparent',
                                    borderColor: durationDays === preset.d && durationHours === preset.h ? 'var(--primary)' : 'var(--border)',
                                    color: durationDays === preset.d && durationHours === preset.h ? 'var(--primary)' : 'var(--ink)',
                                }}
                                onClick={() => {
                                    setDurationDays(preset.d);
                                    setDurationHours(preset.h);
                                }}
                            >
                                {preset.urgent && <Icon name="zap" style={{ width: 12, height: 12, color: '#f59e0b' }} />}
                                {!preset.urgent && <Icon name="clock" style={{ width: 12, height: 12, opacity: 0.7 }} />}
                                <span>{preset.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="field">
                    <label>Mô tả chi tiết công việc <span style={{ color: 'var(--coral)' }}>*</span></label>
                    <textarea
                        placeholder="Mô tả cụ thể mục tiêu dự án, kết quả mong đợi..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        rows={4}
                        required
                    />
                </div>

                <div className="field">
                    <label>Yêu cầu công việc (Mỗi dòng là một tiêu chí)</label>
                    <textarea
                        placeholder="Ví dụ:&#10;Có kỹ năng sử dụng Figma&#10;Đúng hẹn deadline&#10;Giao tiếp tốt"
                        value={requirementsText}
                        onChange={(e) => setRequirementsText(e.target.value)}
                        rows={3}
                    />
                </div>

                {/* Upload Zone for Job Brief & Attachments */}
                <div className="field">
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="paperclip" style={{ width: 14, height: 14, color: 'var(--primary)' }} />
                            <span>Tài liệu đính kèm (Brief, ảnh mẫu, file đề bài)</span>
                        </span>
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
                        <div className="uz-ic" style={{ marginBottom: 6, color: 'var(--primary)' }}>
                            <Icon name="download" style={{ width: 28, height: 28, transform: 'rotate(180deg)' }} />
                        </div>
                        <b style={{ display: 'block', fontSize: 14 }}>Bấm để tải lên hoặc kéo thả file vào đây</b>
                        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                            Hỗ trợ PDF, Word, Excel, ZIP, Ảnh minh họa, Footage mẫu (Tối đa 50MB/file)
                        </span>
                    </div>

                    {attachments.length > 0 && (
                        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                                Danh sách tài liệu đính kèm ({attachments.length} file):
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {attachments.map((f) => (
                                    <div
                                        key={f.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 10,
                                            gap: 12,
                                            flexWrap: 'wrap',
                                            boxSizing: 'border-box',
                                            maxWidth: '100%',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 200px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(108, 76, 255, 0.08)', color: 'var(--primary)', flexShrink: 0 }}>
                                                <Icon name={getFileIcon(f.name)} style={{ width: 18, height: 18 }} />
                                            </span>
                                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                <b style={{ fontSize: 13, display: 'block', color: 'var(--ink)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={f.name}>{f.name}</b>
                                                <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                                                    {formatFileSize(f.size)} · {f.isExisting ? 'Tệp đính kèm' : 'Tệp mới thêm'}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
                                            {f.isExisting && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline btn-sm"
                                                    style={{ fontSize: 11.5, padding: '4px 10px', whiteSpace: 'nowrap' }}
                                                    onClick={() => downloadJobAttachment(f, title, state.editingJobId)}
                                                >
                                                    Tải file
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--coral)', borderColor: 'var(--coral)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFile(f.id);
                                                }}
                                                title="Xóa tài liệu này"
                                            >
                                                <Icon name="trash" style={{ width: 13, height: 13 }} />
                                                <span>Xóa file</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="check-row" style={{ marginTop: 8 }}>
                    <input type="checkbox" id="pjUrgent" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
                    <label htmlFor="pjUrgent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="zap" style={{ width: 15, height: 15, color: '#f59e0b' }} />
                        <span>Đánh dấu là công việc cần tuyển gấp (Ưu tiên hiển thị Featured Listing, +20.000đ)</span>
                    </label>
                </div>

                {urgent && (
                    <div style={{
                        marginTop: 10,
                        padding: '12px 14px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 10,
                        fontSize: 12.5,
                        color: 'var(--ink)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#d97706' }}>
                                <Icon name="bolt" style={{ width: 14, height: 14 }} />
                                <span>Đặc quyền Tuyển gấp & Vượt hạn mức:</span>
                            </span>
                            <span style={{ fontWeight: 800, color: '#d97706', fontSize: 13 }}>-20.000đ</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                            Tin sẽ được gắn huy hiệu <b>[Gấp]</b>, ưu tiên lên đầu trang và <b>cho phép bạn đăng thêm tin ngay cả khi đã dùng hết hạn mức của gói</b>.
                            Phí dịch vụ 20.000đ sẽ được trừ trực tiếp từ Ví SkillBridge (Số dư hiện tại: <b style={{ color: 'var(--ink)' }}>{fmtVND(state.balance || 0)}</b>).
                        </p>
                    </div>
                )}

                <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                        {isSubmitting ? 'Đang xử lý...' : (editingJob ? 'Lưu thay đổi' : 'Đăng tin ngay')}
                    </button>
                    {editingJob && (
                        <button type="button" className="btn btn-outline" onClick={cancelEdit} disabled={isSubmitting}>
                            Hủy
                        </button>
                    )}
                </div>
            </form>

            {/* Live Preview Card */}
            <div>
                <div className="preview-label" style={{ fontWeight: 600, marginBottom: 10, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="eye" style={{ width: 16, height: 16 }} />
                    <span>Xem trước thẻ tin đăng</span>
                </div>

                <div className="job-card" style={{ cursor: 'default' }}>
                    <div className="jc-top">
                        <div className="jc-emp">
                            <div className="jc-av" style={{ background: 'linear-gradient(135deg,var(--primary),var(--coral))' }} />
                            <div>
                                <b>{state.currentUser?.fullName || 'Doanh nghiệp của bạn'} <Icon name="check" style={{ width: 12, height: 12, display: 'inline' }} /></b>
                                <span>{location || 'TP.HCM'} · Đã xác thực</span>
                            </div>
                        </div>
                        {urgent && <span className="chip chip-coral">Gấp</span>}
                    </div>

                    <h3>{title || 'Tiêu đề công việc sẽ hiển thị ở đây'}</h3>

                    <div className="jc-tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="chip">{categoriesList.find(c => c.id === categoryId)?.name || 'Danh mục'}</span>
                        {(durationDays > 0 || durationHours > 0) && (
                            <span className="chip" style={{ background: 'rgba(108, 76, 255, 0.1)', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icon name="clock" style={{ width: 12, height: 12 }} />
                                <span>{durationDays > 0 ? `${durationDays} ngày ` : ''}{durationHours > 0 ? `${durationHours} giờ` : ''}</span>
                            </span>
                        )}
                        {attachments.length > 0 && (
                            <span className="chip chip-lime" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icon name="paperclip" style={{ width: 12, height: 12 }} />
                                <span>{attachments.length} file đính kèm</span>
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