import React, { useState } from 'react';
import ModalShell from './ModalShell';
import Icon from '../Icon';
import { submitReport } from '../../api/reportApi';

const REPORT_REASONS = [
    { value: 'scam', label: 'Lừa đảo / Chiếm đoạt tài sản' },
    { value: 'harassment', label: 'Quấy rối / Xúc phạm / Ngôn từ đe dọa' },
    { value: 'unpaid_work', label: 'Quỵt tiền / Không thanh toán hoặc ép làm ngoài phạm vi' },
    { value: 'bad_deliverable', label: 'Giao sản phẩm giả mạo / Đạo nhái / Kém chất lượng' },
    { value: 'inappropriate_content', label: 'Nội dung phản cảm / Đồi trụy / Vi phạm pháp luật' },
    { value: 'fake_job', label: 'Tin tuyển dụng ảo / Thu thập thông tin trái phép' },
    { value: 'other', label: 'Lý do khác' }
];

export default function ReportModal({ isOpen = true, onClose, targetUserId, targetUserName, withName, jobId, jobTitle, onSuccess }) {
    const [reasonCategory, setReasonCategory] = useState('scam');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [evidenceUrls, setEvidenceUrls] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    if (isOpen === false) return null;

    const displayName = targetUserName || withName;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!title.trim()) {
            setErrorMsg('Vui lòng nhập tóm tắt tiêu đề báo cáo.');
            return;
        }

        if (!description.trim() || description.trim().length < 15) {
            setErrorMsg('Mô tả chi tiết vi phạm phải có ít nhất 15 ký tự để đội ngũ Admin có đủ căn cứ xử lý.');
            return;
        }

        const evidences = evidenceUrls
            .split('\n')
            .map((u) => u.trim())
            .filter((u) => u.length > 0);

        setSubmitting(true);
        try {
            const res = await submitReport({
                reportedUserId: targetUserId ? Number(targetUserId) : null,
                jobId: jobId ? Number(jobId) : null,
                reasonCategory,
                title: title.trim(),
                description: description.trim(),
                evidenceUrls: evidences
            });

            if (res?.success) {
                setSuccessMsg('Báo cáo vi phạm của bạn đã được gửi thành công đến Quản trị viên SkillBridge.');
                setTimeout(() => {
                    onSuccess?.();
                    onClose?.();
                }, 1800);
            } else {
                setErrorMsg(res?.message || 'Không thể gửi báo cáo. Vui lòng thử lại sau.');
            }
        } catch (err) {
            setErrorMsg(err.message || 'Đã xảy ra lỗi khi gửi báo cáo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalShell onClose={onClose} wide={false}>
            <div className="report-modal-content" style={{ padding: '0.5rem 0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '0.75rem' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem'
                    }}>
                        <Icon name="alert-triangle" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-color, #1e293b)' }}>
                            Báo cáo vi phạm
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                            {displayName ? `Đối tượng: ${displayName}` : jobId ? `Dự án: #${jobId} ${jobTitle ? `(${jobTitle})` : ''}` : 'Gửi phản ánh tới Ban quản trị'}
                        </p>
                    </div>
                </div>

                {successMsg ? (
                    <div style={{
                        padding: '1.5rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        color: '#166534',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Gửi báo cáo thành công</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{successMsg}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {errorMsg && (
                            <div style={{
                                padding: '0.75rem',
                                marginBottom: '1rem',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                color: '#b91c1c',
                                fontSize: '0.875rem'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-color, #334155)' }}>
                                Danh mục vi phạm <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                value={reasonCategory}
                                onChange={(e) => setReasonCategory(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    fontSize: '0.9rem',
                                    backgroundColor: 'var(--bg-card, #fff)'
                                }}
                            >
                                {REPORT_REASONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-color, #334155)' }}>
                                Tiêu đề sự việc <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="VD: Yêu cầu chuyển tiền cọc ngoài sàn, bàn giao code copy..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={200}
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-color, #334155)' }}>
                                Mô tả chi tiết hành vi vi phạm <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                rows={4}
                                placeholder="Hãy cung cấp cụ thể thời gian, hoàn cảnh và nội dung trao đổi vi phạm điều khoản..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    fontSize: '0.9rem',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-color, #334155)' }}>
                                Link dẫn chứng / Ảnh chụp bằng chứng (mỗi link 1 dòng)
                            </label>
                            <textarea
                                rows={2}
                                placeholder="https://drive.google.com/... hoặc link ảnh đính kèm"
                                value={evidenceUrls}
                                onChange={(e) => setEvidenceUrls(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    fontSize: '0.85rem',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color, #cbd5e1)',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-color, #475569)'
                                }}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                    fontWeight: 500,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {submitting ? 'Đang gửi...' : 'Gửi báo cáo vi phạm'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </ModalShell>
    );
}
