import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Avatar from './Avatar';
import { useTheme } from '../context/ThemeContext';
import { useStore, fmtVND } from '../context/StoreContext';

export default function TopNav() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { state, markAllNotifRead, markNotifRead, logout } = useStore();
  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const unreadMsgCount = (state.conversations || []).reduce((sum, c) => sum + c.unread, 0);
  const navigate = useNavigate();
  const notifWrapRef = useRef(null);
  const userMenuWrapRef = useRef(null);
  const userMenuCloseTimer = useRef(null);
  const isLoggedIn = !!state.currentUser;
  const isStudent = state.currentUser?.roleCode === 'student';
  const isEmployer = state.currentUser?.roleCode === 'employer';

  useEffect(() => {
    if (!notifOpen) return;
    const onClickOutside = (e) => {
      if (notifWrapRef.current && !notifWrapRef.current.contains(e.target)) setNotifOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [notifOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClickOutside = (e) => {
      if (userMenuWrapRef.current && !userMenuWrapRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [userMenuOpen]);

  const openUserMenu = () => {
    if (userMenuCloseTimer.current) clearTimeout(userMenuCloseTimer.current);
    setUserMenuOpen(true);
  };
  const scheduleCloseUserMenu = () => {
    userMenuCloseTimer.current = setTimeout(() => setUserMenuOpen(false), 150);
  };

  const linkClass = ({ isActive }) => 'navlink' + (isActive ? ' is-active' : '');

  const handleNotifClick = (n) => {
    if (!n.read) markNotifRead(n.id);
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleLogout = () => {
    logout();
    setNavOpen(false);
    setUserMenuOpen(false);
    navigate('/');
  };

  const goFromUserMenu = (path) => {
    setUserMenuOpen(false);
    setNavOpen(false);
    navigate(path);
  };

  return (
    <nav className="topnav">
      <div className="wrap">
        <NavLink to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="SkillBridge Logo"
            style={{ height: 36, width: 'auto', borderRadius: 8, objectFit: 'contain' }}
          />
          <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: -0.4, color: 'var(--ink)' }}>
            SkillBridge
          </span>
        </NavLink>

        <div className={'navlinks' + (navOpen ? ' open' : '')} id="navlinks">
          {/* User Profile Card on Mobile if logged in */}
          {isLoggedIn && (
            <div className="nav-mobile-only">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  marginBottom: 10,
                  borderRadius: 12,
                  background: 'var(--surface-2, #f1f5f9)',
                  border: '1px solid var(--border, #e2e8f0)',
                  cursor: 'pointer'
                }}
                onClick={() => { navigate('/profile'); setNavOpen(false); }}
              >
                <Avatar
                  src={state.currentUser.avatarUrl}
                  name={state.currentUser.fullName}
                  fontSize={15}
                  style={{ width: 40, height: 40, borderRadius: '50%' }}
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{state.currentUser.fullName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                    {isStudent ? '🎓 Sinh viên Freelancer' : (isEmployer ? '🏢 Nhà tuyển dụng' : '🛡️ Quản trị viên')}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>Hồ sơ ➔</span>
              </div>
            </div>
          )}

          <NavLink to="/" className={linkClass} end onClick={() => setNavOpen(false)}>Trang chủ</NavLink>
          <NavLink to="/jobs" className={linkClass} onClick={() => setNavOpen(false)}>Tìm việc</NavLink>
          {isStudent && (
            <NavLink to="/mywork" className={linkClass} onClick={() => setNavOpen(false)}>Việc của tôi</NavLink>
          )}
          {isEmployer && (
            <NavLink to="/employer/dashboard" className={linkClass} onClick={() => setNavOpen(false)}>Dashboard NTD</NavLink>
          )}
          <NavLink to="/pricing" className={linkClass} onClick={() => setNavOpen(false)}>Bảng giá</NavLink>

          {isLoggedIn && (
            <div className="nav-mobile-only">
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
              <NavLink to="/profile" className={linkClass} onClick={() => setNavOpen(false)}>👤 Hồ sơ của tôi</NavLink>
              <NavLink to="/wallet" className={linkClass} onClick={() => setNavOpen(false)}>👛 Ví của tôi ({fmtVND(state.balance)})</NavLink>
              <NavLink to="/messages" className={linkClass} onClick={() => setNavOpen(false)}>💬 Tin nhắn {unreadMsgCount > 0 ? `(${unreadMsgCount})` : ''}</NavLink>
              {state.currentUser?.roleCode === 'admin' && (
                <NavLink to="/admin" className={linkClass} onClick={() => setNavOpen(false)}>⚙️ Bảng điều khiển Admin</NavLink>
              )}
              <NavLink to="/account-settings" className={linkClass} onClick={() => setNavOpen(false)}>⚙️ Cài đặt tài khoản</NavLink>
            </div>
          )}

          <div className="nav-drop-actions">
            {isLoggedIn ? (
              <button className="btn btn-outline btn-sm" style={{ width: '100%', color: 'var(--danger, #e5484d)', borderColor: 'var(--danger, #e5484d)', marginTop: 8 }} onClick={handleLogout}>
                🚪 Đăng xuất
              </button>
            ) : (
              <>
                <button className="btn btn-outline btn-sm" onClick={() => { navigate('/employer/post-job'); setNavOpen(false); }}>
                  Đăng tin tuyển dụng
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => { navigate('/auth?tab=login'); setNavOpen(false); }}>
                  Đăng nhập
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { navigate('/auth?tab=register'); setNavOpen(false); }}>
                  Đăng ký miễn phí
                </button>
              </>
            )}
          </div>
        </div>

        <div className="nav-cta">
          {isLoggedIn && (
            <button className="wallet-pill" onClick={() => navigate('/wallet')} title="Số dư ví SkillBridge">
              <Icon name="wallet" /> <span>{fmtVND(state.balance)}</span>
            </button>
          )}

          {isLoggedIn && (
            <button className="nav-icon-btn" onClick={() => navigate('/messages')} aria-label="Tin nhắn" title="Tin nhắn">
              💬
              {unreadMsgCount > 0 && <span className="notif-dot">{unreadMsgCount}</span>}
            </button>
          )}

          {isLoggedIn && (
            <div className="notif-wrap" ref={notifWrapRef}>
              <button className="nav-icon-btn" onClick={() => setNotifOpen((o) => !o)} aria-label="Thông báo" title="Thông báo"
                aria-haspopup="true" aria-expanded={notifOpen}>
                <Icon name="bell" />
                {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
              </button>

              <div className={'notif-panel' + (notifOpen ? ' open' : '')}>
                <div className="notif-panel-head">
                  <h4>Thông báo</h4>
                  <button onClick={markAllNotifRead}>Đánh dấu đã đọc</button>
                </div>
                <div>
                  {state.notifications.length === 0 ? (
                    <div className="adm-empty">Không có thông báo.</div>
                  ) : (
                    state.notifications.map((n) => (
                      <div key={n.id} className={'notif-item' + (n.read ? '' : ' unread')}
                        role="button" tabIndex={0}
                        onClick={() => handleNotifClick(n)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleNotifClick(n); }}>
                        <div className="notif-ic">{n.icon}</div>
                        <div className="notif-txt"><p>{n.text}</p><span>{n.time}</span></div>
                        {n.link && <Icon name="chevright" className="notif-chev" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            title="Đổi giao diện sáng/tối"
          >
            {theme === 'dark' ? <Icon name="moon" /> : <Icon name="sun" />}
          </button>

          {isLoggedIn ? (
            <>
              <div
                className="nav-more user-menu"
                ref={userMenuWrapRef}
                onMouseEnter={openUserMenu}
                onMouseLeave={scheduleCloseUserMenu}
              >
                <button
                  className={'btn btn-ghost btn-sm nav-more-trigger' + (userMenuOpen ? ' is-active' : '')}
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar
                    src={state.currentUser.avatarUrl}
                    name={state.currentUser.fullName}
                    fontSize={12}
                    style={{ width: 24, height: 24, borderRadius: '50%' }}
                  />
                  Xin chào, {state.currentUser.fullName} <span className="nav-more-caret">▾</span>
                </button>
                <div
                  className={'nav-more-panel' + (userMenuOpen ? ' open' : '')}
                  style={{ left: 'auto', right: 0, minWidth: 220 }}
                >
                  <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar
                      src={state.currentUser.avatarUrl}
                      name={state.currentUser.fullName}
                      fontSize={14}
                      style={{ width: 34, height: 34, borderRadius: '50%' }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{state.currentUser.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted, #888)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{state.currentUser.email}</div>
                    </div>
                  </div>
                  <NavLink to="/profile" className="nav-more-link" onClick={() => goFromUserMenu('/profile')}>👤 Hồ sơ của tôi</NavLink>
                  <NavLink to="/wallet" className="nav-more-link" onClick={() => goFromUserMenu('/wallet')}>👛 Ví của tôi</NavLink>
                  {isStudent && (
                    <NavLink to="/mywork" className="nav-more-link" onClick={() => goFromUserMenu('/mywork')}>💼 Việc của tôi</NavLink>
                  )}
                  {state.currentUser?.roleCode === 'admin' && (
                    <NavLink to="/admin" className="nav-more-link" onClick={() => goFromUserMenu('/admin')}>⚙️ Bảng điều khiển Admin</NavLink>
                  )}
                  <NavLink to="/account-settings" className="nav-more-link" onClick={() => goFromUserMenu('/account-settings')}>⚙️ Cài đặt tài khoản</NavLink>
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <button type="button" className="nav-more-link" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger, #e5484d)' }} onClick={handleLogout}>🚪 Đăng xuất</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm btn-post" onClick={() => navigate('/employer/post-job')}>
                Đăng tin tuyển dụng
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth?tab=login')}>Đăng nhập</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth?tab=register')}>
                Đăng ký miễn phí
              </button>
            </>
          )}

          <button className="navtoggle" onClick={() => setNavOpen((o) => !o)} aria-label="Mở menu">
            <Icon name="menu" />
          </button>
        </div>
      </div>
    </nav>
  );
}