import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useStore } from '../context/StoreContext';
import ChatBubble from '../components/messenger/ChatBubble';
import ChatComposer from '../components/messenger/ChatComposer';
import ChatHeaderMenu from '../components/messenger/ChatHeaderMenu';
import '../styles/messenger.css';

export default function Messages() {
    const { state, sendChatMessage, markConversationRead, toggleConvFlag } = useStore();
    const { conversations } = state;
    const [searchParams] = useSearchParams();
    const [tab, setTab] = useState('chat');
    const [search, setSearch] = useState('');
    const [activeId, setActiveId] = useState(searchParams.get('c') || conversations[0]?.id || null);
    const [menuOpen, setMenuOpen] = useState(false);
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

    return (
        <div className="page active">
            <div className="msgr-page">
                <div className="msgr-page-sidebar">
                    <div className="msgr-page-head">
                        <h2>Tin nhắn</h2>
                    </div>
                    <div className="msgr-panel-search">
                        <input type="text" placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} />
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

                <div className="msgr-page-main">
                    {active ? (
                        <>
                            <div className="msgr-window-head msgr-page-chat-head">
                                <Avatar name={active.name} fontSize={14} />
                                <div className="msgr-window-head-txt">
                                    <b>{active.name}</b>
                                    <span>{active.subtitle} · {active.blocked ? 'Đã chặn' : active.online ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                                </div>
                                <div className="msgr-chatmenu-wrap" ref={menuWrapRef} style={{ marginLeft: 'auto' }}>
                                    <button className="msgr-icon-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Tuỳ chọn" title="Tuỳ chọn">⋯</button>
                                    {menuOpen && (
                                        <ChatHeaderMenu conv={active} onToggleFlag={(flag) => toggleConvFlag(active.id, flag)} />
                                    )}
                                </div>
                            </div>
                            <div className="msgr-window-body msgr-page-chat-body" ref={bodyRef}>
                                {active.messages.map((m) => <ChatBubble key={m.id} m={m} />)}
                            </div>
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
            </div>
        </div>
    );
}