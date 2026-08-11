import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { useStore } from '../context/StoreContext';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'login');
  const [role, setRole] = useState('student');
  const navigate = useNavigate();
  const { login: doLogin } = useStore();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', password2: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [companyFile, setCompanyFile] = useState(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
  }, [searchParams]);

  const handleLogin = () => {
    if (!loginForm.email || !loginForm.password) {
      alert('Vui lòng nhập email và mật khẩu.');
      return;
    }
    doLogin('student', loginForm.email.split('@')[0]);
    navigate('/');
  };

  const handleRegister = () => {
    if (!regForm.name || !regForm.email || !regForm.password) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    if (regForm.password !== regForm.password2) {
      alert('Mật khẩu xác nhận không khớp.');
      return;
    }
    doLogin(role, regForm.name);
    navigate('/');
  };

  const handleForgot = () => {
    if (!forgotEmail) {
      alert('Vui lòng nhập email.');
      return;
    }
    alert(`(Demo) Đã gửi link đặt lại mật khẩu tới ${forgotEmail}`);
    setTab('login');
  };

  return (
    <div className="page active">
      <div className="auth-shell">
        <div className="auth-side">
          <div>
            <a href="#" className="logo" style={{ color: '#fff' }} onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              <span className="logo-mark">S</span> SkillBridge
            </a>
          </div>

          <div className="auth-side-mid">
            <div className="auth-eyebrow"><span className="dot" /> Dành riêng cho sinh viên Việt Nam</div>
            <h1 className="auth-headline">Việc làm thật.<br />Thu nhập <span>thật</span>.</h1>
            <p className="auth-sub">Micro-job ngắn hạn, xác thực bằng email trường, ghép việc trong dưới 15 phút — không cần kinh nghiệm dày dạn để bắt đầu.</p>

            <div className="auth-stats-row">
              <div className="auth-stat"><b>71.4%</b><span>tìm việc qua Facebook Group trước khi biết SkillBridge</span></div>
              <div className="auth-stat"><b>&lt;15 phút</b><span>thời gian ghép việc trung bình</span></div>
              <div className="auth-stat"><b>88.8%</b><span>sinh viên sẵn sàng nâng cấp Premium</span></div>
            </div>

            <div className="auth-live-stack" aria-hidden="true">
              <div className="auth-live-card c1">
                <Avatar name="Trà Sữa Mộc" className="alc-av" fontSize={13} />
                <div className="alc-main"><b>Trà Sữa Mộc</b><span>vừa đăng tin · 2 phút trước</span></div>
                <div className="alc-price">250K</div>
              </div>
              <div className="auth-live-card c2">
                <Avatar name="Minh Anh" className="alc-av" fontSize={13} />
                <div className="alc-main"><b>Minh Anh</b><span>vừa được thuê · Video Editing</span></div>
                <div className="alc-price">🎉</div>
              </div>
            </div>
          </div>

          <div>
            <div className="auth-quote">
              "Chỉ trong <span>3 ngày</span> đăng ký, mình đã nhận công việc dựng video đầu tiên và có bài trong portfolio."
            </div>
            <div className="auth-person">
              <Avatar name="Thu Hà" className="av" fontSize={16} />
              <div><b>Thu Hà</b><span>Sinh viên FPT University</span></div>
            </div>
          </div>
        </div>
        <div className="auth-form-col">
          <div className="auth-box">
            <a href="#" className="back-home" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              <Icon name="chevleft" style={{ width: 14, height: 14 }} /> Về trang chủ
            </a>
            <div className="auth-mobile-trust">
              🎓 <span><b>Xác thực qua email trường</b> · Ghép việc dưới 15 phút · Bảo vệ bởi Quỹ Bảo hiểm Tương hỗ</span>
            </div>
            <div className="auth-tabs">
              <button className={'auth-tab' + (tab === 'login' ? ' is-active' : '')} onClick={() => setTab('login')}>Đăng nhập</button>
              <button className={'auth-tab' + (tab === 'register' ? ' is-active' : '')} onClick={() => setTab('register')}>Đăng ký</button>
            </div>

            {tab === 'login' && (
              <div className="auth-form is-active">
                <h2>Chào bạn quay lại</h2>
                <div className="sub">Đăng nhập để tiếp tục tìm việc hoặc đăng tin.</div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" placeholder="ban@fpt.edu.vn" value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
                </div>
                <div className="field">
                  <label>Mật khẩu</label>
                  <input type="password" placeholder="••••••••" value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                </div>
                <div className="auth-link-row">
                  <a href="#" onClick={(e) => { e.preventDefault(); setTab('forgot'); }}>Quên mật khẩu?</a>
                </div>
                <button className="btn btn-primary btn-block" onClick={handleLogin}>Đăng nhập</button>
                <div className="auth-foot">Chưa có tài khoản? <a onClick={() => setTab('register')}>Đăng ký ngay</a></div>
              </div>
            )}

            {tab === 'register' && (
              <div className="auth-form is-active">
                <h2>Tạo tài khoản mới</h2>
                <div className="sub">Chọn vai trò để bắt đầu hành trình trên SkillBridge.</div>
                <div className="role-toggle">
                  <button type="button" className={'role-opt' + (role === 'student' ? ' is-active' : '')} onClick={() => setRole('student')}>
                    🎓 Sinh viên
                  </button>
                  <button type="button" className={'role-opt' + (role === 'employer' ? ' is-active' : '')} onClick={() => setRole('employer')}>
                    🏢 Nhà tuyển dụng
                  </button>
                </div>
                <div className="field">
                  <label>Họ và tên</label>
                  <input type="text" placeholder="Nguyễn Văn A" value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} />
                </div>
                {role === 'student' ? (
                  <div className="field">
                    <label>Email đại học</label>
                    <input type="email" placeholder="ban@fpt.edu.vn" value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
                    <div className="hint">Dùng để xác thực tự động, chỉ hiển thị nội bộ.</div>
                  </div>
                ) : (
                  <div className="field">
                    <label>Email công ty</label>
                    <input type="email" placeholder="hr@congty.vn" value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
                    <div className="hint">Dùng email công ty chính thức để xác minh doanh nghiệp.</div>
                  </div>
                )}
                <div className="field">
                  <label>Mật khẩu</label>
                  <input type="password" placeholder="Tối thiểu 8 ký tự" value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
                </div>
                <div className="field">
                  <label>Xác nhận mật khẩu</label>
                  <input type="password" placeholder="Nhập lại mật khẩu" value={regForm.password2}
                    onChange={(e) => setRegForm({ ...regForm, password2: e.target.value })} />
                </div>
                {role === 'student' ? (
                  <div className="field">
                    <label>CV / hồ sơ (tuỳ chọn)</label>
                    <div className="upload-zone">
                      <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setCvFile(e.target.files[0])} />
                      <div className="uz-ic">📄</div>
                      <b>Kéo thả hoặc bấm để tải CV</b>
                      <span>PDF, DOC, DOCX hoặc ảnh · tối đa 5MB (demo)</span>
                    </div>
                    {cvFile && <div className="file-chip-row"><span className="chip">{cvFile.name}</span></div>}
                  </div>
                ) : (
                  <div className="field">
                    <label>Giấy tờ / hồ sơ công ty (tuỳ chọn)</label>
                    <div className="upload-zone">
                      <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setCompanyFile(e.target.files[0])} />
                      <div className="uz-ic">🏢</div>
                      <b>Tải GPKD / logo / brochure</b>
                      <span>PDF hoặc ảnh · dùng để xác minh nhà tuyển dụng (demo)</span>
                    </div>
                    {companyFile && <div className="file-chip-row"><span className="chip">{companyFile.name}</span></div>}
                  </div>
                )}
                <button className="btn btn-primary btn-block" onClick={handleRegister}>Tạo tài khoản</button>
                <div className="auth-foot">Đã có tài khoản? <a onClick={() => setTab('login')}>Đăng nhập</a></div>
              </div>
            )}

            {tab === 'forgot' && (
              <div className="auth-form is-active">
                <h2>Quên mật khẩu</h2>
                <div className="sub">Nhập email đã đăng ký — chúng tôi sẽ gửi link đặt lại mật khẩu (mô phỏng demo).</div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" placeholder="ban@fpt.edu.vn" value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-block" onClick={handleForgot}>Gửi link đặt lại</button>
                <div className="auth-foot"><a onClick={() => setTab('login')}>← Quay lại đăng nhập</a></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
