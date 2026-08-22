import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import '../../styles/account-settings.css';

const PHONE_REGEX = /^0\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// ==========================================
// 1. EMPLOYER PROFILE TAB
// ==========================================
function EmployerProfileTab({ currentUser, updateProfile }) {
    const [form, setForm] = useState({
        fullName: currentUser.fullName || currentUser.companyName || '',
        representative: currentUser.representative || '',
        taxCode: currentUser.taxCode || '',
        industry: currentUser.industry || 'Truyền thông & Marketing',
        address: currentUser.address || '',
        website: currentUser.website || '',
        phone: currentUser.phone || '',
        bio: currentUser.bio || '',
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
            bio: form.bio.trim(),
        });
        setSaving(false);
    };

    return (
        <>
            <h1 className="acct-content-title">Hồ sơ Doanh nghiệp</h1>

            <div className="acct-section">
                <h3 className="acct-section-title">Thông tin Công ty / Doanh nghiệp</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Tên công ty / Doanh nghiệp <span style={{ color: 'var(--coral)' }}>*</span></label>
                        <input
                            type="text"
                            placeholder="Ví dụ: Công ty TNHH Giải Pháp Sáng Tạo SkillBridge"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        />
                    </div>
                    <div className="acct-field">
                        <label>Người đại diện / Người liên hệ</label>
                        <input
                            type="text"
                            placeholder="Họ tên người phụ trách tuyển dụng"
                            value={form.representative}
                            onChange={(e) => setForm({ ...form, representative: e.target.value })}
                        />
                    </div>
                </div>

                <div className="acct-field-row" style={{ marginTop: 12 }}>
                    <div className="acct-field">
                        <label>Mã số thuế / Giấy phép ĐKKD</label>
                        <input
                            type="text"
                            placeholder="0312345678"
                            value={form.taxCode}
                            onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                        />
                    </div>
                    <div className="acct-field">
                        <label>Lĩnh vực hoạt động</label>
                        <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                            <option value="Truyền thông & Marketing">Truyền thông & Marketing</option>
                            <option value="Công nghệ thông tin">Công nghệ thông tin & Phần mềm</option>
                            <option value="Thiết kế sáng tạo & Video">Thiết kế sáng tạo & Video</option>
                            <option value="Thương mại điện tử & Bán lẻ">Thương mại điện tử & Bán lẻ</option>
                            <option value="Giáo dục & Đào tạo">Giáo dục & Đào tạo</option>
                            <option value="Dịch vụ & F&B">Dịch vụ & F&B</option>
                            <option value="Khác">Lĩnh vực khác</option>
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
                    <div className="acct-field">
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
function StudentProfileTab({ currentUser, updateProfile }) {
    const [form, setForm] = useState({
        fullName: currentUser.fullName || '',
        school: currentUser.school || '',
        major: currentUser.major || '',
        academicYear: currentUser.academicYear || '',
        phone: currentUser.phone || '',
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
            major: form.major.trim(),
            academicYear: form.academicYear.trim(),
            phone: form.phone || null,
            bio: form.bio.trim(),
        });
        setSaving(false);
    };

    return (
        <>
            <h1 className="acct-content-title">Hồ sơ Sinh viên</h1>

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
                            placeholder="Ví dụ: Đại học FPT TP.HCM"
                            value={form.school}
                            onChange={(e) => setForm({ ...form, school: e.target.value })}
                        />
                    </div>
                </div>

                <div className="acct-field-row" style={{ marginTop: 12 }}>
                    <div className="acct-field">
                        <label>Chuyên ngành học</label>
                        <input
                            type="text"
                            placeholder="Ví dụ: Thiết kế đồ họa / Kỹ thuật phần mềm"
                            value={form.major}
                            onChange={(e) => setForm({ ...form, major: e.target.value })}
                        />
                    </div>
                    <div className="acct-field">
                        <label>Khóa học / Năm sinh</label>
                        <input
                            type="text"
                            placeholder="Ví dụ: Khóa 2022 - 2026 (Năm 3)"
                            value={form.academicYear}
                            onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="acct-section">
                <h3 className="acct-section-title">Thông tin liên hệ</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Email trường đại học</label>
                        <input type="email" value={currentUser.email || ''} disabled />
                        <div className="acct-hint">Email trường dùng để xác thực eKYC sinh viên chính chủ.</div>
                    </div>
                    <div className="acct-field">
                        <label>Số điện thoại</label>
                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="0xxxxxxxxx"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                        />
                    </div>
                </div>
            </div>

            <div className="acct-section">
                <h3 className="acct-section-title">Giới thiệu bản thân & Mục tiêu</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Mô tả ngắn về kỹ năng, kinh nghiệm và điểm mạnh của bạn</label>
                        <textarea
                            rows={3}
                            placeholder="Mô tả kỹ năng thế mạnh, phong cách làm việc để nhà tuyển dụng tin tưởng lựa chọn..."
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {error && <div className="field-error acct-error">{error}</div>}

            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 6 }}>
                {saving ? 'Đang lưu...' : 'Lưu thông tin sinh viên'}
            </button>
        </>
    );
}

// ==========================================
// 3. NOTIFICATIONS TAB (Tailored by Role)
// ==========================================
function NotificationsTab({ isEmployer }) {
    const { showToast } = useToast();
    const [notifs, setNotifs] = useState({
        applicants: true,
        deliverable: true,
        escrow: true,
        messages: true,
        promos: true,
    });

    const toggle = (key) => setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

    const saveNotifs = () => {
        showToast('Đã lưu tùy chọn thông báo!', '✓');
    };

    return (
        <>
            <h1 className="acct-content-title">Cài đặt thông báo</h1>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
                Quản lý các loại thông báo bạn muốn nhận qua Email và hệ thống SkillBridge.
            </p>

            <div className="pcard" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {isEmployer ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <b>👥 Hồ sơ ứng tuyển mới</b>
                                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Nhận email ngay khi có sinh viên nộp hồ sơ vào tin tuyển dụng của bạn.</p>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={notifs.applicants} onChange={() => toggle('applicants')} />
                                <span className="switch-track" />
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <b>📤 Sản phẩm bàn giao cần nghiệm thu</b>
                                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Thông báo khi sinh viên nộp bài hoặc nộp lại bản sửa đổi.</p>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={notifs.deliverable} onChange={() => toggle('deliverable')} />
                                <span className="switch-track" />
                            </label>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <b>🎯 Việc làm mới phù hợp</b>
                                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Gợi ý công việc micro-job mới đúng với chuyên ngành và kỹ năng của bạn.</p>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={notifs.applicants} onChange={() => toggle('applicants')} />
                                <span className="switch-track" />
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <b>🎉 Kết quả ứng tuyển & Được chọn làm việc</b>
                                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Thông báo tức thì khi nhà tuyển dụng chấp nhận thuê bạn vào dự án.</p>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={notifs.deliverable} onChange={() => toggle('deliverable')} />
                                <span className="switch-track" />
                            </label>
                        </div>
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <b>💰 Giao dịch Ví & Giải ngân Ký quỹ Escrow</b>
                        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Thông báo biến động số dư ví khi nạp tiền, hoàn tiền hoặc nhận thanh toán.</p>
                    </div>
                    <label className="switch">
                        <input type="checkbox" checked={notifs.escrow} onChange={() => toggle('escrow')} />
                        <span className="switch-track" />
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <b>💬 Tin nhắn trao đổi trực tiếp</b>
                        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Thông báo khi đối tác gửi tin nhắn trao đổi về công việc.</p>
                    </div>
                    <label className="switch">
                        <input type="checkbox" checked={notifs.messages} onChange={() => toggle('messages')} />
                        <span className="switch-track" />
                    </label>
                </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={saveNotifs}>
                Lưu cài đặt thông báo
            </button>
        </>
    );
}

// ==========================================
// 4. SOCIALS & PORTFOLIO LINKS (Student Only)
// ==========================================
function StudentSocialsTab() {
    const { showToast } = useToast();
    const [links, setLinks] = useState({
        behance: 'https://behance.net/student-portfolio',
        github: 'https://github.com/student-dev',
        linkedin: 'https://linkedin.com/in/student-profile',
        tiktok: '',
    });

    const saveLinks = () => {
        showToast('Đã lưu liên kết mạng xã hội & Portfolio!', '🔗');
    };

    return (
        <>
            <h1 className="acct-content-title">Liên kết Mạng xã hội & Portfolio</h1>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
                Gắn các liên kết sản phẩm bên ngoài để nhà tuyển dụng đánh giá năng lực dễ dàng hơn.
            </p>

            <div className="acct-section">
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>🎨 Behance / Dribbble Portfolio</label>
                        <input
                            type="url"
                            value={links.behance}
                            onChange={(e) => setLinks({ ...links, behance: e.target.value })}
                            placeholder="https://behance.net/..."
                        />
                    </div>
                    <div className="acct-field">
                        <label>💻 GitHub Profile (Nếu là lập trình viên)</label>
                        <input
                            type="url"
                            value={links.github}
                            onChange={(e) => setLinks({ ...links, github: e.target.value })}
                            placeholder="https://github.com/..."
                        />
                    </div>
                </div>

                <div className="acct-field-row" style={{ marginTop: 12 }}>
                    <div className="acct-field">
                        <label>💼 LinkedIn</label>
                        <input
                            type="url"
                            value={links.linkedin}
                            onChange={(e) => setLinks({ ...links, linkedin: e.target.value })}
                            placeholder="https://linkedin.com/in/..."
                        />
                    </div>
                    <div className="acct-field">
                        <label>🎬 TikTok Channel / Kênh sáng tạo</label>
                        <input
                            type="url"
                            value={links.tiktok}
                            onChange={(e) => setLinks({ ...links, tiktok: e.target.value })}
                            placeholder="https://tiktok.com/@..."
                        />
                    </div>
                </div>
            </div>

            <button className="btn btn-primary" onClick={saveLinks} style={{ marginTop: 6 }}>
                Lưu liên kết mạng xã hội
            </button>
        </>
    );
}

// ==========================================
// 5. PASSWORD TAB
// ==========================================
function PasswordTab({ changePassword, logout }) {
    const [form, setForm] = useState({ current: '', next: '', next2: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const save = async () => {
        setError('');
        setSuccess('');
        if (!form.current || !form.next || !form.next2) {
            setError('Vui lòng điền đầy đủ các trường mật khẩu.');
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
            {success && <div style={{ color: 'var(--lime)', marginBottom: 16, fontSize: 13 }}>{success}</div>}

            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 6 }}>
                {saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
        </>
    );
}

// ==========================================
// MAIN COMPONENT (ROLES-AWARE)
// ==========================================
export default function AccountSettings() {
    const { state, updateProfile, changePassword, logout } = useStore();
    const { currentUser, role } = state;

    // Detect actual role normalized (Employer vs Student)
    const userRole = (currentUser?.roleCode || role || 'student').toLowerCase();
    const isEmployer = userRole === 'employer' || userRole === 'recruiter' || userRole === 'business';

    // Tabs dynamically tailored strictly to the user's role
    const tabs = isEmployer
        ? [
            { id: 'profile', label: 'Thông tin Doanh nghiệp', icon: '🏢' },
            { id: 'notifications', label: 'Cài đặt thông báo', icon: '🔔' },
            { id: 'password', label: 'Đổi mật khẩu', icon: '🔑' },
        ]
        : [
            { id: 'profile', label: 'Thông tin Sinh viên', icon: '🎓' },
            { id: 'socials', label: 'Portfolio & Mạng xã hội', icon: '🔗' },
            { id: 'notifications', label: 'Cài đặt thông báo', icon: '🔔' },
            { id: 'password', label: 'Đổi mật khẩu', icon: '🔑' },
        ];

    const [tab, setTab] = useState('profile');

    const safeUser = currentUser || {
        fullName: isEmployer ? 'Công ty TNHH Sáng Tạo Mới' : 'Nguyễn Văn Năng',
        email: 'user@skillbridge.vn',
        phone: '',
        roleCode: isEmployer ? 'employer' : 'student',
    };

    return (
        <div className="page active">
            <div className="acct-settings-layout">
                <div className="acct-sidebar">
                    <div className="acct-sidebar-head">
                        <h2>Cài đặt</h2>
                        <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px' }}>
                            {isEmployer ? '🏢 Nhà tuyển dụng' : '🎓 Sinh viên'}
                        </span>
                    </div>

                    <div className="acct-tablist">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                className={'acct-tab' + (tab === t.id ? ' is-active' : '')}
                                onClick={() => setTab(t.id)}
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
                            style={{ color: 'var(--coral)', borderColor: 'var(--coral)', fontSize: 13 }}
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
                                />
                            ) : (
                                <StudentProfileTab
                                    currentUser={safeUser}
                                    updateProfile={updateProfile}
                                />
                            )
                        )}

                        {tab === 'socials' && !isEmployer && (
                            <StudentSocialsTab />
                        )}

                        {tab === 'notifications' && (
                            <NotificationsTab isEmployer={isEmployer} />
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