import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import '../../styles/account-settings.css';

const PHONE_REGEX = /^0\d{9,10}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const TABS = [
    { id: 'profile', label: 'Hồ sơ' },
    { id: 'password', label: 'Mật khẩu' },
    { id: 'security', label: 'Bảo mật tài khoản' },
];

function ProfileTab({ currentUser, updateProfile }) {
    const [form, setForm] = useState({
        fullName: currentUser.fullName || '',
        phone: currentUser.phone || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = () => {
        setError('');
        if (!form.fullName.trim()) {
            setError('Vui lòng nhập họ và tên / tên công ty.');
            return;
        }
        if (form.phone && !PHONE_REGEX.test(form.phone)) {
            setError('Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng số 0.');
            return;
        }
        setSaving(true);
        updateProfile({ fullName: form.fullName.trim(), phone: form.phone || null });
        setSaving(false);
    };

    return (
        <>
            <h1 className="acct-content-title">Thông tin hồ sơ</h1>

            <div className="acct-section">
                <h3 className="acct-section-title">{currentUser.roleCode === 'employer' ? 'Tên công ty' : 'Tên'}</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>{currentUser.roleCode === 'employer' ? 'Tên công ty / doanh nghiệp' : 'Họ và tên'}</label>
                        <input
                            type="text"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="acct-section">
                <h3 className="acct-section-title">Liên hệ</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Email</label>
                        <input type="email" value={currentUser.email} disabled />
                        <div className="acct-hint">Không thể đổi email đã xác thực. Liên hệ hỗ trợ nếu cần thay đổi.</div>
                    </div>
                    <div className="acct-field">
                        <label>Số điện thoại</label>
                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={11}
                            placeholder="0xxxxxxxxx"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                        />
                    </div>
                </div>
            </div>

            {error && <div className="field-error acct-error">{error}</div>}

            <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
        </>
    );
}

function PasswordTab({ changePassword }) {
    const [form, setForm] = useState({ current: '', next: '', next2: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = async () => {
        setError('');
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
            setForm({ current: '', next: '', next2: '' });
        } catch (err) {
            setError(err.message || 'Đổi mật khẩu thất bại.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <h1 className="acct-content-title">Mật khẩu</h1>

            <div className="acct-section">
                <h3 className="acct-section-title">Đổi mật khẩu</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Mật khẩu hiện tại</label>
                        <input type="password" placeholder="••••••••" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
                    </div>
                </div>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Mật khẩu mới</label>
                        <input type="password" placeholder="Ít nhất 8 ký tự" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
                        <div className="acct-hint">Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</div>
                    </div>
                    <div className="acct-field">
                        <label>Xác nhận mật khẩu mới</label>
                        <input type="password" placeholder="Nhập lại mật khẩu mới" value={form.next2} onChange={(e) => setForm({ ...form, next2: e.target.value })} />
                    </div>
                </div>
            </div>

            {error && <div className="field-error acct-error">{error}</div>}

            <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </button>
        </>
    );
}

function SecurityTab({ currentUser, logout }) {
    return (
        <>
            <h1 className="acct-content-title">Bảo mật tài khoản</h1>

            <div className="acct-section">
                <h3 className="acct-section-title">Vai trò tài khoản</h3>
                <div className="acct-field-row">
                    <div className="acct-field">
                        <label>Loại tài khoản</label>
                        <input type="text" value={currentUser.roleCode === 'employer' ? 'Nhà tuyển dụng' : currentUser.roleCode === 'admin' ? 'Quản trị viên' : 'Sinh viên'} disabled />
                    </div>
                </div>
            </div>

            <div className="acct-section">
                <h3 className="acct-section-title">Phiên đăng nhập</h3>
                <p className="acct-section-desc">Đăng xuất khỏi thiết bị này nếu bạn nghi ngờ tài khoản bị truy cập trái phép.</p>
                <button className="btn btn-outline" onClick={logout}>Đăng xuất khỏi tài khoản</button>
            </div>
        </>
    );
}

export default function AccountSettings() {
    const { state, updateProfile, changePassword, logout } = useStore();
    const { currentUser } = state;
    const [tab, setTab] = useState('profile');

    if (!currentUser) return null;

    return (
        <div className="page active">
            <div className="acct-settings-layout">
                <div className="acct-sidebar">
                    <div className="acct-sidebar-head">
                        <h2>Cài đặt</h2>
                    </div>
                    <div className="acct-tablist">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                className={'acct-tab' + (tab === t.id ? ' is-active' : '')}
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="acct-content">
                    <div className="acct-content-inner">
                        {tab === 'profile' && <ProfileTab currentUser={currentUser} updateProfile={updateProfile} />}
                        {tab === 'password' && <PasswordTab changePassword={changePassword} />}
                        {tab === 'security' && <SecurityTab currentUser={currentUser} logout={logout} />}
                    </div>
                </div>
            </div>
        </div>
    );
}