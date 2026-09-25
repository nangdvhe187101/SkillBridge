import React, { useState, useEffect } from 'react';
import ModalShell from './ModalShell';
import Icon from '../Icon';
import UserTierBadge from '../common/UserTierBadge';
import { getPublicStudentProfile } from '../../api/userApi';

export default function StudentPublicProfileModal({ isOpen, onClose, studentId, onReport }) {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !studentId) {
            setProfile(null);
            setError('');
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError('');

        getPublicStudentProfile(studentId)
            .then((res) => {
                if (isMounted) {
                    if (res?.data) {
                        setProfile(res.data);
                    } else {
                        setError('Không thể tải thông tin hồ sơ sinh viên.');
                    }
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err.message || 'Lỗi kết nối khi tải hồ sơ.');
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, studentId]);

    if (!isOpen) return null;

    const getScoreBadge = (score) => {
        if (score >= 90) return { bg: '#dcfce7', text: '#15803d', label: 'Rất uy tín' };
        if (score >= 70) return { bg: '#fef3c7', text: '#b45309', label: 'Khá' };
        return { bg: '#fee2e2', text: '#b91c1c', label: 'Cần chú ý' };
    };

    return (
        <ModalShell onClose={onClose} wide={true}>
            <div className="student-profile-modal-content" style={{ padding: '0.5rem 0' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem', width: '36px', height: '36px' }}></div>
                        <p>Đang tải hồ sơ năng lực & uy tín sinh viên...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                        <p>{error}</p>
                        <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '1rem' }}>
                            Đóng
                        </button>
                    </div>
                ) : profile ? (
                    <div>
                        {/* Header Profile Card */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1.25rem',
                            paddingBottom: '1.25rem',
                            borderBottom: '1px solid var(--border-color, #e2e8f0)',
                            marginBottom: '1.25rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '72px',
                                    height: '72px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    backgroundColor: '#e2e8f0',
                                    flexShrink: 0,
                                    border: '2px solid #3b82f6'
                                }}>
                                    <img
                                        src={profile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                                        alt={profile.fullName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                            e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                                        }}
                                    />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-color, #1e293b)' }}>
                                            {profile.fullName}
                                        </h3>
                                        <UserTierBadge
                                            planCode={profile.activePlanCode || (profile.reliabilityScore >= 95 ? 'STU_MASTER' : (profile.reliabilityScore >= 85 ? 'STU_PRO' : 'STU_STARTER'))}
                                            userRole="student"
                                            variant="pill"
                                            size="sm"
                                        />
                                        {profile.isKycVerified && (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                backgroundColor: '#dbeafe',
                                                color: '#1d4ed8',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                ✓ Đã xác thực KYC
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Icon name="map-pin" /> {profile.school || 'Đại học / Cao đẳng'}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {onReport && (
                                    <button
                                        type="button"
                                        onClick={() => onReport(profile.id, profile.fullName)}
                                        style={{
                                            padding: '0.5rem 0.85rem',
                                            borderRadius: '6px',
                                            border: '1px solid #fecaca',
                                            backgroundColor: '#fff5f5',
                                            color: '#dc2626',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}
                                        title="Báo cáo vi phạm nếu phát hiện hành vi không trung thực"
                                    >
                                        <Icon name="flag" /> Báo cáo
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Metric stats 3 cols */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '1rem',
                            marginBottom: '1.25rem'
                        }}>
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                                    Điểm uy tín hệ thống
                                </span>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: getScoreBadge(profile.reliabilityScore).text }}>
                                    {profile.reliabilityScore} / 100
                                </div>
                                <span style={{
                                    display: 'inline-block',
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px',
                                    backgroundColor: getScoreBadge(profile.reliabilityScore).bg,
                                    color: getScoreBadge(profile.reliabilityScore).text,
                                    marginTop: '0.3rem',
                                    fontWeight: 500
                                }}>
                                    {getScoreBadge(profile.reliabilityScore).label}
                                </span>
                            </div>

                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                                    Công việc hoàn thành
                                </span>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb' }}>
                                    {profile.completedJobsCount}
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem', display: 'block' }}>
                                    Dự án trên nền tảng
                                </span>
                            </div>

                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                                    Đánh giá trung bình
                                </span>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#eab308' }}>
                                    ⭐ {profile.averageRating}
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem', display: 'block' }}>
                                    ({profile.totalReviewsCount} đánh giá)
                                </span>
                            </div>
                        </div>

                        {/* Bio & Skills */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color, #1e293b)' }}>
                                Giới thiệu bản thân
                            </h4>
                            <p style={{
                                fontSize: '0.9rem',
                                lineHeight: '1.6',
                                color: 'var(--text-muted, #475569)',
                                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color, #f1f5f9)'
                            }}>
                                {profile.bio || 'Chưa cập nhật thông tin giới thiệu.'}
                            </p>
                        </div>

                        {profile.skills && profile.skills.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color, #1e293b)' }}>
                                    Chuyên môn & Lĩnh vực kinh nghiệm
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {profile.skills.map((skill, idx) => (
                                        <span
                                            key={idx}
                                            style={{
                                                padding: '0.3rem 0.75rem',
                                                backgroundColor: '#eff6ff',
                                                color: '#1d4ed8',
                                                borderRadius: '20px',
                                                fontSize: '0.825rem',
                                                fontWeight: 500,
                                                border: '1px solid #bfdbfe'
                                            }}
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reviews list */}
                        <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-color, #1e293b)' }}>
                                Nhận xét từ các Nhà tuyển dụng trước ({profile.reviews?.length || 0})
                            </h4>
                            {(!profile.reviews || profile.reviews.length === 0) ? (
                                <p style={{ fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Ứng viên chưa có đánh giá nào từ các dự án trước. Hãy là người đầu tiên trao cơ hội!
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
                                    {profile.reviews.map((rev) => (
                                        <div
                                            key={rev.id}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                backgroundColor: 'var(--bg-card, #fff)',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color, #e2e8f0)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rev.reviewerName}</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#eab308' }}>
                                                        {'★'.repeat(rev.stars)}{'☆'.repeat(5 - rev.stars)}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.35rem' }}>
                                                Dự án: <strong>{rev.jobTitle}</strong>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-color, #334155)', lineHeight: '1.4' }}>
                                                {rev.comment || 'Không có bình luận chi tiết.'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                style={{
                                    padding: '0.6rem 1.5rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </ModalShell>
    );
}
