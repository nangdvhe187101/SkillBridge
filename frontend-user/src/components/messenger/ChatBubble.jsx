import { useState } from 'react';

const API_URL = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) || 'http://localhost:5004/api';
const API_BASE = API_URL.replace(/\/api\/?$/, '');

function resolveMediaUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const s = url.trim();
    if (s.startsWith('blob:') || s.startsWith('data:')) return s;
    if (s.includes('.r2.dev/')) {
        const key = s.substring(s.indexOf('.r2.dev/') + 8).replace(/^\/+/, '');
        return `${API_URL}/storage/file?key=${encodeURIComponent(key)}`;
    }
    if (s.includes('/api/storage/file')) {
        return s.startsWith('http') ? s : `${API_BASE}${s.startsWith('/') ? '' : '/'}${s}`;
    }
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    const cleanKey = s.replace(/^\/+/, '');
    return `${API_URL}/storage/file?key=${encodeURIComponent(cleanKey)}`;
}

export default function ChatBubble({ m }) {
    const side = m.from === 'me' ? 'me' : 'them';
    const [imgPreviewOpen, setImgPreviewOpen] = useState(false);
    const [imgError, setImgError] = useState(false);

    if (m.type === 'like') {
        return (
            <div className={'msgr-msg msgr-msg-like ' + side}>
                <span className="msgr-like-emoji">👍</span>
                <time>{m.time}</time>
            </div>
        );
    }

    const resolvedUrl = resolveMediaUrl(m.fileUrl || m.attachmentUrl);
    const cleanUrl = (m.fileUrl || m.attachmentUrl || '').toLowerCase().split('?')[0];

    const isImg = m.type === 'image' || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(cleanUrl);
    const isAudio = m.type === 'voice' || m.type === 'audio' || /\.(mp3|wav|ogg|m4a|webm|aac)$/i.test(cleanUrl);
    const isVideo = m.type === 'video' || /\.(mp4|webm|ogg|mov|mkv)$/i.test(cleanUrl);
    const isFile = m.type === 'file' || (!isImg && !isAudio && !isVideo && Boolean(resolvedUrl));

    return (
        <div className={'msgr-msg ' + side}>
            {/* 1. Hình ảnh: Xem trực tiếp được luôn */}
            {isImg && resolvedUrl && (
                <div style={{ marginBottom: m.text ? 6 : 0 }}>
                    {!imgError ? (
                        <img
                            src={resolvedUrl}
                            alt={m.fileName || 'Ảnh'}
                            onClick={() => setImgPreviewOpen(true)}
                            onError={() => setImgError(true)}
                            loading="lazy"
                            style={{
                                width: 'auto',
                                maxWidth: '100%',
                                maxHeight: 240,
                                borderRadius: 10,
                                display: 'block',
                                cursor: 'pointer',
                                objectFit: 'cover',
                                backgroundColor: 'rgba(0,0,0,0.04)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                            }}
                        />
                    ) : (
                        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.06)', borderRadius: 8, fontSize: 12 }}>
                            <span>Không thể nạp ảnh trực tiếp. </span>
                            <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>
                                Xem ảnh gốc
                            </a>
                        </div>
                    )}

                    {imgPreviewOpen && (
                        <div
                            onClick={() => setImgPreviewOpen(false)}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.85)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 99999,
                                padding: 16
                            }}
                        >
                            <img
                                src={resolvedUrl}
                                alt="Xem ảnh lớn"
                                style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* 2. Âm thanh / Voice: Nghe trực tiếp được luôn */}
            {isAudio && resolvedUrl && (
                <div style={{ marginBottom: m.text ? 6 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, opacity: 0.85 }}>
                        <span>🎤 Tin nhắn thoại</span>
                        {m.duration && <span>({m.duration})</span>}
                    </div>
                    <audio
                        controls
                        src={resolvedUrl}
                        preload="metadata"
                        style={{
                            width: 220,
                            maxWidth: '100%',
                            height: 36,
                            borderRadius: 20,
                            outline: 'none'
                        }}
                    />
                </div>
            )}

            {/* 3. Video: Xem trực tiếp được luôn */}
            {isVideo && resolvedUrl && (
                <div style={{ marginBottom: m.text ? 6 : 0 }}>
                    <video
                        controls
                        src={resolvedUrl}
                        preload="metadata"
                        style={{
                            width: '100%',
                            maxWidth: '100%',
                            maxHeight: 240,
                            borderRadius: 10,
                            display: 'block',
                            backgroundColor: '#000'
                        }}
                    />
                </div>
            )}

            {/* 4. Tài liệu / File khác */}
            {isFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: m.text ? 6 : 0 }}>
                    <span style={{ fontSize: 18 }}>📎</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.fileName || 'Tệp đính kèm'}
                        </div>
                        {m.fileSize && <div style={{ fontSize: 11, opacity: 0.75 }}>{m.fileSize}</div>}
                    </div>
                    {resolvedUrl && (
                        <a
                            href={resolvedUrl}
                            download={m.fileName || true}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: side === 'me' ? '#fff' : 'var(--primary)',
                                textDecoration: 'underline',
                                fontSize: 11.5,
                                fontWeight: 500,
                                flexShrink: 0,
                                marginLeft: 4
                            }}
                        >
                            Tải về
                        </a>
                    )}
                </div>
            )}

            {/* Nội dung văn bản (nếu có) */}
            {m.text && <span>{m.text}</span>}

            <time style={{ display: 'block', marginTop: 3 }}>{m.time}</time>
        </div>
    );
}