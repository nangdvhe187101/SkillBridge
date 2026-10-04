import { useState, useRef } from 'react';
import ModalShell from './ModalShell';
import Icon from '../Icon';
import { useToast } from '../../context/ToastContext';
import { useStore } from '../../context/StoreContext';
import { submitKyc } from '../../api/kycApi';

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR + i);

export default function KycModal({ onClose, onSubmitted, currentKycStatus: _currentKycStatus = null }) {
    const toastCtx = useToast();
    const store = useStore();
    const showToast = toastCtx?.showToast || store?.showToast;
    const currentUser = store?.state?.currentUser;
    const role = (currentUser?.roleCode || store?.state?.role || 'student').toLowerCase();
    const isEmployer = role === 'employer' || role === 'recruiter' || role === 'business';

    // Form states
    const [school, setSchool] = useState(currentUser?.school || '');
    const [studentId, setStudentId] = useState('');
    const [gradYear, setGradYear] = useState(CURRENT_YEAR + 2);
    const [companyName, setCompanyName] = useState(currentUser?.companyName || currentUser?.fullName || '');
    const [taxCode, setTaxCode] = useState('');

    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files || []);
        addFiles(selected);
    };

    const addFiles = (selectedFiles) => {
        setErrorMsg('');
        const validFiles = [];
        const newPreviews = [...previews];

        for (const file of selectedFiles) {
            if (files.length + validFiles.length >= 3) {
                setErrorMsg('Chỉ được chọn tối đa 3 ảnh/tệp giấy tờ.');
                break;
            }

            if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
                setErrorMsg(`Tệp "${file.name}" không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc PDF.`);
                continue;
            }

            if (file.size > 10 * 1024 * 1024) {
                setErrorMsg(`Tệp "${file.name}" quá lớn (> 10MB).`);
                continue;
            }

            validFiles.push(file);
            if (file.type.startsWith('image/')) {
                newPreviews.push({
                    name: file.name,
                    url: URL.createObjectURL(file),
                    size: (file.size / 1024).toFixed(0) + ' KB'
                });
            } else {
                newPreviews.push({
                    name: file.name,
                    url: null,
                    size: (file.size / 1024).toFixed(0) + ' KB',
                    isPdf: true
                });
            }
        }

        setFiles((prev) => [...prev, ...validFiles]);
        setPreviews(newPreviews);
    };

    const handleRemoveFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => {
            const item = prev[index];
            if (item?.url) URL.revokeObjectURL(item.url);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (files.length === 0) {
            setErrorMsg('Vui lòng tải lên ít nhất một ảnh Thẻ sinh viên hoặc Giấy tờ xác thực.');
            return;
        }

        if (!isEmployer) {
            if (!school.trim()) {
                setErrorMsg('Vui lòng nhập tên trường Đại học / Cao đẳng bạn đang theo học.');
                return;
            }
            if (!studentId.trim()) {
                setErrorMsg('Vui lòng nhập Mã số sinh viên (MSSV) in trên thẻ sinh viên.');
                return;
            }
        } else {
            if (!companyName.trim()) {
                setErrorMsg('Vui lòng nhập Tên pháp lý của doanh nghiệp.');
                return;
            }
        }

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('DocumentType', isEmployer ? 'business_license' : 'student_card');

            if (!isEmployer) {
                formData.append('School', school.trim());
                formData.append('StudentIdNumber', studentId.trim());
                formData.append('GraduationYear', gradYear);
            } else {
                formData.append('CompanyName', companyName.trim());
                formData.append('TaxCode', taxCode.trim());
            }

            for (const file of files) {
                formData.append('files', file);
            }

            await submitKyc(formData);
            showToast?.('Gửi hồ sơ xác minh thành công! Ban Quản trị sẽ xét duyệt trong vòng 24 giờ.', 'check');
            if (typeof onSubmitted === 'function') {
                onSubmitted();
            }
            onClose();
        } catch (err) {
            console.error('Lỗi khi nộp eKYC:', err);
            setErrorMsg(err.message || 'Không thể gửi hồ sơ, vui lòng kiểm tra lại kết nối mạng.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalShell onClose={onClose} maxWidth="600px">
            <div style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22
                    }}>
                        <Icon name="shield-check" style={{ width: 24, height: 24 }} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink, #0f172a)' }}>
                            {isEmployer ? 'Xác thực Pháp nhân Doanh nghiệp' : 'Xác thực eKYC Thẻ Sinh viên'}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft, #64748b)' }}>
                            {isEmployer
                                ? 'Nộp Giấy phép kinh doanh để nhận huy hiệu Doanh nghiệp uy tín'
                                : 'Chứng minh tư cách sinh viên để mở khóa nhận việc & tích lũy +15 điểm uy tín'}
                        </p>
                    </div>
                </div>

                {/* Thông báo lợi ích */}
                <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 16,
                    fontSize: 13,
                    color: '#065f46',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <Icon name="star" style={{ width: 16, height: 16, fill: '#059669', flexShrink: 0 }} />
                    <span>
                        Sau khi được duyệt, tài khoản được gắn <b>Huy hiệu Tick xanh</b>, tăng hạn mức rút tiền và được ưu tiên phân phối việc làm.
                    </span>
                </div>

                {errorMsg && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        padding: '10px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        marginBottom: 14
                    }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {!isEmployer ? (
                        <>
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                                    Trường Đại học / Cao đẳng <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Đại học FPT, ĐH Bách Khoa, ĐH Quốc Gia..."
                                    value={school}
                                    onChange={(e) => setSchool(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        border: '1px solid var(--border, #cbd5e1)',
                                        fontSize: 14
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                                        Mã số sinh viên (MSSV) <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: HE187101, 2022001..."
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border, #cbd5e1)',
                                            fontSize: 14
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                                        Năm tốt nghiệp dự kiến <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        value={gradYear}
                                        onChange={(e) => setGradYear(Number(e.target.value))}
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border, #cbd5e1)',
                                            fontSize: 14,
                                            background: '#fff'
                                        }}
                                    >
                                        {GRAD_YEARS.map((y) => (
                                            <option key={y} value={y}>Năm {y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                                    Tên pháp lý Doanh nghiệp / Tổ chức <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Công ty TNHH Giải Pháp Công Nghệ Mới"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        border: '1px solid var(--border, #cbd5e1)',
                                        fontSize: 14
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                                    Mã số thuế (MST)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: 0108899888"
                                    value={taxCode}
                                    onChange={(e) => setTaxCode(e.target.value)}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        border: '1px solid var(--border, #cbd5e1)',
                                        fontSize: 14
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {/* Vùng tải tệp */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                            {isEmployer ? 'Ảnh Giấy phép kinh doanh (GPKD)' : 'Ảnh Thẻ sinh viên (Mặt trước & Mặt sau)'} <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                addFiles(Array.from(e.dataTransfer.files || []));
                            }}
                            style={{
                                border: '2px dashed var(--border, #cbd5e1)',
                                borderRadius: 10,
                                padding: '20px 16px',
                                textAlign: 'center',
                                background: 'var(--surface-sunken, #f8fafc)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <Icon name="upload" style={{ width: 28, height: 28, color: '#64748b', marginBottom: 6 }} />
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                                Bấm để chọn tệp hoặc kéo thả ảnh vào đây
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                                Định dạng JPG, PNG, PDF (tối đa 3 tệp, tối đa 10MB/tệp)
                            </div>
                        </div>
                    </div>

                    {/* Danh sách ảnh xem trước */}
                    {previews.length > 0 && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                            {previews.map((p, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        position: 'relative',
                                        width: 100,
                                        height: 100,
                                        borderRadius: 8,
                                        border: '1px solid var(--border, #cbd5e1)',
                                        overflow: 'hidden',
                                        background: '#000'
                                    }}
                                >
                                    {p.url ? (
                                        <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, padding: 4, textAlign: 'center' }}>
                                            <Icon name="file-text" style={{ width: 24, height: 24, marginBottom: 4 }} />
                                            <span>PDF</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveFile(idx);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            background: 'rgba(0,0,0,0.6)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: 22,
                                            height: 22,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Gợi ý quy chuẩn */}
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 18 }}>
                        💡 <b>Lưu ý chụp ảnh:</b> Hãy đảm bảo ảnh chụp không bị lóa đèn flash, không bị che khuất góc thẻ, và các thông tin (Họ tên, Trường, MSSV, Niên khóa) hiển thị rõ nét nhất.
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                            style={{ minWidth: 140, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                                    <span>Đang tải lên...</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="check" style={{ width: 16, height: 16 }} />
                                    <span>Gửi xác minh</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </ModalShell>
    );
}
