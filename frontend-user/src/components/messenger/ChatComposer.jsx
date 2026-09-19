import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import * as chatApi from '../../api/chatApi';

const EMOJIS = ['😀', '😂', '😍', '🥲', '🙏', '🎉', '🔥', '😢', '😮', '👏', '💯', '❤️', '😅', '🤔', '✅', '🚀'];

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ChatComposer({ onSend, blocked, onUnblock, conversationId, isReadOnly, readOnlyReason }) {
    const [input, setInput] = useState('');
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [recording, setRecording] = useState(false);
    const [recordSec, setRecordSec] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadProgressText, setUploadProgressText] = useState('');

    const fileInputRef = useRef(null);
    const emojiWrapRef = useRef(null);
    const timerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        if (!emojiOpen) return;
        const onClickOutside = (e) => {
            if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target)) setEmojiOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [emojiOpen]);

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try {
                    mediaRecorderRef.current.stop();
                    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
                } catch {}
            }
        };
    }, []);

    const sendText = () => {
        const text = input.trim();
        if (!text) return;
        onSend({ type: 'text', text });
        setInput('');
    };

    const pickEmoji = (e) => setInput((v) => v + e);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Giới hạn 20MB theo REQ-CHAT-006
        const maxBytes = 20 * 1024 * 1024;
        if (file.size > maxBytes) {
            alert('Tệp đính kèm không được vượt quá 20MB.');
            e.target.value = '';
            return;
        }

        let mediaType = 'file';
        if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type.startsWith('audio/')) mediaType = 'voice';
        else if (file.type.startsWith('video/')) mediaType = 'video';

        setUploading(true);
        setUploadProgressText(mediaType === 'image' ? 'Đang tải ảnh...' : (mediaType === 'video' ? 'Đang tải video...' : 'Đang tải tệp...'));

        try {
            const numericId = Number(conversationId);
            if (!numericId || isNaN(numericId) || numericId <= 0) {
                // Fallback nếu chưa đồng bộ ID số
                const url = URL.createObjectURL(file);
                onSend({
                    type: mediaType,
                    fileName: file.name,
                    fileSize: formatFileSize(file.size),
                    fileUrl: url,
                    text: input.trim()
                });
                setInput('');
                return;
            }

            const res = await chatApi.uploadAttachment(numericId, file);
            onSend({
                type: mediaType,
                fileName: res.fileName || file.name,
                fileSize: formatFileSize(res.fileSize || file.size),
                fileUrl: res.fileUrl,
                attachmentUrl: res.fileUrl,
                text: input.trim()
            });
            setInput('');
        } catch (err) {
            console.error('Lỗi khi tải tệp tin lên:', err);
            alert(err?.message || 'Không thể tải tệp tin lên. Vui lòng thử lại.');
        } finally {
            setUploading(false);
            setUploadProgressText('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert('Trình duyệt của bạn không hỗ trợ ghi âm trực tiếp.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start(250);
            setRecording(true);
            setRecordSec(0);
            timerRef.current = setInterval(() => setRecordSec((s) => s + 1), 1000);
        } catch (err) {
            console.warn('Lỗi quyền truy cập Microphone:', err);
            alert('Vui lòng cho phép quyền truy cập Microphone trong trình duyệt để ghi âm tin nhắn.');
        }
    };

    const cancelRecording = () => {
        clearInterval(timerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
            } catch {}
        }
        setRecording(false);
        setRecordSec(0);
        audioChunksRef.current = [];
    };

    const finishRecording = () => {
        clearInterval(timerRef.current);
        const finalSec = recordSec;
        setRecording(false);
        setRecordSec(0);

        if (!mediaRecorderRef.current) return;

        mediaRecorderRef.current.onstop = async () => {
            try {
                mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];

                if (audioBlob.size === 0) return;

                const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                const numericId = Number(conversationId);

                if (!numericId || isNaN(numericId) || numericId <= 0) {
                    const localUrl = URL.createObjectURL(audioBlob);
                    onSend({
                        type: 'voice',
                        duration: formatDuration(finalSec),
                        fileUrl: localUrl,
                        fileName: audioFile.name,
                        fileSize: formatFileSize(audioBlob.size)
                    });
                    return;
                }

                setUploading(true);
                setUploadProgressText('Đang gửi tin nhắn thoại...');

                const res = await chatApi.uploadAttachment(numericId, audioFile);
                onSend({
                    type: 'voice',
                    duration: formatDuration(finalSec),
                    fileUrl: res.fileUrl,
                    attachmentUrl: res.fileUrl,
                    fileName: res.fileName || audioFile.name,
                    fileSize: formatFileSize(res.fileSize || audioBlob.size)
                });
            } catch (err) {
                console.error('Lỗi khi gửi voice message:', err);
                alert(err?.message || 'Không thể gửi tin nhắn thoại. Vui lòng thử lại.');
            } finally {
                setUploading(false);
                setUploadProgressText('');
            }
        };

        if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const sendLike = () => onSend({ type: 'like' });

    if (isReadOnly) {
        return (
            <div className="msgr-composer msgr-composer-blocked" style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
                    <span style={{ fontSize: 16 }}>🔒</span>
                    <b>{readOnlyReason || 'Hội thoại đã chuyển sang chế độ Chỉ Đọc (Read-Only).'}</b>
                </span>
            </div>
        );
    }

    if (blocked) {
        return (
            <div className="msgr-composer msgr-composer-blocked">
                <span>Bạn đã chặn người này, không thể gửi tin nhắn.</span>
                <button className="msgr-unblock-btn" onClick={onUnblock}>Bỏ chặn</button>
            </div>
        );
    }

    if (uploading) {
        return (
            <div className="msgr-composer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', color: 'var(--primary)', fontSize: 13 }}>
                <span className="msgr-rec-dot" style={{ background: 'var(--primary)' }} />
                <span>{uploadProgressText || 'Đang tải tệp lên máy chủ...'}</span>
            </div>
        );
    }

    if (recording) {
        return (
            <div className="msgr-composer msgr-composer-recording">
                <span className="msgr-rec-dot" />
                <span className="msgr-rec-time">Đang ghi âm... {formatDuration(recordSec)}</span>
                <button className="msgr-icon-btn" onClick={cancelRecording} aria-label="Huỷ ghi âm" title="Huỷ">✕</button>
                <button className="msgr-send-btn" onClick={finishRecording} aria-label="Gửi ghi âm" title="Hoàn tất & Gửi"><Icon name="send" /></button>
            </div>
        );
    }

    return (
        <div className="msgr-composer">
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt"
                onChange={handleFile}
            />
            <button
                className="msgr-icon-btn"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Đính kèm file hoặc ảnh/video"
                title="Đính kèm file, ảnh, video, tài liệu"
                type="button"
            >
                📎
            </button>

            <div className="msgr-emoji-wrap" ref={emojiWrapRef}>
                <button className="msgr-icon-btn" onClick={() => setEmojiOpen((o) => !o)} aria-label="Emoji" title="Emoji" type="button">😊</button>
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

            <button
                className="msgr-icon-btn"
                onClick={startRecording}
                aria-label="Ghi âm tin nhắn thoại"
                title="Ghi âm tin nhắn thoại"
                type="button"
            >
                🎤
            </button>

            {input.trim() ? (
                <button className="msgr-send-btn" onClick={sendText} aria-label="Gửi" type="button"><Icon name="send" /></button>
            ) : (
                <button className="msgr-send-btn msgr-like-btn" onClick={sendLike} aria-label="Thích" type="button">👍</button>
            )}
        </div>
    );
}