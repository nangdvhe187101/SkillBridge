import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { uploadAvatar } from '../../api/userApi';
import { getMyCvFiles, uploadCvFile, deleteCv } from '../../api/cvApi';
import '../../styles/account-settings.css';

const PHONE_REGEX = /^0\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// ==========================================
// AVATAR UPLOAD COMPONENT
// ==========================================
function AvatarUploadCard({ currentUser, onAvatarUpdated }) {
    const { addToast } = useToast();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!allowedExts.includes(ext)) {
            addToast('Định dạng ảnh không hợp lệ. Chỉ chấp nhận file JPG, PNG, WEBP hoặc GIF.', 'error');
            return;
        }

        // Giới hạn 5MB
        if (file.size > 5 * 1024 * 1024) {
            addToast('Dung lượng ảnh vượt quá giới hạn (tối đa 5MB).', 'error');
            return;
        }

        setUploading(true);
        try {
            const res = await uploadAvatar(file);
            addToast('Cập nhật ảnh đại diện thành công!', 'success');
            if (onAvatarUpdated) {
                onAvatarUpdated(res.avatarUrl);
            }
        } catch (err) {
            addToast(err?.message || 'Không thể tải lên ảnh đại diện.', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const initial = (currentUser?.fullName || 'U').trim().charAt(0).toUpperCase();

    return (
        <div className="acct-avatar-card">
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleFileChange}
            />
            <div
                className="acct-avatar-wrapper"
                onClick={() => !uploading && fileInputRef.current?.click()}
                title="Bấm để đổi ảnh đại diện"
            >
                {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="Avatar" className="acct-avatar-img" />
                ) : (
                    <div className="acct-avatar-placeholder">{initial}</div>
                )}
                <div className="acct-avatar-overlay">
                    <span>{uploading ? '⏳ Đang tải...' : '📷 Đổi ảnh'}</span>
                </div>
            </div>

            <div className="acct-avatar-info">
                <h4>Ảnh đại diện (Avatar)</h4>
                <p>Hỗ trợ định dạng JPG, PNG, WEBP tối đa 5MB. Ảnh sẽ được tối ưu và lưu trên Cloudflare R2.</p>
                <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: 12.5 }}
                >
                    {uploading ? 'Đang tải lên...' : 'Chọn ảnh mới'}
                </button>
            </div>
        </div>
    );
}

// ==========================================
// 1. EMPLOYER PROFILE TAB
// ==========================================
function EmployerProfileTab({ currentUser, updateProfile, onAvatarUpdated }) {
    const [form, setForm] = useState({
        fullName: currentUser.fullName || currentUser.companyName || '',
        representative: currentUser.representative || '',
        taxCode: currentUser.taxCode || '',
        industry: currentUser.industry || 'Truyền thông & Marketing',
        address: currentUser.address || '',
        website: currentUser.website || '',
        phone: currentUser.phone || currentUser.phoneNumber || '',
        bio: currentUser.bio || currentUser.companyDescription || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = () => {
        setError('');
        if (!form.fullName.trim()) {
            setError('Vui lòng nhập tên công ty / doanh nghiệp.');
            return;
        }
        if (form.phone && !PHONE_REGEX.test(form.phone)) {
            setError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.');
            return;
        }
        setSaving(true);
        updateProfile({
            fullName: form.fullName.trim(),
            companyName: form.fullName.trim(),
            representative: form.representative.trim(),
            taxCode: form.taxCode.trim(),
            industry: form.industry,
            address: form.address.trim(),
            website: form.website.trim(),
            phone: form.phone || null,
            phoneNumber: form.phone || null,
            bio: form.bio.trim(),
            companyDescription: form.bio.trim(),
        });
        setSaving(false);
    };

    return (
        <>
            <h1 className="acct-content-title">Hồ sơ Doanh nghiệp</h1>

            <AvatarUploadCard currentUser={currentUser} onAvatarUpdated={onAvatarUpdated} />

            <div className="acct-section">
                <h3 className="acct-section-title">Thông tin Công ty / Doanh nghiệp</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Tên công ty / Doanh nghiệp <span style={{ color: 'var(--coral)' }}>*</span></label>
                        <input
                            type="text"
                            placeholder="Ví dụ: Công ty TNHH Sáng Tạo Mới"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        />
                    </div>
                    <div className="acct-field">
                        <label>Lĩnh vực hoạt động chính</label>
                        <select
                            value={form.industry}
                            onChange={(e) => setForm({ ...form, industry: e.target.value })}
                        >
                            <option>Truyền thông & Marketing</option>
                            <option>Công nghệ thông tin / Phần mềm</option>
                            <option>Thiết kế đồ họa & Video</option>
                            <option>Thương mại điện tử & Bán lẻ</option>
                            <option>Giáo dục & Đào tạo</option>
                            <option>Ẩm thực & Dịch vụ F&B</option>
                            <option>Khác</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="acct-section">
                <h3 className="acct-section-title">Địa chỉ & Liên hệ</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Địa chỉ trụ sở / Văn phòng</label>
                        <input
                            type="text"
                            placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />
                    </div>
                    <div className="acct-field">
                        <label>Website công ty</label>
                        <input
                            type="url"
                            placeholder="https://company.vn"
                            value={form.website}
                            onChange={(e) => setForm({ ...form, website: e.target.value })}
                        />
                    </div>
                </div>

                <div className="acct-field-row" style={{ marginTop: 12 }}>
                    <div className="acct-field">
                        <label>Email tài khoản</label>
                        <input type="email" value={currentUser.email || ''} disabled />
                        <div className="acct-hint">Email đăng nhập và nhận thông báo chính thức.</div>
                    </div>
                    <div className="acct-field">
                        <label>Số điện thoại Hotline</label>
                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="09xxxxxxxx"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                        />
                    </div>
                </div>
            </div>

            <div className="acct-section">
                <h3 className="acct-section-title">Giới thiệu Doanh nghiệp</h3>
                <div className="acct-field-row">
                    <div className="acct-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Mô tả ngắn về công ty & môi trường làm việc</label>
                        <textarea
                            rows={3}
                            placeholder="Mô tả văn hóa, các dự án tiêu biểu để thu hút ứng viên tài năng..."
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {error && <div className="field-error acct-error">{error}</div>}

            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 6 }}>
                {saving ? 'Đang lưu...' : 'Lưu thông tin doanh nghiệp'}
            </button>
        </>
    );
}

// ==========================================
// 2. STUDENT PROFILE TAB
// ==========================================
function StudentProfileTab({ currentUser, updateProfile, onAvatarUpdated }) {
    const [form, setForm] = useState({
        fullName: currentUser.fullName || '',
        school: currentUser.school || '',
        industry: currentUser.industry || 'Lập trình web',
        phone: currentUser.phone || currentUser.phoneNumber || '',
        website: currentUser.website || '',
        bio: currentUser.bio || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = () => {
        setError('');
        if (!form.fullName.trim()) {
            setError('Vui lòng nhập họ và tên.');
            return;
        }
        if (form.phone && !PHONE_REGEX.test(form.phone)) {
            setError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.');
            return;
        }
        setSaving(true);
        updateProfile({
            fullName: form.fullName.trim(),
            school: form.school.trim(),
            industry: form.industry,
            phone: form.phone || null,
            phoneNumber: form.phone || null,
            website: form.website.trim(),
            bio: form.bio.trim(),
        });
        setSaving(false);
    };

    return (
        <>
            <h1 className="acct-content-title">Hồ sơ Sinh viên</h1>

            <AvatarUploadCard currentUser={currentUser} onAvatarUpdated={onAvatarUpdated} />

            <div className="acct-section">
                <h3 className="acct-section-title">Thông tin cá nhân & Trường học</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Họ và tên đầy đủ <span style={{ color: 'var(--coral)' }}>*</span></label>
                        <input
                            type="text"
                            placeholder="Nguyễn Văn A"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        />
                    </div>
                    <div className="acct-field">
                        <label>Trường Đại học / Cao đẳng</label>
                        <input
                            type="text"
                            placeholder="Ví dụ: Đại học Bách Khoa, FPT..."
                            value={form.school}
                            onChange={(e) => setForm({ ...form, school: e.target.value })}
                        />
                    </div>
                </div>

                <div className="acct-field-row" style={{ marginTop: 12 }}>
                    <div className="acct-field">
                        <label>Lĩnh vực chuyên môn</label>
                        <select
                            value={form.industry}
                            onChange={(e) => setForm({ ...form, industry: e.target.value })}
                        >
                            <option>Lập trình web & App</option>
                            <option>Thiết kế đồ họa & UI/UX</option>
                            <option>Viết nội dung & Dịch thuật</option>
                            <option>Video Creator & Animation</option>
                            <option>Marketing & Quảng cáo số</option>
                        </select>
                    </div>
                    <div className="acct-field">
                        <label>Số điện thoại liên hệ</label>
                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="09xxxxxxxx"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                        />
                    </div>
                </div>
            </div>

            <div className="acct-section">
                <h3 className="acct-section-title">Giới thiệu bản thân</h3>
                <div className="acct-field-row">
                    <div className="acct-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Mô tả ngắn gọn về kỹ năng & mục tiêu nghề nghiệp</label>
                        <textarea
                            rows={3}
                            placeholder="Sinh viên năm 3 chuyên ngành CNTT, có kinh nghiệm với React, ASP.NET..."
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {error && <div className="field-error acct-error">{error}</div>}

            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 6 }}>
                {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
        </>
    );
}

// ==========================================
// 3. CV & STORAGE MANAGER TAB (STUDENT)
// ==========================================
function CvManagerTab() {
    const { addToast } = useToast();
    const [cvList, setCvList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [label, setLabel] = useState('');
    const fileInputRef = useRef(null);

    const loadCvs = async () => {
        try {
            setLoading(true);
            const data = await getMyCvFiles();
            setCvList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Lỗi lấy danh sách CV:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCvs();
    }, []);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedExts = ['pdf', 'doc', 'docx'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!allowedExts.includes(ext)) {
            addToast('Định dạng CV không hợp lệ. Vui lòng chọn file .pdf, .doc hoặc .docx.', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            addToast('Dung lượng CV vượt quá giới hạn (tối đa 10MB).', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (label.trim()) {
            formData.append('label', label.trim());
        }

        setUploading(true);
        try {
            await uploadCvFile(formData);
            addToast('Tải lên CV thành công lên Cloudflare R2!', 'success');
            setLabel('');
            await loadCvs();
        } catch (err) {
            addToast(err?.message || 'Không thể tải lên CV.', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id, fileName) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa "${fileName}"? File sẽ bị xóa vĩnh viễn khỏi Cloudflare R2.`)) {
            return;
        }

        try {
            await deleteCv(id);
            addToast('Đã xóa CV thành công.', 'success');
            setCvList((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
            addToast(err?.message || 'Không thể xóa CV.', 'error');
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <>
            <h1 className="acct-content-title">Quản lý CV & Hồ sơ</h1>

            <div className="acct-section" style={{ paddingTop: 0 }}>
                <p className="acct-section-desc">
                    Tải lên các bản CV chuyên ngành của bạn để ứng tuyển nhanh chóng vào các công việc. Mọi file được bảo mật và lưu trữ an toàn trên Cloudflare R2.
                </p>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx"
                    onChange={handleUpload}
                />

                <div
                    className="cv-dropzone"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                    <h3 style={{ fontSize: 16, margin: '0 0 6px' }}>
                        {uploading ? '⏳ Đang tải file lên Cloudflare R2...' : 'Nhấn để chọn file CV tải lên'}
                    </h3>
                    <p style={{ fontSize: 12.5, color: 'var(--muted, #666)', margin: 0 }}>
                        Định dạng hỗ trợ: PDF, DOC, DOCX (Tối đa 10MB)
                    </p>
                </div>
            </div>

            <div className="acct-section">
                <h3 className="acct-section-title">Danh sách CV của bạn ({cvList.length})</h3>

                {loading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Đang tải danh sách CV...</div>
                ) : cvList.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--muted)' }}>
                        Bạn chưa tải lên CV nào. Hãy nhấn vào ô phía trên để tải CV đầu tiên!
                    </div>
                ) : (
                    <div className="cv-list">
                        {cvList.map((cv) => (
                            <div className="cv-item-card" key={cv.id}>
                                <div className="cv-item-left">
                                    <div className="cv-item-icon">📄</div>
                                    <div className="cv-item-meta">
                                        <b>{cv.label || cv.fileName}</b>
                                        <div className="cv-item-sub">
                                            <span>{cv.fileName}</span>
                                            <span>•</span>
                                            <span>{formatBytes(cv.fileSize)}</span>
                                            {cv.categoryName && (
                                                <>
                                                    <span>•</span>
                                                    <span className="chip chip-lime" style={{ fontSize: 10, padding: '1px 6px' }}>{cv.categoryName}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="cv-item-actions">
                                    {cv.fileUrl && (
                                        <a
                                            href={cv.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-outline btn-sm"
                                            style={{ fontSize: 12, textDecoration: 'none' }}
                                        >
                                            👁️ Xem / Tải
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ color: 'var(--coral, #f43f5e)', borderColor: 'var(--coral, #f43f5e)', fontSize: 12 }}
                                        onClick={() => handleDelete(cv.id, cv.fileName)}
                                    >
                                        🗑️ Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

// ==========================================
// 4. PASSWORD TAB
// ==========================================
function PasswordTab({ changePassword, logout }) {
    const [form, setForm] = useState({ current: '', next: '', next2: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const save = async () => {
        setError('');
        setSuccess('');
        if (!form.current) {
            setError('Vui lòng nhập mật khẩu hiện tại.');
            return;
        }
        if (!form.next) {
            setError('Vui lòng nhập mật khẩu mới.');
            return;
        }
        if (form.next !== form.next2) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        if (!PASSWORD_REGEX.test(form.next)) {
            setError('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
            return;
        }
        setSaving(true);
        try {
            await changePassword(form.current, form.next);
            setSuccess('Đổi mật khẩu thành công! Hệ thống sẽ chuyển hướng để bạn đăng nhập lại sau 2 giây...');
            setForm({ current: '', next: '', next2: '' });
            setTimeout(() => {
                if (logout) logout();
            }, 2000);
        } catch (err) {
            setError(err?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <h1 className="acct-content-title">Đổi mật khẩu</h1>

            <div className="acct-section">
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Mật khẩu hiện tại</label>
                        <input
                            type="password"
                            value={form.current}
                            onChange={(e) => setForm({ ...form, current: e.target.value })}
                        />
                    </div>
                </div>
                <div className="acct-field-row" style={{ marginTop: 12 }}>
                    <div className="acct-field">
                        <label>Mật khẩu mới</label>
                        <input
                            type="password"
                            value={form.next}
                            onChange={(e) => setForm({ ...form, next: e.target.value })}
                        />
                        <div className="acct-hint">Ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.</div>
                    </div>
                    <div className="acct-field">
                        <label>Nhập lại mật khẩu mới</label>
                        <input
                            type="password"
                            value={form.next2}
                            onChange={(e) => setForm({ ...form, next2: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {error && <div className="field-error acct-error">{error}</div>}
            {success && <div style={{ color: 'var(--lime, #10b981)', marginBottom: 16, fontSize: 13 }}>{success}</div>}

            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 6 }}>
                {saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
        </>
    );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function AccountSettings({ forcedTab }) {
    const { state, updateProfile, changePassword, logout } = useStore();
    const { currentUser, role } = state;
    const navigate = useNavigate();
    const location = useLocation();

    const userRole = (currentUser?.roleCode || role || 'student').toLowerCase();
    const isEmployer = userRole === 'employer' || userRole === 'recruiter' || userRole === 'business';

    const tabs = isEmployer
        ? [
            { id: 'profile', path: '/settings/profile', label: 'Thông tin Doanh nghiệp', icon: '🏢' },
            { id: 'password', path: '/settings/password', label: 'Đổi mật khẩu', icon: '🔑' },
        ]
        : [
            { id: 'profile', path: '/settings/profile', label: 'Thông tin Sinh viên', icon: '🎓' },
            { id: 'cv_manager', path: '/settings/cv', label: 'Quản lý CV & Hồ sơ', icon: '📄' },
            { id: 'password', path: '/settings/password', label: 'Đổi mật khẩu', icon: '🔑' },
        ];

    const tab = useMemo(() => {
        if (forcedTab) return forcedTab;
        const p = location.pathname;
        if (p === '/settings/cv' || p === '/account/cv') return 'cv_manager';
        if (p === '/settings/password' || p === '/settings/security' || p === '/account/security') return 'password';
        return 'profile';
    }, [forcedTab, location.pathname]);

    const safeUser = currentUser || {
        fullName: isEmployer ? 'Công ty TNHH Sáng Tạo Mới' : 'Nguyễn Văn Năng',
        email: 'user@skillbridge.vn',
        phone: '',
        roleCode: isEmployer ? 'employer' : 'student',
    };

    const handleAvatarUpdated = (newAvatarUrl) => {
        if (updateProfile) {
            updateProfile({ avatarUrl: newAvatarUrl });
        }
    };

    return (
        <div className="page active">
            <div className="acct-settings-layout">
                <div className="acct-sidebar">
                    <div className="acct-sidebar-head">
                        <h2>Cài đặt</h2>
                        <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px', marginTop: 6, display: 'inline-block' }}>
                            {isEmployer ? '🏢 Nhà tuyển dụng' : '🎓 Sinh viên'}
                        </span>
                    </div>

                    <div className="acct-tablist">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                className={'acct-tab' + (tab === t.id ? ' is-active' : '')}
                                onClick={() => navigate(t.path)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <span>{t.icon}</span>
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                        <button
                            className="btn btn-outline btn-block"
                            style={{ color: 'var(--coral, #f43f5e)', borderColor: 'var(--coral, #f43f5e)', fontSize: 13 }}
                            onClick={logout}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>

                <div className="acct-content">
                    <div className="acct-content-inner">
                        {tab === 'profile' && (
                            isEmployer ? (
                                <EmployerProfileTab
                                    currentUser={safeUser}
                                    updateProfile={updateProfile}
                                    onAvatarUpdated={handleAvatarUpdated}
                                />
                            ) : (
                                <StudentProfileTab
                                    currentUser={safeUser}
                                    updateProfile={updateProfile}
                                    onAvatarUpdated={handleAvatarUpdated}
                                />
                            )
                        )}

                        {tab === 'cv_manager' && !isEmployer && (
                            <CvManagerTab />
                        )}

                        {tab === 'password' && (
                            <PasswordTab changePassword={changePassword} logout={logout} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}