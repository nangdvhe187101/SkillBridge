import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { uploadAvatar } from '../../api/userApi';
import { getMyCvFiles, uploadCvFile, deleteCv, updateCv } from '../../api/cvApi';
import { getCategories } from '../../api/jobApi';
import { getKycStatus, submitKyc } from '../../api/kycApi';
import { downloadCandidateCv } from '../../utils/fileDownloader';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import ModalShell from '../../components/modals/ModalShell';
import '../../styles/account-settings.css';

const PHONE_REGEX = /^0\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Avatar Upload Component
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
                <Avatar
                    src={currentUser?.avatarUrl}
                    name={currentUser?.fullName || 'User'}
                    className="acct-avatar-img"
                    fontSize={28}
                    style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
                <div className="acct-avatar-overlay">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name={uploading ? 'hourglass' : 'camera'} width="14" height="14" />
                        <span>{uploading ? 'Đang tải...' : 'Đổi ảnh'}</span>
                    </span>
                </div>
            </div>

            <div className="acct-avatar-info">
                <h4>Ảnh đại diện (Avatar)</h4>
                <p>Hỗ trợ định dạng JPG, PNG, WEBP tối đa 5MB. Ảnh sẽ được tối ưu và bảo mật an toàn.</p>
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

// 1. Employer Profile Tab
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

    const save = async () => {
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
        try {
            await updateProfile({
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
        } catch (err) {
            setError(err?.message || 'Không thể lưu thông tin hồ sơ.');
        } finally {
            setSaving(false);
        }
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

// 2. Student Profile Tab
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

    const save = async () => {
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
        try {
            await updateProfile({
                fullName: form.fullName.trim(),
                school: form.school.trim(),
                industry: form.industry,
                phone: form.phone || null,
                phoneNumber: form.phone || null,
                website: form.website.trim(),
                bio: form.bio.trim(),
                companyDescription: form.bio.trim(),
            });
        } catch (err) {
            setError(err?.message || 'Không thể lưu thông tin hồ sơ.');
        } finally {
            setSaving(false);
        }
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
                        <div style={{ fontSize: '0.78rem', color: '#6366f1', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>💡</span>
                            <span>Vui lòng nhập đúng Họ và Tên theo CCCD để trùng khớp với tài khoản ngân hàng khi rút tiền.</span>
                        </div>
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

// 3. CV & Storage Manager Tab (Student)
function CvManagerTab() {
    const { addToast } = useToast();
    const confirm = useConfirm();
    const [cvList, setCvList] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // State cho Modal Upload
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [uploadForm, setUploadForm] = useState({
        label: '',
        categoryId: '',
        isSearchable: true,
    });

    // State cho Modal Edit
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCv, setEditingCv] = useState(null);
    const [editForm, setEditForm] = useState({
        label: '',
        categoryId: '',
        isSearchable: true,
    });

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

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Lỗi lấy danh mục ngành nghề:', err);
        }
    };

    useEffect(() => {
        loadCvs();
        loadCategories();
    }, []);

    const processSelectedFile = (file) => {
        if (!file) return;

        if (cvList.length >= 5) {
            addToast('Bạn đã đạt giới hạn tối đa 5 bản CV trong hồ sơ. Vui lòng xóa bớt CV không còn sử dụng để tải lên bản mới.', 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const allowedExts = ['pdf', 'doc', 'docx'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!allowedExts.includes(ext)) {
            addToast('Định dạng CV không hợp lệ. Vui lòng chọn file .pdf, .doc hoặc .docx.', 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            addToast('Dung lượng CV vượt quá giới hạn (tối đa 10 MB).', 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Tự gợi ý label theo tên file
        const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setPendingFile(file);
        setUploadForm({
            label: cleanBaseName || 'CV Ứng tuyển',
            categoryId: categories.length > 0 ? categories[0].id : '',
            isSearchable: true,
        });
        setUploadModalOpen(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // 1. Khi chọn file từ máy bằng input
    const handleFileSelected = (e) => {
        const file = e.target.files?.[0];
        processSelectedFile(file);
    };

    // Drag and Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (cvList.length < 5) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (cvList.length >= 5) {
            addToast('Bạn đã đạt giới hạn tối đa 5 bản CV trong hồ sơ. Vui lòng xóa bớt CV không còn sử dụng để tải lên bản mới.', 'error');
            return;
        }
        const file = e.dataTransfer?.files?.[0];
        if (file) {
            processSelectedFile(file);
        }
    };

    const handleTriggerAddCv = () => {
        if (cvList.length >= 5) {
            addToast('Bạn đã đạt giới hạn tối đa 5 bản CV trong hồ sơ. Vui lòng xóa bớt CV không còn sử dụng để tải lên bản mới.', 'error');
            return;
        }
        fileInputRef.current?.click();
    };

    // 2. Submit Upload sau khi đã chọn ngành và nhãn
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!pendingFile) {
            addToast('Chưa chọn file CV.', 'error');
            return;
        }

        if (!uploadForm.categoryId) {
            addToast('Vui lòng chọn ngành nghề phù hợp cho CV.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', pendingFile);
        formData.append('categoryId', uploadForm.categoryId);
        if (uploadForm.label.trim()) {
            formData.append('label', uploadForm.label.trim());
        }

        setUploading(true);
        try {
            await uploadCvFile(formData);
            addToast('Tải lên và phân loại CV thành công!', 'success');
            setUploadModalOpen(false);
            setPendingFile(null);
            await loadCvs();
        } catch (err) {
            addToast(err?.message || 'Không thể tải lên CV.', 'error');
        } finally {
            setUploading(false);
        }
    };

    // 3. Mở Modal Chỉnh sửa CV
    const handleOpenEdit = (cv) => {
        setEditingCv(cv);
        setEditForm({
            label: cv.label || cv.fileName,
            categoryId: cv.categoryId || (categories.length > 0 ? categories[0].id : ''),
            isSearchable: cv.isSearchable ?? true,
        });
        setEditModalOpen(true);
    };

    // 4. Submit Cập nhật CV
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingCv) return;

        if (!editForm.categoryId) {
            addToast('Vui lòng chọn ngành nghề phù hợp cho CV.', 'error');
            return;
        }

        setUpdating(true);
        try {
            const updated = await updateCv(editingCv.id, {
                label: editForm.label.trim(),
                categoryId: parseInt(editForm.categoryId, 10),
                isSearchable: editForm.isSearchable,
            });
            addToast('Cập nhật thông tin CV thành công!', 'success');
            setEditModalOpen(false);
            setEditingCv(null);
            setCvList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        } catch (err) {
            addToast(err?.message || 'Không thể cập nhật CV.', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (id, fileName) => {
        const confirmed = await confirm(
            `Bạn có chắc chắn muốn xóa bản CV "${fileName}"? Sau khi xóa, bạn sẽ không thể hoàn tác thao tác này.`,
            {
                danger: true,
                confirmLabel: 'Xóa CV',
                cancelLabel: 'Hủy'
            }
        );
        if (!confirmed) return;

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

    const quotaPercentage = Math.min(100, (cvList.length / 5) * 100);
    const quotaColor = cvList.length >= 5 ? 'var(--coral, #f43f5e)' : cvList.length === 4 ? '#f59e0b' : 'var(--primary, #6c4cff)';

    return (
        <>
            <h1 className="acct-content-title">Quản lý CV & Hồ sơ</h1>

            <div className="acct-section" style={{ paddingTop: 0 }}>
                <p className="acct-section-desc">
                    Tải lên các bản CV chuyên ngành của bạn để ứng tuyển nhanh chóng vào các công việc. Phân loại chính xác ngành nghề giúp nhà tuyển dụng dễ dàng tìm thấy bạn.
                </p>

                {/* Quota Meter Bar */}
                <div style={{ background: 'var(--surface-2, rgba(0,0,0,0.03))', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                            <Icon name="folder" width="16" height="16" style={{ color: quotaColor }} />
                            Hạn mức lưu trữ CV cá nhân
                        </span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: quotaColor, fontSize: 13.5 }}>
                            {cvList.length} / 5 bản CV
                        </span>
                    </div>
                    <div style={{ height: 6, width: '100%', background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${quotaPercentage}%`, background: quotaColor, transition: 'width 0.3s ease, background 0.3s ease' }} />
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted, #666)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Mỗi sinh viên được quản lý tối đa 5 bản CV chuyên môn.</span>
                        {cvList.length >= 5 && <span style={{ color: 'var(--coral)', fontWeight: 600 }}>Đã dùng hết 100% dung lượng</span>}
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelected}
                    aria-label="Chọn file CV từ máy tính"
                />

                <div
                    className="cv-dropzone"
                    role="button"
                    tabIndex={cvList.length >= 5 ? -1 : 0}
                    onClick={() => !uploading && handleTriggerAddCv()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!uploading) handleTriggerAddCv();
                        }
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                        cursor: cvList.length >= 5 ? 'not-allowed' : 'pointer',
                        opacity: cvList.length >= 5 ? 0.75 : 1,
                        border: isDragging ? '2px dashed var(--primary, #6c4cff)' : undefined,
                        background: isDragging ? 'rgba(108, 76, 255, 0.05)' : undefined,
                        transition: 'border-color 0.2s ease, background 0.2s ease'
                    }}
                    aria-label="Kéo thả hoặc nhấn để chọn file CV tải lên"
                >
                    <div style={{ marginBottom: 10, color: isDragging ? 'var(--primary)' : 'var(--primary)' }}>
                        <Icon name="upload-cloud" width="42" height="42" />
                    </div>
                    <h3 style={{ fontSize: 16, margin: '0 0 6px' }}>
                        {uploading
                            ? 'Đang xử lý tải lên…'
                            : isDragging
                            ? 'Thả file CV vào đây để tiếp tục'
                            : cvList.length >= 5
                            ? 'Đã đạt hạn mức tối đa 5 bản CV'
                            : 'Kéo & thả file CV vào đây hoặc nhấn để chọn file'}
                    </h3>
                    <p style={{ fontSize: 12.5, color: 'var(--muted, #666)', margin: 0 }}>
                        {cvList.length >= 5
                            ? 'Vui lòng xóa bớt CV không còn sử dụng để thêm bản mới.'
                            : 'Định dạng hỗ trợ: PDF, DOC, DOCX (Tối đa 10 MB). Bạn sẽ được chọn ngành nghề và đặt nhãn sau khi chọn file.'}
                    </p>
                </div>
            </div>

            <div className="acct-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 className="acct-section-title" style={{ margin: 0 }}>
                            Danh sách CV của bạn ({cvList.length}/5)
                        </h3>
                        {cvList.length >= 5 && (
                            <span className="chip" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--coral)', background: 'rgba(244,63,94,0.1)', fontWeight: 600 }}>
                                Đã đạt giới hạn 5 CV
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: cvList.length >= 5 ? 0.6 : 1 }}
                        onClick={handleTriggerAddCv}
                        aria-label="Thêm CV mới"
                    >
                        <Icon name="plus" width="14" height="14" /> Thêm CV mới
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[1, 2].map((i) => (
                            <div key={i} style={{ padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-2, rgba(0,0,0,0.02))', display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--border)', opacity: 0.5 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ height: 16, width: '40%', background: 'var(--border)', borderRadius: 4, marginBottom: 8, opacity: 0.5 }} />
                                    <div style={{ height: 12, width: '60%', background: 'var(--border)', borderRadius: 4, opacity: 0.3 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : cvList.length === 0 ? (
                    <div style={{ padding: 36, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--muted)' }}>
                        <div style={{ marginBottom: 10, color: 'var(--muted)' }}>
                            <Icon name="file-text" width="36" height="36" />
                        </div>
                        <p style={{ margin: 0, fontSize: 13.5 }}>
                            Bạn chưa tải lên CV nào. Hãy kéo thả file vào ô phía trên hoặc nhấn nút "Thêm CV mới" để tạo CV chuyên ngành đầu tiên!
                        </p>
                    </div>
                ) : (
                    <div className="cv-list">
                        {cvList.map((cv) => (
                            <div className="cv-item-card" key={cv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12, background: 'var(--surface, #fff)' }}>
                                <div className="cv-item-left" style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1, marginRight: 12 }}>
                                    <div className="cv-item-icon" style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(108, 76, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                        <Icon name="file-text" width="22" height="22" />
                                    </div>
                                    <div className="cv-item-meta" style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <b style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cv.label || cv.fileName}</b>
                                            {cv.categoryName ? (
                                                <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px', fontWeight: 600 }}>
                                                    {cv.categoryName}
                                                </span>
                                            ) : (
                                                <span className="chip" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--coral)', background: 'rgba(244,63,94,0.1)' }}>
                                                    Chưa phân ngành
                                                </span>
                                            )}
                                        </div>
                                        <div className="cv-item-sub" style={{ fontSize: 12.5, color: 'var(--muted, #666)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{cv.fileName}</span>
                                            <span>•</span>
                                            <span>{formatBytes(cv.fileSize)}</span>
                                            {cv.uploadedAt && (
                                                <>
                                                    <span>•</span>
                                                    <span>Ngày tải: {new Date(cv.uploadedAt).toLocaleDateString('vi-VN')}</span>
                                                </>
                                            )}
                                            {cv.isSearchable ? (
                                                <>
                                                    <span>•</span>
                                                    <span style={{ color: 'var(--primary)', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                        <Icon name="search" width="12" height="12" /> Cho phép tìm kiếm
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>•</span>
                                                    <span style={{ color: 'var(--muted)', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                        <Icon name="lock" width="12" height="12" /> Chỉ dùng ứng tuyển
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="cv-item-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                        onClick={() => handleOpenEdit(cv)}
                                        title="Chỉnh sửa ngành nghề và tên nhãn"
                                        aria-label={`Chỉnh sửa thông tin CV ${cv.label || cv.fileName}`}
                                    >
                                        <Icon name="edit" width="13" height="13" /> Sửa
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                        onClick={() => downloadCandidateCv(cv.id, cv.fileName)}
                                        title="Xem hoặc tải về máy"
                                        aria-label={`Xem hoặc tải CV ${cv.label || cv.fileName}`}
                                    >
                                        <Icon name="eye" width="13" height="13" /> Xem / Tải
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ color: 'var(--coral, #f43f5e)', borderColor: 'var(--coral, #f43f5e)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                        onClick={() => handleDelete(cv.id, cv.fileName)}
                                        title="Xóa CV khỏi hồ sơ"
                                        aria-label={`Xóa CV ${cv.label || cv.fileName}`}
                                    >
                                        <Icon name="trash" width="13" height="13" /> Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Upload & Cấu hình Ngành Nghề CV */}
            {uploadModalOpen && (
                <ModalShell onClose={() => !uploading && setUploadModalOpen(false)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(108, 76, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                            <Icon name="file-text" width="22" height="22" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Cấu hình & Tải lên CV mới</h3>
                            <span style={{ fontSize: 13, color: 'var(--muted, #666)' }}>
                                Phân loại ngành nghề giúp hồ sơ của bạn tiếp cận đúng nhà tuyển dụng.
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleUploadSubmit}>
                        <div style={{ background: 'var(--bg, #f8f9fa)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                            <b>File đã chọn:</b> {pendingFile?.name} ({formatBytes(pendingFile?.size)})
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label htmlFor="upload-cv-category" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                Ngành nghề / Lĩnh vực chuyên môn <span style={{ color: 'var(--coral)' }}>*</span>
                            </label>
                            <select
                                id="upload-cv-category"
                                value={uploadForm.categoryId}
                                onChange={(e) => setUploadForm({ ...uploadForm, categoryId: e.target.value })}
                                required
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13.5 }}
                            >
                                <option value="" disabled>-- Vui lòng chọn ngành nghề --</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label htmlFor="upload-cv-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                Nhãn CV / Vị trí hướng tới <span style={{ color: 'var(--coral)' }}>*</span>
                            </label>
                            <input
                                id="upload-cv-label"
                                type="text"
                                value={uploadForm.label}
                                onChange={(e) => setUploadForm({ ...uploadForm, label: e.target.value })}
                                placeholder="VD: CV Lập trình Web Frontend, CV Content Creator…"
                                required
                                maxLength={100}
                                autoComplete="off"
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13.5 }}
                            />
                            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted, #666)', marginTop: 4 }}>
                                Tên phân biệt giữa các bản CV của bạn (Ví dụ: CV React, CV Node.js).
                            </span>
                        </div>

                        <div style={{ marginBottom: 18 }}>
                            <label htmlFor="upload-cv-searchable" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5 }}>
                                <input
                                    id="upload-cv-searchable"
                                    type="checkbox"
                                    checked={uploadForm.isSearchable}
                                    onChange={(e) => setUploadForm({ ...uploadForm, isSearchable: e.target.checked })}
                                />
                                <span>Cho phép nhà tuyển dụng tìm thấy CV này khi tìm kiếm ứng viên theo ngành</span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setUploadModalOpen(false)}
                                disabled={uploading}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={uploading}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                {uploading ? 'Đang tải lên…' : 'Xác nhận tải lên'}
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {/* Modal Chỉnh Sửa CV Hiện Có */}
            {editModalOpen && editingCv && (
                <ModalShell onClose={() => !updating && setEditModalOpen(false)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(108, 76, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                            <Icon name="edit" width="22" height="22" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Chỉnh sửa thông tin CV</h3>
                            <span style={{ fontSize: 13, color: 'var(--muted, #666)' }}>
                                Cập nhật ngành nghề và nhãn chuyên môn mà không cần tải lại file.
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleEditSubmit}>
                        <div style={{ background: 'var(--bg, #f8f9fa)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                            <b>File gốc:</b> {editingCv.fileName} ({formatBytes(editingCv.fileSize)})
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label htmlFor="edit-cv-category" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                Ngành nghề / Lĩnh vực chuyên môn <span style={{ color: 'var(--coral)' }}>*</span>
                            </label>
                            <select
                                id="edit-cv-category"
                                value={editForm.categoryId}
                                onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                                required
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13.5 }}
                            >
                                <option value="" disabled>-- Vui lòng chọn ngành nghề --</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label htmlFor="edit-cv-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                Nhãn CV / Vị trí hướng tới <span style={{ color: 'var(--coral)' }}>*</span>
                            </label>
                            <input
                                id="edit-cv-label"
                                type="text"
                                value={editForm.label}
                                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                placeholder="VD: CV Lập trình Web Frontend, CV Content Creator…"
                                required
                                maxLength={100}
                                autoComplete="off"
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13.5 }}
                            />
                        </div>

                        <div style={{ marginBottom: 18 }}>
                            <label htmlFor="edit-cv-searchable" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5 }}>
                                <input
                                    id="edit-cv-searchable"
                                    type="checkbox"
                                    checked={editForm.isSearchable}
                                    onChange={(e) => setEditForm({ ...editForm, isSearchable: e.target.checked })}
                                />
                                <span>Cho phép nhà tuyển dụng tìm thấy CV này khi tìm kiếm ứng viên theo ngành</span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setEditModalOpen(false)}
                                disabled={updating}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={updating}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                {updating ? 'Đang lưu…' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}
        </>
    );
}

// 4. Password Tab
function PasswordTab({ changePassword, logout }) {
    const [form, setForm] = useState({ current: '', next: '', next2: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNext, setShowNext] = useState(false);
    const [showNext2, setShowNext2] = useState(false);

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
                        <div className="password-field">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={form.current}
                                onChange={(e) => setForm({ ...form, current: e.target.value })}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowCurrent(!showCurrent)}
                                title={showCurrent ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                                aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                tabIndex={-1}
                            >
                                <Icon name={showCurrent ? 'eye-off' : 'eye'} width="20" height="20" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="acct-field-row" style={{ marginTop: 12 }}>
                    <div className="acct-field">
                        <label>Mật khẩu mới</label>
                        <div className="password-field">
                            <input
                                type={showNext ? 'text' : 'password'}
                                value={form.next}
                                onChange={(e) => setForm({ ...form, next: e.target.value })}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowNext(!showNext)}
                                title={showNext ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                                aria-label={showNext ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                tabIndex={-1}
                            >
                                <Icon name={showNext ? 'eye-off' : 'eye'} width="20" height="20" />
                            </button>
                        </div>
                        <div className="acct-hint">Ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.</div>
                    </div>
                    <div className="acct-field">
                        <label>Nhập lại mật khẩu mới</label>
                        <div className="password-field">
                            <input
                                type={showNext2 ? 'text' : 'password'}
                                value={form.next2}
                                onChange={(e) => setForm({ ...form, next2: e.target.value })}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowNext2(!showNext2)}
                                title={showNext2 ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                                aria-label={showNext2 ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                tabIndex={-1}
                            >
                                <Icon name={showNext2 ? 'eye-off' : 'eye'} width="20" height="20" />
                            </button>
                        </div>
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

// 5. KYC & Verification Tab
const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR + i);

function KycVerificationTab({ isEmployer, currentUser }) {
    const { addToast } = useToast();
    const [kycData, setKycData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReapplyForm, setShowReapplyForm] = useState(false);

    // Form fields
    const [school, setSchool] = useState('');
    const [studentId, setStudentId] = useState('');
    const [gradYear, setGradYear] = useState(CURRENT_YEAR + 2);
    const [companyName, setCompanyName] = useState('');
    const [taxCode, setTaxCode] = useState('');
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef(null);

    const loadKyc = async () => {
        try {
            setLoading(true);
            const res = await getKycStatus();
            setKycData(res);
            if (res.school) setSchool(res.school);
            if (res.studentIdNumber) setStudentId(res.studentIdNumber);
            if (res.graduationYear) setGradYear(res.graduationYear);
            if (res.companyName) setCompanyName(res.companyName);
            if (res.taxCode) setTaxCode(res.taxCode);
        } catch (err) {
            console.error('Lỗi khi tải thông tin eKYC:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKyc();
    }, []);

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
            setErrorMsg('Vui lòng tải lên ít nhất một ảnh Thẻ sinh viên hoặc Giấy phép kinh doanh.');
            return;
        }

        if (!isEmployer) {
            if (!school.trim()) {
                setErrorMsg('Vui lòng nhập tên trường Đại học / Cao đẳng bạn đang theo học.');
                return;
            }
            if (!studentId.trim()) {
                setErrorMsg('Vui lòng nhập Mã số sinh viên (MSSV) in trên thẻ.');
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
            addToast('Gửi hồ sơ xác minh thành công! Hồ sơ của bạn đang được xét duyệt.', 'check');
            setShowReapplyForm(false);
            setFiles([]);
            setPreviews([]);
            await loadKyc();
        } catch (err) {
            console.error('Lỗi khi nộp eKYC:', err);
            setErrorMsg(err.message || 'Không thể gửi hồ sơ, vui lòng kiểm tra lại kết nối mạng.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 24, height: 24, borderWidth: 2, marginRight: 8 }}></span>
                <span>Đang tải thông tin xác minh danh tính...</span>
            </div>
        );
    }

    const status = kycData?.kycStatus || 'unverified';
    const isVerified = status === 'verified';
    const isPending = status === 'pending';
    const isRejected = status === 'rejected';
    const isExpired = status === 'expired';
    const shouldShowForm = status === 'unverified' || showReapplyForm;

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                    <h1 className="acct-content-title" style={{ margin: 0 }}>
                        {isEmployer ? 'Xác minh Pháp nhân Doanh nghiệp' : 'Xác minh eKYC Thẻ Sinh viên'}
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--ink-soft)' }}>
                        {isEmployer
                            ? 'Xác thực Giấy phép kinh doanh để nhận Tick xanh và xây dựng niềm tin với nhân tài sinh viên.'
                            : 'Chứng thực tư cách sinh viên đang theo học để hưởng trọn quyền lợi và tích lũy điểm uy tín.'}
                    </p>
                </div>

                {isVerified && (
                    <span className="chip" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                        <Icon name="shield-check" width="16" height="16" /> Đã xác thực chính thức
                    </span>
                )}
                {isPending && (
                    <span className="chip" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                        <Icon name="clock" width="16" height="16" /> Đang chờ xét duyệt
                    </span>
                )}
                {isRejected && (
                    <span className="chip" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                        <Icon name="alert-circle" width="16" height="16" /> Cần nộp lại hồ sơ
                    </span>
                )}
                {isExpired && (
                    <span className="chip" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                        <Icon name="alert-triangle" width="16" height="16" /> Thẻ sinh viên hết hạn
                    </span>
                )}
            </div>

            {/* BANNER 1: VERIFIED */}
            {isVerified && !shouldShowForm && (
                <div className="acct-section" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(to right, rgba(16, 185, 129, 0.05), transparent)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon name="shield-check" width="24" height="24" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#065f46' }}>
                                Hồ sơ đã được Ban Quản trị phê duyệt
                            </h3>
                            <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--ink)' }}>
                                Tài khoản của bạn đã được gắn <b>Huy hiệu Tick xanh</b>, tăng hạn mức rút tiền và được ưu tiên tuyển dụng trên nền tảng.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Trường đào tạo</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{kycData.school || '—'}</div>
                                </div>
                                {kycData.studentIdNumber && (
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Mã số sinh viên (MSSV)</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{kycData.studentIdNumber}</div>
                                    </div>
                                )}
                                {kycData.graduationYear && (
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Niên khóa tốt nghiệp dự kiến</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Năm {kycData.graduationYear}</div>
                                    </div>
                                )}
                                {kycData.kycExpiresAt && (
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Hạn hiệu lực thẻ sinh viên</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>
                                            Đến {new Date(kycData.kycExpiresAt).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {kycData.documents?.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Giấy tờ đã xác thực:</div>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        {kycData.documents.map((doc) => (
                                            <a
                                                key={doc.id}
                                                href={doc.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-outline btn-sm"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                                            >
                                                <Icon name="file-text" width="14" height="14" />
                                                <span>{doc.fileName}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BANNER 2: PENDING */}
            {isPending && !shouldShowForm && (
                <div className="acct-section" style={{ borderLeft: '4px solid #3b82f6', background: 'linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon name="clock" width="24" height="24" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#1d4ed8' }}>
                                Hồ sơ đang được thẩm định
                            </h3>
                            <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--ink)' }}>
                                Ban Quản trị SkillBridge đang đối soát thông tin Thẻ sinh viên / Giấy phép của bạn. Thời gian xét duyệt thường trong vòng <b>2 - 24 giờ</b>.
                            </p>
                            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                                Trường: <b>{kycData.school || '—'}</b> {kycData.studentIdNumber && <>| MSSV: <b>{kycData.studentIdNumber}</b></>} {kycData.graduationYear && <>| Tốt nghiệp: <b>Năm {kycData.graduationYear}</b></>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BANNER 3: REJECTED */}
            {isRejected && !shouldShowForm && (
                <div className="acct-section" style={{ borderLeft: '4px solid #ef4444', background: 'linear-gradient(to right, rgba(239, 68, 68, 0.05), transparent)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon name="alert-circle" width="24" height="24" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#b91c1c' }}>
                                Hồ sơ xác minh chưa được phê duyệt
                            </h3>
                            <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--ink)' }}>
                                Lý do từ chối: <b>{kycData.kycRejectionReason || 'Hình ảnh mờ hoặc thông tin thẻ sinh viên không khớp.'}</b>
                            </p>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowReapplyForm(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                <Icon name="refresh" width="14" height="14" /> Nộp lại hồ sơ xác minh
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BANNER 4: EXPIRED */}
            {isExpired && !shouldShowForm && (
                <div className="acct-section" style={{ borderLeft: '4px solid #f59e0b', background: 'linear-gradient(to right, rgba(245, 158, 11, 0.05), transparent)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon name="alert-triangle" width="24" height="24" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#b45309' }}>
                                Thẻ sinh viên đã hết hạn niên khóa
                            </h3>
                            <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--ink)' }}>
                                Thẻ sinh viên của bạn đã hết hạn theo niên khóa {kycData.graduationYear}. Vui lòng nộp Giấy chứng nhận gia hạn sinh viên hoặc chuyển đổi sang tài khoản Freelancer.
                            </p>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowReapplyForm(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                <Icon name="upload" width="14" height="14" /> Cập nhật Thẻ sinh viên mới
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FORM NỘP HỒ SƠ */}
            {shouldShowForm && (
                <div className="acct-section">
                    <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>
                        {isEmployer ? 'Biểu mẫu nộp Giấy phép kinh doanh' : 'Biểu mẫu nộp Thẻ sinh viên'}
                    </h3>

                    {errorMsg && (
                        <div className="field-error acct-error" style={{ marginBottom: 14 }}>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {!isEmployer ? (
                            <>
                                <div className="acct-field-row">
                                    <div className="acct-field" style={{ flex: 1 }}>
                                        <label>Trường Đại học / Cao đẳng <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: Đại học FPT, ĐH Bách Khoa, ĐH Kinh Tế..."
                                            value={school}
                                            onChange={(e) => setSchool(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="acct-field-row" style={{ marginTop: 12 }}>
                                    <div className="acct-field" style={{ flex: 1 }}>
                                        <label>Mã số sinh viên (MSSV) <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: HE187101, 2022001..."
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value)}
                                            required
                                        />
                                        <div className="acct-hint">Mã số in trên thẻ sinh viên của bạn.</div>
                                    </div>

                                    <div className="acct-field" style={{ flex: 1 }}>
                                        <label>Năm tốt nghiệp dự kiến <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select
                                            value={gradYear}
                                            onChange={(e) => setGradYear(Number(e.target.value))}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 14 }}
                                        >
                                            {GRAD_YEARS.map((y) => (
                                                <option key={y} value={y}>Năm {y}</option>
                                            ))}
                                        </select>
                                        <div className="acct-hint">Căn cứ để tính thời hạn hiệu lực thẻ sinh viên.</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="acct-field-row">
                                    <div className="acct-field" style={{ flex: 1 }}>
                                        <label>Tên pháp lý Doanh nghiệp <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: Công ty TNHH Sáng Tạo Mới"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="acct-field" style={{ flex: 1 }}>
                                        <label>Mã số thuế (MST)</label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: 0108899888"
                                            value={taxCode}
                                            onChange={(e) => setTaxCode(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Vùng tải tệp */}
                        <div style={{ marginTop: 16 }}>
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
                                    padding: '24px 16px',
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
                                    Định dạng JPG, PNG, WEBP, PDF (tối đa 3 tệp, tối đa 10MB/tệp)
                                </div>
                            </div>
                        </div>

                        {/* Danh sách ảnh xem trước */}
                        {previews.length > 0 && (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
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

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            {showReapplyForm && (
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setShowReapplyForm(false)}
                                    disabled={isSubmitting}
                                >
                                    Đóng biểu mẫu
                                </button>
                            )}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                                style={{ minWidth: 140, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                                        <span>Đang gửi hồ sơ...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="check" width="16" height="16" />
                                        <span>Gửi hồ sơ xét duyệt</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

// Main Component
export default function AccountSettings({ forcedTab }) {
    const { state, updateProfile, changePassword, logout } = useStore();
    const { currentUser, role } = state;
    const navigate = useNavigate();
    const location = useLocation();

    const userRole = (currentUser?.roleCode || role || 'student').toLowerCase();
    const isEmployer = userRole === 'employer' || userRole === 'recruiter' || userRole === 'business';

    const tabs = isEmployer
        ? [
            { id: 'profile', path: '/settings/profile', label: 'Thông tin Doanh nghiệp', icon: 'building' },
            { id: 'kyc', path: '/settings/kyc', label: 'Xác minh Doanh nghiệp', icon: 'shield-check' },
            { id: 'password', path: '/settings/password', label: 'Đổi mật khẩu', icon: 'key' },
        ]
        : [
            { id: 'profile', path: '/settings/profile', label: 'Thông tin Sinh viên', icon: 'graduation' },
            { id: 'kyc', path: '/settings/kyc', label: 'Xác minh Thẻ sinh viên', icon: 'shield-check' },
            { id: 'cv_manager', path: '/settings/cv', label: 'Quản lý CV & Hồ sơ', icon: 'file-text' },
            { id: 'password', path: '/settings/password', label: 'Đổi mật khẩu', icon: 'key' },
        ];

    const tab = useMemo(() => {
        if (forcedTab) return forcedTab;
        const p = location.pathname;
        if (p === '/settings/kyc' || p === '/account/kyc' || p === '/settings/verification') return 'kyc';
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
            updateProfile({ avatarUrl: newAvatarUrl }).catch(() => {});
        }
    };

    return (
        <div className="page active">
            <div className="acct-settings-layout">
                <div className="acct-sidebar">
                    <div className="acct-sidebar-head">
                        <h2>Cài đặt</h2>
                        <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon name={isEmployer ? 'building' : 'graduation'} width="12" height="12" />
                            {isEmployer ? 'Nhà tuyển dụng' : 'Sinh viên'}
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
                                <Icon name={t.icon} width="16" height="16" />
                                <span>{t.label}</span>
                            </button>
                        ))}
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

                        {tab === 'kyc' && (
                            <KycVerificationTab
                                isEmployer={isEmployer}
                                currentUser={safeUser}
                            />
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