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
    const { state, sendChatMessage, markConversationRead, toggleConvFlag } = useStore();
    const { conversations } = state;
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState('chat');
    const [search, setSearch] = useState('');
    const [activeId, setActiveId] = useState(searchParams.get('c') || conversations[0]?.id || null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showInfoDrawer, setShowInfoDrawer] = useState(true);
    const [showSafetyBanner, setShowSafetyBanner] = useState(true);
    const bodyRef = useRef(null);
    const menuWrapRef = useRef(null);

    const active = conversations.find((c) => c.id === activeId) || null;

    useEffect(() => {
        if (activeId) markConversationRead(activeId);
    }, [activeId, conversations.length]);

    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, [active?.messages.length]);

    useEffect(() => {
        if (!menuOpen) return;
        const onClickOutside = (e) => {
            if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [menuOpen]);

    const filtered = conversations
        .filter((c) => !c.archived)
        .filter((c) => c.kind === tab || (tab === 'chat' && c.kind !== 'request'))
        .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

    const lastPreview = (c) => {
        const m = c.messages[c.messages.length - 1];
        if (!m) return '';
        if (m.type === 'file') return `📎 ${m.fileName}`;
        if (m.type === 'voice') return `🎤 Tin nhắn thoại (${m.duration})`;
        if (m.type === 'like') return '👍';
        return m.text;
    };

    // Shared files in current conversation
    const sharedFiles = active?.messages.filter((m) => m.type === 'file') || [];

    return (
        <div className="page active" style={{ height: 'calc(100vh - 68px)', overflow: 'hidden' }}>
            <div className="msgr-page" style={{ gridTemplateColumns: showInfoDrawer && active ? '280px 1fr 280px' : '300px 1fr', height: '100%', maxHeight: '100%' }}>
                {/* Column 1: Conversations Sidebar */}
                <div className="msgr-page-sidebar">
                    <div className="msgr-page-head">
                        <h2>Tin nhắn</h2>
                    </div>
                    <div className="msgr-panel-search">
                        <input type="text" placeholder="Tìm kiếm hội thoại..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="msgr-panel-tabs">
                        <button className={tab === 'chat' ? 'is-active' : ''} onClick={() => setTab('chat')}>Trò chuyện</button>
                        <button className={tab === 'request' ? 'is-active' : ''} onClick={() => setTab('request')}>Yêu cầu</button>
                    </div>
                    <div className="msgr-page-list">
                        {filtered.length === 0 ? (
                            <div className="msgr-empty">Không có hội thoại nào.</div>
                        ) : (
                            filtered.map((c) => (
                                <button
                                    key={c.id}
                                    className={'msgr-convo-item' + (c.id === activeId ? ' is-active' : '')}
                                    onClick={() => setActiveId(c.id)}
                                >
                                    <div className="msgr-convo-av">
                                        <Avatar name={c.name} fontSize={13} />
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
                            <div className="msgr-window-head msgr-page-chat-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Avatar name={active.name} fontSize={14} />
                                    <div className="msgr-window-head-txt">
                                        <b>{active.name}</b>
                                        <span>{active.subtitle} · {active.blocked ? 'Đã chặn' : active.online ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button
                                        className={'msgr-icon-btn ' + (showInfoDrawer ? 'is-active' : '')}
                                        onClick={() => setShowInfoDrawer((prev) => !prev)}
                                        title={showInfoDrawer ? 'Ẩn thông tin' : 'Xem thông tin & tệp đã gửi'}
                                        style={{ fontSize: 16 }}
                                    >
                                        ℹ️
                                    </button>

                                    <div className="msgr-chatmenu-wrap" ref={menuWrapRef}>
                                        <button className="msgr-icon-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Tuỳ chọn" title="Tuỳ chọn">⋯</button>
                                        {menuOpen && (
                                            <ChatHeaderMenu conv={active} onToggleFlag={(flag) => toggleConvFlag(active.id, flag)} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Job Context Header Bar */}
                            {active.jobTitle && (
                                <div
                                    style={{
                                        background: 'linear-gradient(to right, rgba(108, 76, 255, 0.08), rgba(6, 182, 212, 0.08))',
                                        borderBottom: '1px solid var(--border)',
                                        padding: '8px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                        fontSize: 12.5,
                                        flexShrink: 0
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 14 }}>📌</span>
                                        <span>
                                            Đang trao đổi về: <b>{active.jobTitle}</b>
                                        </span>
                                        {active.jobBudget && (
                                            <span className="chip chip-lime" style={{ fontSize: 11, padding: '1px 6px' }}>
                                                {fmtVND(active.jobBudget)} · 🛡️ Escrow đã ký quỹ
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: 6 }}>
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

                            {/* Trust & Safety Escrow Notice Banner */}
                            {showSafetyBanner && (
                                <div
                                    style={{
                                        background: 'rgba(234, 179, 8, 0.08)',
                                        borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
                                        padding: '6px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: 11.5,
                                        color: 'var(--ink)',
                                        flexShrink: 0
                                    }}
                                >
                                    <span>
                                        🛡️ <b>Mẹo an toàn:</b> Luôn nghiệm thu & giải ngân qua SkillBridge Escrow. Không chuyển khoản cọc riêng qua Zalo/Telegram.
                                    </span>
                                    <button
                                        onClick={() => setShowSafetyBanner(false)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 12, marginLeft: 8 }}
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
                                    blocked={active.blocked}
                                    onUnblock={() => toggleConvFlag(active.id, 'blocked')}
                                    onSend={(message) => sendChatMessage(active.id, message)}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="msgr-empty">Chọn một hội thoại để bắt đầu.</div>
                    )}
                </div>

                {/* Column 3: Partner Profile & Shared Media Drawer (Right Side) */}
                {showInfoDrawer && active && (
                    <div
                        style={{
                            borderLeft: '1px solid var(--border)',
                            background: 'var(--surface)',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: 14,
                            overflowY: 'auto',
                            height: '100%',
                            minHeight: 0,
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* Partner Profile Summary */}
                        <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'inline-block', position: 'relative' }}>
                                <Avatar name={active.name} fontSize={20} style={{ width: 64, height: 64, margin: '0 auto' }} />
                                {active.online && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            bottom: 2,
                                            right: 2,
                                            width: 14,
                                            height: 14,
                                            borderRadius: '50%',
                                            background: '#22c55e',
                                            border: '2px solid var(--surface)'
                                        }}
                                    />
                                )}
                            </div>
                            <h3 style={{ fontSize: 16, margin: '8px 0 2px' }}>{active.name}</h3>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                                {active.partnerSchool || active.subtitle}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                <span className="chip" style={{ fontSize: 11, background: 'rgba(108, 76, 255, 0.1)', color: 'var(--primary)' }}>
                                    {active.partnerRole === 'employer' ? '🏢 Nhà tuyển dụng' : '🎓 Sinh viên'}
                                </span>
                                <span className="chip chip-lime" style={{ fontSize: 11 }}>
                                    Reliability: {active.partnerReliability || 95}/100
                                </span>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 0', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                            <div>
                                <span style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'block' }}>Việc đã hoàn thành</span>
                                <b style={{ fontSize: 15 }}>{active.partnerJobsDone || 12}</b>
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'block' }}>Đánh giá trung bình</span>
                                <b style={{ fontSize: 15, color: '#f59e0b' }}>⭐ 4.9 / 5.0</b>
                            </div>
                        </div>

                        {/* Shared Files & Deliverables Gallery */}
                        <div style={{ marginTop: 14, flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <h4 style={{ fontSize: 13, margin: 0 }}>📁 Tệp đã chia sẻ ({sharedFiles.length})</h4>
                            </div>

                            {sharedFiles.length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '10px 0' }}>
                                    Chưa có tệp nào được gửi trong đoạn chat này.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {sharedFiles.map((file, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 10px',
                                                background: 'var(--surface-card, rgba(0,0,0,0.03))',
                                                borderRadius: 8,
                                                border: '1px solid var(--border)',
                                                fontSize: 12
                                            }}
                                        >
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6 }}>
                                                <b style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>{file.fileName}</b>
                                                <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{file.fileSize}</span>
                                            </div>
                                            <button
                                                className="btn btn-outline btn-sm"
                                                style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }}
                                                onClick={() => downloadJobAttachment({ name: file.fileName }, active.jobTitle || 'Tin_Nhan')}
                                                title="Tải về máy"
                                            >
                                                ⬇ Tải
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Drawer Actions */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button
                                className="btn btn-outline btn-sm"
                                style={{ width: '100%', fontSize: 12 }}
                                onClick={() => navigate(active.partnerRole === 'employer' ? `/company/${active.name.toLowerCase().replace(/\s+/g, '-')}` : `/profile`)}
                            >
                                👤 Xem hồ sơ chi tiết
                            </button>
                            <button
                                className="btn btn-outline btn-sm"
                                style={{ width: '100%', fontSize: 12, color: 'var(--coral)', borderColor: 'var(--coral)' }}
                                onClick={() => alert(`Đã gửi báo cáo vi phạm phòng chat của ${active.name} tới đội ngũ Quản trị viên.`)}
                            >
                                🚩 Báo cáo vi phạm
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}