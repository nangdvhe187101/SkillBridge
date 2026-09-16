import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';

const EMOJIS = ['😀', '😂', '😍', '🥲', '🙏', '🎉', '🔥', '😢', '😮', '👏', '💯', '❤️', '😅', '🤔', '✅', '🚀'];

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ChatComposer({ onSend, blocked, onUnblock }) {
    const [input, setInput] = useState('');
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [recording, setRecording] = useState(false);
    const [recordSec, setRecordSec] = useState(0);
    const fileInputRef = useRef(null);
    const emojiWrapRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!emojiOpen) return;
        const onClickOutside = (e) => {
            if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target)) setEmojiOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [emojiOpen]);

    useEffect(() => () => clearInterval(timerRef.current), []);

    const sendText = () => {
        const text = input.trim();
        if (!text) return;
        onSend({ type: 'text', text });
        setInput('');
    };

    const pickEmoji = (e) => setInput((v) => v + e);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (file) onSend({ type: 'file', fileName: file.name, fileSize: formatFileSize(file.size) });
        e.target.value = '';
    };

    const startRecording = () => {
        setRecording(true);
        setRecordSec(0);
        timerRef.current = setInterval(() => setRecordSec((s) => s + 1), 1000);
    };
    const cancelRecording = () => {
        clearInterval(timerRef.current);
        setRecording(false);
        setRecordSec(0);
    };
    const finishRecording = () => {
        clearInterval(timerRef.current);
        if (recordSec > 0) onSend({ type: 'voice', duration: formatDuration(recordSec) });
        setRecording(false);
        setRecordSec(0);
    };

    const sendLike = () => onSend({ type: 'like' });

    if (blocked) {
        return (
            <div className="msgr-composer msgr-composer-blocked">
                <span>Bạn đã chặn người này, không thể gửi tin nhắn.</span>
                <button className="msgr-unblock-btn" onClick={onUnblock}>Bỏ chặn</button>
            </div>
        );
    }

    if (recording) {
        return (
            <div className="msgr-composer msgr-composer-recording">
                <span className="msgr-rec-dot" />
                <span className="msgr-rec-time">Đang ghi âm... {formatDuration(recordSec)}</span>
                <button className="msgr-icon-btn" onClick={cancelRecording} aria-label="Huỷ ghi âm" title="Huỷ">✕</button>
                <button className="msgr-send-btn" onClick={finishRecording} aria-label="Gửi ghi âm"><Icon name="send" /></button>
            </div>
        );
    }

    return (
        <div className="msgr-composer">
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFile} />
            <button className="msgr-icon-btn" onClick={() => fileInputRef.current?.click()} aria-label="Đính kèm file" title="Đính kèm file">📎</button>

            <div className="msgr-emoji-wrap" ref={emojiWrapRef}>
                <button className="msgr-icon-btn" onClick={() => setEmojiOpen((o) => !o)} aria-label="Emoji" title="Emoji">😊</button>
                {emojiOpen && (
                    <div className="msgr-emoji-panel">
                        {EMOJIS.map((e) => (
                            <button key={e} type="button" onClick={() => pickEmoji(e)}>{e}</button>
                        ))}
                    </div>
                )}
            </div>

            <input
                type="text"
                className="msgr-composer-input"
                placeholder="Nhập tin nhắn..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); sendText(); } }}
            />

            <button className="msgr-icon-btn" onClick={startRecording} aria-label="Ghi âm" title="Ghi âm">🎤</button>

            {input.trim() ? (
                <button className="msgr-send-btn" onClick={sendText} aria-label="Gửi"><Icon name="send" /></button>
            ) : (
                <button className="msgr-send-btn msgr-like-btn" onClick={sendLike} aria-label="Thích">👍</button>
            )}
        </div>
    );
}