import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';
import { useStore, fmtVND } from '../context/StoreContext';

export default function TopNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { state, markAllNotifRead, markNotifRead } = useStore();
  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const navigate = useNavigate();
  const notifWrapRef = useRef(null);

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

  const linkClass = ({ isActive }) => 'navlink' + (isActive ? ' is-active' : '');

  const handleNotifClick = (n) => {
    if (!n.read) markNotifRead(n.id);
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <nav className="topnav">
      <div className="wrap">
        <NavLink to="/" className="logo">
          <span className="logo-mark">S</span> SkillBridge
        </NavLink>

        <div className={'navlinks' + (navOpen ? ' open' : '')} id="navlinks">
          <NavLink to="/" className={linkClass} end onClick={() => setNavOpen(false)}>Trang chủ</NavLink>
          <NavLink to="/jobs" className={linkClass} onClick={() => setNavOpen(false)}>Tìm việc</NavLink>
          <NavLink to="/mywork" className={linkClass} onClick={() => setNavOpen(false)}>Việc của tôi</NavLink>
          <NavLink to="/dashboard" className={linkClass} onClick={() => setNavOpen(false)}>Dashboard NTD</NavLink>
          <div className={'nav-more' + (moreOpen ? ' open' : '')}>
            <button
              className="navlink nav-more-trigger"
              onClick={() => setMoreOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={moreOpen}
            >
              Thêm <span className="nav-more-caret">▾</span>
            </button>
            <div className={'nav-more-panel' + (moreOpen ? ' open' : '')}>
              <NavLink to="/wallet" className="nav-more-link" onClick={() => { setMoreOpen(false); setNavOpen(false); }}>Ví của tôi</NavLink>
              <NavLink to="/profile" className="nav-more-link" onClick={() => { setMoreOpen(false); setNavOpen(false); }}>Hồ sơ</NavLink>
              <NavLink to="/pricing" className="nav-more-link" onClick={() => { setMoreOpen(false); setNavOpen(false); }}>Bảng giá</NavLink>
              <NavLink to="/admin" className="nav-more-link" onClick={() => { setMoreOpen(false); setNavOpen(false); }}>Bảng điều khiển Admin</NavLink>
            </div>
          </div>

          <div className="nav-drop-actions">
            <button className="btn btn-outline btn-sm" onClick={() => { navigate('/post-job'); setNavOpen(false); }}>
              Đăng tin tuyển dụng
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => { navigate('/auth?tab=login'); setNavOpen(false); }}>
              Đăng nhập
            </button>
          </div>

          <div className="nav-mobile-extra">
            <button className="wallet-pill" onClick={() => { navigate('/wallet'); setNavOpen(false); }}>
              <Icon name="wallet" /> <span>Ví: {fmtVND(state.balance)}</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { navigate('/auth?tab=register'); setNavOpen(false); }}>Đăng ký miễn phí</button>
          </div>
        </div>

        <div className="nav-cta">
          <button className="wallet-pill" onClick={() => navigate('/wallet')} title="Số dư ví SkillBridge">
            <Icon name="wallet" /> <span>{fmtVND(state.balance)}</span>
          </button>

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

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            title="Đổi giao diện sáng/tối"
          >
            {theme === 'dark' ? <Icon name="moon" /> : <Icon name="sun" />}
          </button>
          <button className="btn btn-ghost btn-sm btn-post" onClick={() => navigate('/post-job')}>
            Đăng tin tuyển dụng
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth?tab=login')}>Đăng nhập</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth?tab=register')}>
            Đăng ký miễn phí
          </button>
          <button className="navtoggle" onClick={() => setNavOpen((o) => !o)} aria-label="Mở menu">
            <Icon name="menu" />
          </button>
        </div>
      </div>
    </nav>
  );
}
