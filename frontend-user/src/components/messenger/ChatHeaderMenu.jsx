export default function ChatHeaderMenu({ conv, onToggleFlag, onOpenFull }) {
    return (
        <div className="msgr-chatmenu">
            {onOpenFull && (
                <button type="button" className="msgr-chatmenu-link" onClick={onOpenFull}>
                    ↗ Mở toàn màn hình
                </button>
            )}
            <div className="msgr-chatmenu-row">
                <span>Lưu trữ hội thoại</span>
                <label className="msgr-switch">
                    <input type="checkbox" checked={!!conv.archived} onChange={() => onToggleFlag('archived')} />
                    <span className="msgr-switch-track" />
                </label>
            </div>
            <div className="msgr-chatmenu-row">
                <span>Tắt thông báo</span>
                <label className="msgr-switch">
                    <input type="checkbox" checked={!!conv.muted} onChange={() => onToggleFlag('muted')} />
                    <span className="msgr-switch-track" />
                </label>
            </div>
            <div className="msgr-chatmenu-row msgr-chatmenu-danger">
                <span>Chặn người dùng</span>
                <label className="msgr-switch">
                    <input type="checkbox" checked={!!conv.blocked} onChange={() => onToggleFlag('blocked')} />
                    <span className="msgr-switch-track" />
                </label>
            </div>
        </div>
    );
}