import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '../api/tokenStore';

let pdfjsLib = null;
async function getPdfjsLib() {
  if (pdfjsLib) return pdfjsLib;
  const mod = await import('pdfjs-dist');
  pdfjsLib = mod;
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;
  return pdfjsLib;
}

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5004/api';

async function fetchDeliverableBlob(jobId, deliverableId, type, asBuffer) {
  const token = getAccessToken();
  const url = `${API_URL}/jobs/${jobId}/deliverables/${deliverableId}/download?type=${type}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return asBuffer ? res.arrayBuffer() : res.blob();
}

function drawWatermark(canvas, jobId, version) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  const fontSize = Math.max(14, Math.min(width / 22, 26));
  ctx.font = `600 ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(0, 80, 200, 0.10)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = 'SKILLBRIDGE · BAN XEM TRUOC · CHUA NGHIEM THU';
  const lineH = fontSize * 2.8;
  for (let y = -height; y <= height; y += lineH) ctx.fillText(label, 0, y);
  ctx.restore();
  const badge = Math.max(10, fontSize * 0.5);
  ctx.font = `500 ${badge}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(0, 80, 200, 0.18)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`(c) SkillBridge Protected - Job #${jobId} v${version || 1}`, width - 12, height - 10);
}

export function SecurePdfViewer({ jobId, deliverableId, isFinal, version }) {
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);

  const renderPage = useCallback(async (pageNum) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    const page = await pdfDocRef.current.getPage(pageNum);
    const containerWidth = canvasRef.current.parentElement?.clientWidth || 600;
    const scale = Math.min(2, containerWidth / page.getViewport({ scale: 1 }).width);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (!isFinal) drawWatermark(canvas, jobId, version);
  }, [jobId, version, isFinal]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setCurrentPage(1);
    async function load() {
      try {
        const lib = await getPdfjsLib();
        const buffer = await fetchDeliverableBlob(jobId, deliverableId, isFinal ? 'final' : 'preview', true);
        if (cancelled) return;
        const pdfDoc = await lib.getDocument({ data: buffer }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdfDoc;
        setTotalPages(pdfDoc.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Khong the tai PDF.'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [jobId, deliverableId, isFinal]);

  useEffect(() => {
    if (!loading && pdfDocRef.current) renderPage(currentPage);
  }, [currentPage, loading, renderPage]);

  if (loading) return (
    <div style={{ padding: '32px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px dashed var(--border)' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
      <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>⏳ Đang nạp tài liệu PDF bảo mật...</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: '20px', textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
      <div style={{ fontSize: 24 }}>⚠️</div>
      <p style={{ fontSize: 13, color: '#dc2626', margin: '6px 0 0' }}>Không thể hiển thị PDF: {error}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#0f172a', borderRadius: '10px 10px 0 0', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>📄 {isFinal ? 'Bản gốc hoàn thiện' : 'Bản xem trước có watermark'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#e2e8f0', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}>◀</button>
          <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 70, textAlign: 'center' }}>Trang {currentPage}/{totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#e2e8f0', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}>▶</button>
        </div>
        {!isFinal && <span style={{ fontSize: 11, color: '#f59e0b' }}>🔒 Chưa nghiệm thu</span>}
      </div>
      <div style={{ background: '#334155', display: 'flex', justifyContent: 'center', padding: 16, borderRadius: '0 0 10px 10px' }} onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.4)', display: 'block' }} />
      </div>
      {!isFinal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 8 }}>
          <span>🛡️</span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Tài liệu hiển thị bảo mật qua SkillBridge. Bản gốc sạch chỉ mở sau khi nghiệm thu & giải ngân.</span>
        </div>
      )}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setCurrentPage(p)}
              style={{ minWidth: 34, height: 34, border: `2px solid ${currentPage === p ? 'var(--accent, #6366f1)' : 'var(--border)'}`, borderRadius: 6, background: currentPage === p ? 'rgba(99,102,241,0.1)' : 'var(--surface)', color: currentPage === p ? 'var(--accent, #6366f1)' : 'var(--ink-soft)', fontSize: 12, cursor: 'pointer', fontWeight: currentPage === p ? 700 : 400 }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SecureTextViewer({ jobId, deliverableId, isFinal, fileName }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const blob = await fetchDeliverableBlob(jobId, deliverableId, isFinal ? 'final' : 'preview', false);
        if (cancelled) return;
        const text = await blob.text();
        if (cancelled) return;
        setContent(text); setLoading(false);
      } catch (err) {
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [jobId, deliverableId, isFinal]);

  if (loading) return (
    <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px dashed var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>⏳ Đang nạp nội dung văn bản...</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>⚠️ {error}</div>
  );

  const ext = (fileName || '').split('.').pop().toLowerCase();

  return (
    <div style={{ position: 'relative', userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      <div style={{ background: '#0f172a', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '8px 14px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>📝 {fileName || 'Tệp văn bản'} · {content.split('\n').length} dòng</span>
          {!isFinal && <span style={{ fontSize: 11, color: '#f59e0b' }}>🔒 Bản xem trước</span>}
        </div>
        <div style={{ position: 'relative', maxHeight: 420, overflow: 'auto' }}>
          <pre style={{ margin: 0, padding: '16px', fontSize: 13, lineHeight: 1.6, color: ext === 'json' ? '#93c5fd' : '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{content}</pre>
          {!isFinal && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: 'rotate(-22deg)', color: 'rgba(148,163,184,0.12)', fontSize: 'clamp(13px, 2.5vw, 18px)', fontWeight: 700, letterSpacing: '1.5px', textAlign: 'center', userSelect: 'none', lineHeight: 3, whiteSpace: 'nowrap' }}>
                SKILLBRIDGE · BẢN XEM TRƯỚC · CHƯA NGHIỆM THU
              </div>
            </div>
          )}
        </div>
      </div>
      {!isFinal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 8, marginTop: 8 }}>
          <span>🛡️</span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Nội dung tải bảo mật qua SkillBridge. Bản gốc sạch chỉ mở sau khi nghiệm thu.</span>
        </div>
      )}
    </div>
  );
}
