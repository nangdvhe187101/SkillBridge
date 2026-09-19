import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import { useStore, fmtVND } from '../../context/StoreContext';
import ChatBubble from '../../components/messenger/ChatBubble';
import ChatComposer from '../../components/messenger/ChatComposer';
import ChatHeaderMenu from '../../components/messenger/ChatHeaderMenu';
import { downloadJobAttachment } from '../../utils/fileDownloader';
import '../../styles/messenger.css';

export default function Messages() {
    const { state, sendChatMessage, markConversationRead, toggleConvFlag, fetchConversationMessages, refreshConversations, acceptMessageRequest, declineMessageRequest } = useStore();
    const { conversations } = state;
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState('chat');
    const [search, setSearch] = useState('');
    const paramC = searchParams.get('c');
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
    const [activeId, setActiveId] = useState(() => {
        if (paramC) return Number(paramC) || paramC;
        if (typeof window !== 'undefined' && window.innerWidth <= 768) return null;
        return conversations[0]?.id || null;
    });
    const [menuOpen, setMenuOpen] = useState(false);
    const [showInfoDrawer, setShowInfoDrawer] = useState(() => typeof window !== 'undefined' && window.innerWidth > 768);
    const [showSafetyBanner, setShowSafetyBanner] = useState(true);
    const bodyRef = useRef(null);
    const menuWrapRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile && showInfoDrawer) {
                setShowInfoDrawer(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (paramC) {
            setActiveId(Number(paramC) || paramC);
        }
    }, [paramC]);

    useEffect(() => {
        if (!isMobile && !activeId && conversations.length > 0) {
            setActiveId(conversations[0].id);
        }
    }, [activeId, conversations, isMobile]);

    const active = conversations.find((c) => String(c.id) === String(activeId)) || null;

    useEffect(() => {
        if (activeId) {
            fetchConversationMessages(activeId);
            markConversationRead(activeId);
        }
    }, [activeId, fetchConversationMessages, markConversationRead]);

    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, [active?.messages?.length]);

    useEffect(() => {
        if (!menuOpen) return;
        const onClickOutside = (e) => {
            if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [menuOpen]);

    const handleSelectTab = (newTab) => {
        setTab(newTab);
        refreshConversations(newTab);
    };

    const filtered = conversations
        .filter((c) => !c.archived)
        .filter((c) => {
            if (tab === 'request') {
                return c.kind === 'request' || (c.requestStatus === 'pending' && !c.isRequestSender);
            }
            return c.kind !== 'request' && (c.requestStatus !== 'pending' || c.isRequestSender);
        })
        .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

    const lastPreview = (c) => {
        const msgs = c.messages || [];
        const m = msgs[msgs.length - 1];
        if (!m) return c.lastMessageText || '';
        if (m.type === 'file') return `📎 ${m.fileName || 'Tệp đính kèm'}`;
        if (m.type === 'voice') return `🎤 Tin nhắn thoại (${m.duration || ''})`;
        if (m.type === 'like') return '👍';
        return m.text;
    };

    // Shared files in current conversation (bao gồm tệp, hình ảnh, video, voice)
    const sharedFiles = (active?.messages || []).filter((m) =>
        Boolean(m.fileUrl || m.attachmentUrl || ['file', 'image', 'video', 'voice'].includes(m.type))
    );

    return (
        <div className="page active msgr-page-container">
            <div className={`msgr-page ${active ? 'has-active-chat' : 'no-active-chat'} ${showInfoDrawer && active ? 'has-drawer' : ''} ${isMobile ? 'is-mobile' : ''}`}>
                {/* Column 1: Conversations Sidebar */}
                <div className="msgr-page-sidebar">
                    <div className="msgr-page-head">
                        <h2>Tin nhắn</h2>
                    </div>
                    <div className="msgr-panel-search">
                        <input type="text" placeholder="Tìm kiếm hội thoại..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="msgr-panel-tabs">
                        <button className={tab === 'chat' ? 'is-active' : ''} onClick={() => handleSelectTab('chat')}>Trò chuyện</button>
                        <button className={tab === 'request' ? 'is-active' : ''} onClick={() => handleSelectTab('request')}>Yêu cầu</button>
                    </div>
                    <div className="msgr-page-list">
                        {filtered.length === 0 ? (
                            <div className="msgr-empty">Không có hội thoại nào.</div>
                        ) : (
                            filtered.map((c) => (
                                <button
                                    key={c.id}
                                    className={'msgr-convo-item' + (String(c.id) === String(activeId) ? ' is-active' : '')}
                                    onClick={() => {
                                        setActiveId(c.id);
                                        setSearchParams({ c: c.id });
                                    }}
                                >
                                    <div className="msgr-convo-av">
                                        <Avatar src={c.avatar} name={c.name} fontSize={16} style={{ width: 46, height: 46 }} />
                                        {c.online && <span className="msgr-online-dot" />}
                                    </div>
                                    <div className="msgr-convo-main">
                                        <div className="msgr-convo-top"><b>{c.name} {c.muted && '🔕'}</b><span>{c.lastTime}</span></div>
                                        <div className="msgr-convo-sub">{lastPreview(c)}</div>
                                    </div>
                                    {c.unread > 0 && <span className="msgr-unread-dot">{c.unread}</span>}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Column 2: Chat Window Main */}
                <div className="msgr-page-main">
                    {active ? (
                        <>
                            {/* Chat Header */}
                            <div className="msgr-window-head msgr-page-chat-head">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                                    {isMobile && (
                                        <button
                                            type="button"
                                            className="msgr-back-btn"
                                            onClick={() => {
                                                setActiveId(null);
                                                setSearchParams({});
                                            }}
                                            aria-label="Quay lại danh sách"
                                            title="Quay lại"
                                        >
                                            ←
                                        </button>
                                    )}
                                    <Avatar src={active.avatar} name={active.name} fontSize={16} style={{ width: 46, height: 46 }} />
                                    <div className="msgr-window-head-txt" style={{ minWidth: 0 }}>
                                        <b style={{ fontSize: 16.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{active.name}</b>
                                        <span style={{ fontSize: 13 }}>{active.subtitle} · {active.blocked ? 'Đã chặn' : active.online ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        className={'msgr-icon-btn ' + (showInfoDrawer ? 'is-active' : '')}
                                        onClick={() => setShowInfoDrawer((prev) => !prev)}
                                        title={showInfoDrawer ? 'Ẩn thông tin' : 'Xem thông tin & tệp đã gửi'}
                                        style={{ fontSize: 18, width: 36, height: 36 }}
                                    >
                                        ℹ️
                                    </button>

                                    <div className="msgr-chatmenu-wrap" ref={menuWrapRef}>
                                        <button type="button" className="msgr-icon-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Tuỳ chọn" title="Tuỳ chọn" style={{ fontSize: 18, width: 36, height: 36 }}>⋯</button>
                                        {menuOpen && (
                                            <ChatHeaderMenu conv={active} onToggleFlag={(flag) => toggleConvFlag(active.id, flag)} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Job Context Header Bar */}
                            {active.jobTitle && (
                                <div className="msgr-job-bar">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                                        <span style={{ fontSize: 14 }}>📌</span>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            Đang trao đổi về: <b>{active.jobTitle}</b>
                                        </span>
                                        {active.jobBudget && (
                                            <span className="chip chip-lime" style={{ fontSize: 11, padding: '1px 6px' }}>
                                                {fmtVND(active.jobBudget)} · Đã ký quỹ
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        {active.jobId && (
                                            <button
                                                className="btn btn-outline btn-sm"
                                                style={{ fontSize: 11, padding: '2px 8px' }}
                                                onClick={() => navigate(`/jobs/${active.jobId}`)}
                                            >
                                                Xem việc →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Job Lifecycle & Grace Period Banner */}
                            {active.statusBannerMessage && (
                                <div
                                    className={`msgr-lifecycle-banner ${active.isReadOnly ? 'msgr-banner-locked' : 'msgr-banner-grace'}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 16px',
                                        background: active.isReadOnly ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.1)',
                                        borderBottom: `1px solid ${active.isReadOnly ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.3)'}`,
                                        color: active.isReadOnly ? '#b91c1c' : '#b45309',
                                        fontSize: 13,
                                        fontWeight: 600,
                                    }}
                                >
                                    <span style={{ fontSize: 16 }}>{active.isReadOnly ? '🔒' : '⏳'}</span>
                                    <span style={{ flex: 1 }}>{active.statusBannerMessage}</span>
                                </div>
                            )}

                            {/* Action Bar for Pending Message Request */}
                            {active.requestStatus === 'pending' && !active.isRequestSender && (
                                <div
                                    className="msgr-request-actions-bar"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 18px',
                                        background: 'rgba(108, 76, 255, 0.08)',
                                        borderBottom: '1px solid rgba(108, 76, 255, 0.2)',
                                        gap: 12,
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                                        <span>👋 Người này muốn gửi tin nhắn cho bạn. Họ sẽ không biết bạn đã đọc tin nhắn cho đến khi bạn chấp nhận.</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm"
                                            style={{ color: '#ef4444', borderColor: '#ef4444', padding: '5px 14px', fontSize: 12.5 }}
                                            onClick={async () => {
                                                await declineMessageRequest(active.id);
                                                setActiveId(null);
                                            }}
                                        >
                                            Từ chối
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            style={{ padding: '5px 16px', fontSize: 12.5 }}
                                            onClick={async () => {
                                                await acceptMessageRequest(active.id);
                                            }}
                                        >
                                            Chấp nhận
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Trust & Safety Notice Banner */}
                            {showSafetyBanner && (
                                <div className="msgr-safety-banner">
                                    <span>
                                        <b>Mẹo an toàn:</b> Luôn nghiệm thu & giải ngân qua nền tảng. Không giao dịch riêng ngoài hệ thống.
                                    </span>
                                    <button
                                        onClick={() => setShowSafetyBanner(false)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 13, marginLeft: 8, padding: 4 }}
                                        title="Đóng thông báo"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Chat Messages Body */}
                            <div className="msgr-window-body msgr-page-chat-body" ref={bodyRef}>
                                {active.messages.map((m) => <ChatBubble key={m.id} m={m} />)}
                            </div>

                            {/* Chat Composer */}
                            <div className="msgr-page-chat-foot">
                                <ChatComposer
                                    conversationId={active.id}
                                    blocked={active.blocked}
                                    isReadOnly={active.isReadOnly}
                                    readOnlyReason={active.readOnlyReason}
                                    onUnblock={() => toggleConvFlag(active.id, 'blocked')}
                                    onSend={(message) => sendChatMessage(active.id, message)}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="msgr-empty-chat-state">
                            <div style={{ fontSize: 42, marginBottom: 12 }}>💬</div>
                            <h3 style={{ margin: '0 0 6px' }}>Tin nhắn của bạn</h3>
                            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 13.5 }}>
                                Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu trao đổi.
                            </p>
                        </div>
                    )}
                </div>

                {/* Column 3 / Overlay: Partner Profile & Shared Media Drawer */}
                {showInfoDrawer && active && (
                    <div className={`msgr-drawer-wrap ${isMobile ? 'is-mobile-drawer' : ''}`}>
                        {isMobile && <div className="msgr-drawer-backdrop" onClick={() => setShowInfoDrawer(false)} />}
                        <div className="msgr-drawer-panel">
                            {isMobile && (
                                <div className="msgr-drawer-header-mobile">
                                    <h3>Thông tin hội thoại</h3>
                                    <button
                                        type="button"
                                        className="msgr-icon-btn"
                                        onClick={() => setShowInfoDrawer(false)}
                                        aria-label="Đóng"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Partner Profile Summary */}
                            <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'inline-block', position: 'relative' }}>
                                    <Avatar src={active.avatar} name={active.name} fontSize={24} style={{ width: 72, height: 72, margin: '0 auto' }} />
                                    {active.online && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                bottom: 2,
                                                right: 2,
                                                width: 15,
                                                height: 15,
                                                borderRadius: '50%',
                                                background: '#22c55e',
                                                border: '2px solid var(--surface)'
                                            }}
                                        />
                                    )}
                                </div>
                                <h3 style={{ fontSize: 17, margin: '10px 0 3px', fontWeight: 700 }}>{active.name}</h3>
                                <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                                    {active.partnerSchool || (active.partnerRole === 'employer' ? 'Nhà tuyển dụng' : 'Thành viên SkillBridge')}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                    <span className="chip" style={{ fontSize: 11.5, background: 'rgba(108, 76, 255, 0.1)', color: 'var(--primary)', padding: '2px 8px' }}>
                                        {active.partnerRole === 'employer' ? '🏢 Nhà tuyển dụng' : '🎓 Sinh viên'}
                                    </span>
                                    <span className="chip chip-lime" style={{ fontSize: 11.5, padding: '2px 8px' }}>
                                        Độ tin cậy: {active.partnerReliability !== null && active.partnerReliability !== undefined ? `${active.partnerReliability}/100` : '100/100'}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px 0', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                <div>
                                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 2 }}>Việc đã hoàn thành</span>
                                    <b style={{ fontSize: 16 }}>{active.partnerJobsDone ?? 0}</b>
                                </div>
                                <div>
                                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 2 }}>Đánh giá trung bình</span>
                                    {active.partnerRating ? (
                                        <b style={{ fontSize: 15.5, color: '#f59e0b' }}>
                                            ⭐ {active.partnerRating} / 5.0
                                            {active.partnerReviewCount > 0 && <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 400 }}> ({active.partnerReviewCount})</span>}
                                        </b>
                                    ) : (
                                        <b style={{ fontSize: 13.5, color: 'var(--ink-soft)', fontWeight: 500 }}>Chưa có đánh giá</b>
                                    )}
                                </div>
                            </div>

                            {/* Shared Files & Deliverables Gallery */}
                            <div style={{ marginTop: 14, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <h4 style={{ fontSize: 13.5, margin: 0, fontWeight: 700 }}>📁 Tệp đã chia sẻ ({sharedFiles.length})</h4>
                                </div>

                                {sharedFiles.length === 0 ? (
                                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                                        Chưa có tệp, hình ảnh hoặc video nào được gửi trong đoạn chat này.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {sharedFiles.map((file, idx) => {
                                            const fileIcon = file.type === 'image' ? '🖼️' : (file.type === 'video' ? '🎬' : (file.type === 'voice' ? '🎤' : '📄'));
                                            const displayName = file.fileName || (file.type === 'image' ? 'Hình ảnh' : (file.type === 'video' ? 'Video' : (file.type === 'voice' ? 'Tin nhắn thoại' : 'Tệp đính kèm')));
                                            const directUrl = file.fileUrl || file.attachmentUrl;

                                            return (
                                                <div
                                                    key={file.id || idx}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '9px 12px',
                                                        background: 'var(--surface-card, rgba(0,0,0,0.03))',
                                                        borderRadius: 8,
                                                        border: '1px solid var(--border)',
                                                        fontSize: 12.5
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', minWidth: 0, marginRight: 8 }}>
                                                        <span style={{ fontSize: 18, flexShrink: 0 }}>{fileIcon}</span>
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            <b style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: 12.5 }}>{displayName}</b>
                                                            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{file.fileSize || file.duration || file.time || ''}</span>
                                                        </div>
                                                    </div>
                                                    {directUrl ? (
                                                        <a
                                                            href={directUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            download={file.fileName || true}
                                                            className="btn btn-outline btn-sm"
                                                            style={{ padding: '3px 9px', fontSize: 11.5, flexShrink: 0, textDecoration: 'none' }}
                                                            title="Xem / Tải về máy"
                                                        >
                                                            Xem / Tải
                                                        </a>
                                                    ) : (
                                                        <button
                                                            className="btn btn-outline btn-sm"
                                                            style={{ padding: '3px 9px', fontSize: 11.5, flexShrink: 0 }}
                                                            onClick={() => downloadJobAttachment({ name: file.fileName }, active.jobTitle || 'Tin_Nhan')}
                                                            title="Tải về máy"
                                                        >
                                                            Tải file
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Drawer Actions */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ width: '100%', fontSize: 13, padding: '8px 12px' }}
                                    onClick={() => {
                                        if (active.partnerRole === 'employer') {
                                            navigate(active.otherUserId ? `/company/${active.otherUserId}` : `/company/${active.name.toLowerCase().replace(/\s+/g, '-')}`);
                                        } else {
                                            navigate(active.otherUserId ? `/freelancers/${active.otherUserId}` : `/profile`);
                                        }
                                    }}
                                >
                                    👤 Xem hồ sơ chi tiết
                                </button>
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ width: '100%', fontSize: 13, padding: '8px 12px', color: 'var(--coral)', borderColor: 'var(--coral)' }}
                                    onClick={() => alert(`Đã gửi báo cáo vi phạm phòng chat của ${active.name} tới đội ngũ Quản trị viên.`)}
                                >
                                    🚩 Báo cáo vi phạm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}