export default function ChatBubble({ m }) {
    const side = m.from === 'me' ? 'me' : 'them';

    if (m.type === 'like') {
        return (
            <div className={'msgr-msg msgr-msg-like ' + side}>
                <span className="msgr-like-emoji">👍</span>
                <time>{m.time}</time>
            </div>
        );
    }

    if (m.type === 'file') {
        return (
            <div className={'msgr-msg msgr-msg-file ' + side}>
                <span className="msgr-file-ic">📎</span>
                <div className="msgr-file-info">
                    <b>{m.fileName}</b>
                    <span>{m.fileSize}</span>
                </div>
                <time>{m.time}</time>
            </div>
        );
    }

    if (m.type === 'voice') {
        return (
            <div className={'msgr-msg msgr-msg-voice ' + side}>
                <span className="msgr-voice-ic">🎤</span>
                <div className="msgr-voice-wave">
                    {Array.from({ length: 14 }).map((_, i) => <span key={i} />)}
                </div>
                <span className="msgr-voice-duration">{m.duration}</span>
                <time>{m.time}</time>
            </div>
        );
    }

    return (
        <div className={'msgr-msg ' + side}>
            <span>{m.text}</span>
            <time>{m.time}</time>
        </div>
    );
}