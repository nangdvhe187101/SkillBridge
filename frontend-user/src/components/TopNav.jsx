import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';
import Avatar from './Avatar';
import { useTheme } from '../context/ThemeContext';
import { useStore, fmtVND } from '../context/StoreContext';
import UserTierBadge from './common/UserTierBadge';

export default function TopNav() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { state, markAllNotifRead, markNotifRead, refreshNotifications, logout } = useStore();
  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const unreadMsgCount = (state.conversations || []).reduce((sum, c) => sum + c.unread, 0);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'contract' | 'finance' | 'unread'
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onEsc = (e) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [navOpen]);

  const filteredNotifs = useMemo(() => {
    return (state.notifications || []).filter((n) => {
      if (notifFilter === 'unread') return !n.read;
      const isFinance = ['wallet', 'card', 'money'].includes(n.icon) || /(nạp|rút|tiền|ký quỹ|escrow|bồi thường|thanh toán|số dư)/i.test(n.text);
      if (notifFilter === 'finance') return isFinance;
      const isContract = ['star', 'clock', 'shield', 'check', 'file'].includes(n.icon) || /(bàn giao|sửa đổi|khiếu nại|gia hạn|ứng tuyển|tuyển dụng|hợp đồng|nghiệm thu|đánh giá)/i.test(n.text);
      if (notifFilter === 'contract') return isContract;
      return true;
    });
  }, [state.notifications, notifFilter]);
  const notifWrapRef = useRef(null);
  const userMenuWrapRef = useRef(null);
  const userMenuCloseTimer = useRef(null);
  const isLoggedIn = !!state.currentUser;
  const isStudent = state.currentUser?.roleCode === 'student';
  const isEmployer = state.currentUser?.roleCode === 'employer';
  const userPlanCode = state.activePlanCode || (state.vipBusiness ? 'EMP_VIP' : (state.subscriptionPro ? 'STU_PRO' : 'FREE'));

  useEffect(() => {
    if (!notifOpen) return;
    refreshNotifications?.();
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
  }, [notifOpen, refreshNotifications]);

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
        <NavLink to="/" className="logo" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.png" alt="SkillBridge" className="nav-logo-img" width="150" height="40" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{state.currentUser.fullName}</span>
                    <UserTierBadge planCode={userPlanCode} userRole={state.currentUser?.roleCode} variant="icon-only" size="sm" />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name={isStudent ? 'graduation' : (isEmployer ? 'building' : 'shield-check')} width="12" height="12" />
                    <span>{isStudent ? 'Sinh viên Freelancer' : (isEmployer ? 'Nhà tuyển dụng' : 'Quản trị viên')}</span>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>Hồ sơ →</span>
              </div>
            </div>
          )}

          <NavLink to="/" className={linkClass} end onClick={() => setNavOpen(false)}>Trang chủ</NavLink>
          <NavLink to="/jobs" className={linkClass} onClick={() => setNavOpen(false)}>Tìm việc</NavLink>
          {!isStudent && (
            <NavLink to="/talents" className={linkClass} onClick={() => setNavOpen(false)}>Tìm sinh viên</NavLink>
          )}
          {isStudent && (
            <NavLink to="/mywork" className={linkClass} onClick={() => setNavOpen(false)}>Việc của tôi</NavLink>
          )}
          <NavLink to="/pricing" className={linkClass} onClick={() => setNavOpen(false)}>Bảng giá</NavLink>

          {isLoggedIn && (
            <div className="nav-mobile-only">
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
              {isEmployer && (
                <>
                  <NavLink to="/employer/post-job" className={linkClass} onClick={() => setNavOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 700 }}>
                    <Icon name="edit" width={15} height={15} /> Đăng tin tuyển dụng mới
                  </NavLink>
                  <NavLink to="/employer/jobs" className={linkClass} onClick={() => setNavOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="file-text" width={15} height={15} /> Tin tuyển dụng của tôi
                  </NavLink>
                </>
              )}
              <NavLink to="/profile" className={linkClass} onClick={() => setNavOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="users" width="15" height="15" /> Hồ sơ của tôi
              </NavLink>
              <NavLink to="/wallet" className={linkClass} onClick={() => setNavOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="wallet" width="15" height="15" /> Ví của tôi ({fmtVND(state.balance)})
              </NavLink>
              <NavLink to="/messages" className={linkClass} onClick={() => setNavOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="chat" width="15" height="15" /> Tin nhắn {unreadMsgCount > 0 ? `(${unreadMsgCount})` : ''}
              </NavLink>
              <NavLink to="/account-settings" className={linkClass} onClick={() => setNavOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="key" width="15" height="15" /> Cài đặt tài khoản
              </NavLink>
            </div>
          )}

          <div className="nav-drop-actions">
            {isLoggedIn ? (
              <button className="btn btn-outline btn-sm" style={{ width: '100%', color: 'var(--danger, #e5484d)', borderColor: 'var(--danger, #e5484d)', marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={handleLogout}>
                <Icon name="arrow-up-right" width="14" height="14" /> Đăng xuất
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => { navigate('/auth?tab=register'); setNavOpen(false); }}>
                  Đăng ký miễn phí
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => { navigate('/auth?tab=login'); setNavOpen(false); }}>
                  Đăng nhập
                </button>
                <button className="btn btn-subtle btn-sm" onClick={() => { navigate('/employer/post-job'); setNavOpen(false); }}>
                  Đăng tin tuyển dụng
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
              <Icon name="chat" />
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

              <div className={'notif-panel' + (notifOpen ? ' open' : '')} style={{ width: 360, maxWidth: '92vw' }}>
                <div className="notif-panel-head" style={{ padding: '12px 16px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Thông báo ({state.notifications.length})</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotifRead}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  {/* Category Filter Tabs */}
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'contract', label: 'Hợp đồng' },
                      { id: 'finance', label: 'Tài chính' },
                      { id: 'unread', label: `Chưa đọc (${unreadCount})` }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setNotifFilter(tab.id)}
                        style={{
                          fontSize: 11.5,
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: notifFilter === tab.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: notifFilter === tab.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)',
                          color: notifFilter === tab.id ? 'var(--primary)' : 'var(--ink-soft)',
                          fontWeight: notifFilter === tab.id ? 700 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {filteredNotifs.length === 0 ? (
                    <div className="adm-empty" style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                      Không có thông báo nào trong mục này.
                    </div>
                  ) : (
                    filteredNotifs.map((n) => {
                      const isFinance = ['wallet', 'card', 'money'].includes(n.icon) || /(nạp|rút|tiền|ký quỹ|escrow|bồi thường|thanh toán|số dư)/i.test(n.text);
                      const isStar = n.icon === 'star' || /(đánh giá|sao)/i.test(n.text);
                      const icColor = isFinance ? '#16a34a' : (isStar ? '#eab308' : 'var(--primary)');
                      const icBg = isFinance ? 'rgba(22, 163, 74, 0.12)' : (isStar ? 'rgba(234, 179, 8, 0.12)' : 'rgba(99, 102, 241, 0.12)');

                      return (
                        <div
                          key={n.id}
                          className={'notif-item' + (n.read ? '' : ' unread')}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotifClick(n)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleNotifClick(n); }}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            borderBottom: '1px solid var(--border)',
                            background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.04)',
                            cursor: 'pointer'
                          }}
                        >
                          <div
                            className="notif-ic"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: icBg,
                              color: icColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 2
                            }}
                          >
                            <Icon name={n.icon || 'bell'} style={{ width: 16, height: 16 }} />
                          </div>
                          <div className="notif-txt" style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ink)', lineHeight: 1.45, fontWeight: n.read ? 400 : 600 }}>
                              {n.text}
                            </p>
                            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{n.time}</span>
                          </div>
                          {n.link && <Icon name="chevright" className="notif-chev" style={{ width: 14, height: 14, color: 'var(--ink-soft)', marginTop: 8 }} />}
                        </div>
                      );
                    })
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
                >
                  <Avatar
                    src={state.currentUser.avatarUrl}
                    name={state.currentUser.fullName}
                    fontSize={12}
                    style={{ width: 26, height: 26, borderRadius: '50%' }}
                  />
                  <span style={{ fontWeight: 600 }}>{state.currentUser.fullName}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: isStudent ? 'rgba(16, 185, 129, 0.12)' : (isEmployer ? 'rgba(79, 70, 229, 0.12)' : 'rgba(100, 116, 139, 0.12)'),
                      color: isStudent ? '#059669' : (isEmployer ? 'var(--primary)' : '#475569'),
                      border: isStudent ? '1px solid rgba(16, 185, 129, 0.25)' : (isEmployer ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(100, 116, 139, 0.2)'),
                      lineHeight: 1.2
                    }}
                  >
                    {isStudent ? 'Sinh viên' : (isEmployer ? 'Nhà tuyển dụng' : 'Admin')}
                  </span>
                  <UserTierBadge planCode={userPlanCode} userRole={state.currentUser?.roleCode} variant="icon-only" size="sm" />
                  <span className="nav-more-caret">▾</span>
                </button>
                <div
                  className={'nav-more-panel' + (userMenuOpen ? ' open' : '')}
                  style={{ left: 'auto', right: 0, minWidth: 265 }}
                >
                  <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar
                      src={state.currentUser.avatarUrl}
                      name={state.currentUser.fullName}
                      fontSize={15}
                      style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }}
                    />
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {state.currentUser.fullName}
                      </div>
                      <div style={{ margin: '3px 0 4px' }}>
                        <UserTierBadge planCode={userPlanCode} userRole={state.currentUser?.roleCode} variant="pill" size="sm" expiresAt={state.subscriptionExpiresAt} onManageClick={() => goFromUserMenu('/pricing')} showPopover={false} />
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {state.currentUser.email}
                      </div>
                    </div>
                  </div>
                  <NavLink to="/profile" className="nav-more-link" onClick={() => goFromUserMenu('/profile')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="users" width="14" height="14" /> Hồ sơ của tôi
                  </NavLink>
                  <NavLink to="/wallet" className="nav-more-link" onClick={() => goFromUserMenu('/wallet')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="wallet" width="14" height="14" /> Ví của tôi
                  </NavLink>
                  {isStudent && (
                    <NavLink to="/mywork" className="nav-more-link" onClick={() => goFromUserMenu('/mywork')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="briefcase" width="14" height="14" /> Việc của tôi
                    </NavLink>
                  )}
                  {isEmployer && (
                    <>
                      <NavLink to="/employer/dashboard" className="nav-more-link" onClick={() => goFromUserMenu('/employer/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="chart-bar" width={14} height={14} /> Dashboard tuyển dụng
                      </NavLink>
                      <NavLink to="/employer/post-job" className="nav-more-link" onClick={() => goFromUserMenu('/employer/post-job')} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 600 }}>
                        <Icon name="edit" width={14} height={14} /> Đăng tin tuyển dụng mới
                      </NavLink>
                      <NavLink to="/employer/jobs" className="nav-more-link" onClick={() => goFromUserMenu('/employer/jobs')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="file-text" width={14} height={14} /> Quản lý tin đã đăng
                      </NavLink>
                    </>
                  )}
                  <NavLink to="/account-settings" className="nav-more-link" onClick={() => goFromUserMenu('/account-settings')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="key" width="14" height="14" /> Cài đặt tài khoản
                  </NavLink>
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <button type="button" className="nav-more-link" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger, #e5484d)', display: 'flex', alignItems: 'center', gap: 8 }} onClick={handleLogout}>
                    <Icon name="arrow-up-right" width="14" height="14" /> Đăng xuất
                  </button>
                </div>
              </div>

              {isEmployer && (
                <button
                  className="btn btn-primary btn-sm btn-nav-post-employer"
                  onClick={() => navigate('/employer/post-job')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: '6px 14px',
                    boxShadow: '0 2px 8px rgba(108, 76, 255, 0.28)'
                  }}
                  title="Đăng tin tuyển dụng mới"
                >
                  <Icon name="edit" width={14} height={14} />
                  <span>Đăng tin</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm btn-post" onClick={() => navigate('/employer/post-job')}>
                Đăng tin tuyển dụng
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth?tab=login')}>Đăng nhập</button>
              <button className="btn btn-primary btn-sm btn-nav-register" onClick={() => navigate('/auth?tab=register')}>
                Đăng ký miễn phí
              </button>
            </>
          )}

          <button
            type="button"
            className="navtoggle"
            onClick={(e) => {
              e.stopPropagation();
              setNavOpen((o) => !o);
            }}
            aria-label={navOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={navOpen}
            aria-controls="navlinks"
          >
            <Icon name={navOpen ? "x" : "menu"} />
          </button>
        </div>
      </div>
      {navOpen && (
        <div
          className="nav-backdrop"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}