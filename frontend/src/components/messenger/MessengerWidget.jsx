import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../Avatar';
import { useStore } from '../../context/StoreContext';
import ChatBubble from './ChatBubble';
import ChatComposer from './ChatComposer';
import ChatHeaderMenu from './ChatHeaderMenu';
import '../../styles/messenger.css';

function ChatWindow({ conv, onClose }) {
    const { sendChatMessage, toggleConvFlag } = useStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const bodyRef = useRef(null);
    const menuWrapRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, [conv.messages.length]);

    useEffect(() => {
        if (!menuOpen) return;
        const onClickOutside = (e) => {
            if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [menuOpen]);

    return (
        <div className={'msgr-window' + (minimized ? ' minimized' : '')}>
            <div className="msgr-window-head" onClick={() => minimized && setMinimized(false)}>
                <Avatar name={conv.name} fontSize={13} />
                <div className="msgr-window-head-txt">
                    <b>{conv.name}</b>
                    <span>{conv.blocked ? 'Đã chặn' : conv.online ? '● Đang hoạt động' : 'Ngoại tuyến'}</span>
                </div>
                <div className="msgr-chatmenu-wrap" ref={menuWrapRef}>
                    <button className="msgr-icon-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }} aria-label="Tuỳ chọn" title="Tuỳ chọn">⋯</button>
                    {menuOpen && (
                        <ChatHeaderMenu
                            conv={conv}
                            onToggleFlag={(flag) => toggleConvFlag(conv.id, flag)}
                            onOpenFull={() => { setMenuOpen(false); navigate(`/messages?c=${conv.id}`); }}
                        />
                    )}
                </div>
                <button className="msgr-icon-btn" onClick={(e) => { e.stopPropagation(); setMinimized((m) => !m); }} aria-label={minimized ? 'Mở rộng' : 'Thu nhỏ'} title={minimized ? 'Mở rộng' : 'Thu nhỏ'}>
                    {minimized ? '▲' : '–'}
                </button>
                <button className="msgr-icon-btn" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Đóng">✕</button>
            </div>
            {!minimized && (
                <>
                    <div className="msgr-window-body" ref={bodyRef}>
                        {conv.messages.map((m) => <ChatBubble key={m.id} m={m} />)}
                    </div>
                    <ChatComposer
                        blocked={conv.blocked}
                        onUnblock={() => toggleConvFlag(conv.id, 'blocked')}
                        onSend={(message) => sendChatMessage(conv.id, message)}
                    />
                </>
            )}
        </div>
    );
}

export default function MessengerWidget() {
    const { state, toggleMessengerPanel, openChat, closeChat } = useStore();
    const [tab, setTab] = useState('chat');
    const [search, setSearch] = useState('');
    const navigate = useNavigate();
    const panelRef = useRef(null);
    const { conversations, openChatIds, messengerPanelOpen } = state;
    const unreadTotal = conversations.reduce((sum, c) => sum + c.unread, 0);

    useEffect(() => {
        if (!messengerPanelOpen) return;
        const onClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) toggleMessengerPanel(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [messengerPanelOpen, toggleMessengerPanel]);

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
        <div className="msgr-dock">
            {openChatIds.map((id) => {
                const conv = conversations.find((c) => c.id === id);
                if (!conv) return null;
                return <ChatWindow key={id} conv={conv} onClose={() => closeChat(id)} />;
            })}

            <div className="msgr-launcher-wrap" ref={panelRef}>
                {messengerPanelOpen && (
                    <div className="msgr-panel">
                        <div className="msgr-panel-head">
                            <b>Tin nhắn</b>
                            <div className="msgr-panel-head-actions">
                                <button className="msgr-icon-btn" onClick={() => { toggleMessengerPanel(false); navigate('/messages'); }} title="Mở trang tin nhắn">⤢</button>
                                <button className="msgr-icon-btn" onClick={() => toggleMessengerPanel(false)} aria-label="Đóng">✕</button>
                            </div>
                        </div>
                        <div className="msgr-panel-search">
                            <input type="text" placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="msgr-panel-tabs">
                            <button className={tab === 'chat' ? 'is-active' : ''} onClick={() => setTab('chat')}>Trò chuyện</button>
                            <button className={tab === 'request' ? 'is-active' : ''} onClick={() => setTab('request')}>Yêu cầu</button>
                        </div>
                        <div className="msgr-panel-list">
                            {filtered.length === 0 ? (
                                <div className="msgr-empty">Không có hội thoại nào.</div>
                            ) : (
                                filtered.map((c) => (
                                    <button key={c.id} className="msgr-convo-item" onClick={() => openChat(c.id)}>
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
                )}

                <button className="msgr-launcher-btn" onClick={() => toggleMessengerPanel()} aria-label="Tin nhắn">
                    💬
                    {unreadTotal > 0 && <span className="msgr-launcher-badge">{unreadTotal}</span>}
                </button>
            </div>
        </div>
    );
}