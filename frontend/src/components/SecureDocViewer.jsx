import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '../api/tokenStore';
import * as docx from 'docx-preview';
import * as XLSX from 'xlsx';

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
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.message) msg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return asBuffer ? res.arrayBuffer() : res.blob();
}

/** Watermark Overlay Component for HTML-rendered documents (Word, Excel, Text) */
const REPEATING_WATERMARK_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='240'><text x='50%' y='50%' fill='rgba(99,102,241,0.08)' font-size='12' font-family='sans-serif' font-weight='600' text-anchor='middle' transform='rotate(-20 180 120)'>SKILLBRIDGE · PREVIEW</text></svg>`;

function DocumentWatermarkOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 5,
        backgroundImage: `url("${REPEATING_WATERMARK_SVG}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '360px 240px',
        userSelect: 'none',
      }}
    />
  );
}

/** 1. PDF VIEWER (PDF.js Canvas) */
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
    const containerWidth = canvasRef.current.parentElement?.clientWidth || 650;
    const scale = Math.min(2, containerWidth / page.getViewport({ scale: 1 }).width);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    if (!isFinal) {
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-Math.PI / 6);
      const fontSize = Math.max(14, Math.min(width / 22, 26));
      ctx.font = `700 ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = 'SKILLBRIDGE · PREVIEW';
      const lineH = fontSize * 3;
      for (let y = -height; y <= height; y += lineH) ctx.fillText(label, 0, y);
      ctx.restore();

      const badge = Math.max(10, fontSize * 0.5);
      ctx.font = `600 ${badge}px sans-serif`;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.22)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`SkillBridge - Job #${jobId} v${version || 1}`, width - 12, height - 10);
    }
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
        if (!cancelled) { setError(err.message || 'Không thể tải PDF.'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [jobId, deliverableId, isFinal]);

  useEffect(() => {
    if (!loading && pdfDocRef.current && (isFinal || totalPages <= 2 || currentPage <= 2)) {
      renderPage(currentPage);
    }
  }, [currentPage, loading, renderPage, isFinal, totalPages]);

  if (loading) return (
    <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Đang tải tài liệu PDF...</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: '20px', textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
      <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>Không thể hiển thị PDF: {error}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0f172a', borderRadius: '10px 10px 0 0', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>{isFinal ? 'Tài liệu PDF hoàn thiện' : 'Xem trước tài liệu PDF'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}>◀</button>
          <span style={{ fontSize: 12, color: '#e2e8f0', minWidth: 70, textAlign: 'center', fontWeight: 500 }}>Trang {currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}>▶</button>
        </div>
        {!isFinal && <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: '#cbd5e1', padding: '2px 8px' }}>Bản xem trước</span>}
      </div>
      <div style={{ background: '#334155', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 12px', borderRadius: '0 0 10px 10px', minHeight: 380 }} onContextMenu={(e) => e.preventDefault()}>
        {(!isFinal && totalPages > 2 && currentPage > 2) ? (
          <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '32px 24px', maxWidth: 440, textAlign: 'center', color: '#f8fafc', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', margin: '40px 0' }}>
            <h4 style={{ fontSize: 15, margin: '0 0 8px', color: '#ffffff' }}>Xem trước giới hạn 2 trang đầu</h4>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, margin: '0 0 16px' }}>
              Vui lòng nghiệm thu công việc để xem và tải toàn bộ {totalPages} trang của tài liệu.
            </p>
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              style={{ background: 'var(--primary, #3b82f6)', color: '#ffffff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Quay lại Trang 1
            </button>
          </div>
        ) : (
          <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', display: 'block' }} />
        )}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
            const isLocked = !isFinal && totalPages > 2 && p > 2;
            return (
              <button key={p} onClick={() => setCurrentPage(p)}
                style={{ minWidth: 34, height: 34, border: `2px solid ${currentPage === p ? 'var(--accent, #6366f1)' : 'var(--border)'}`, borderRadius: 6, background: currentPage === p ? 'rgba(99,102,241,0.1)' : 'var(--surface)', color: isLocked ? '#94a3b8' : (currentPage === p ? 'var(--accent, #6366f1)' : 'var(--ink-soft)'), fontSize: 12, cursor: 'pointer', fontWeight: currentPage === p ? 700 : 400, opacity: isLocked ? 0.6 : 1 }}>
                {p}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 2. WORD VIEWER (docx-preview) */
export function SecureDocxViewer({ jobId, deliverableId, isFinal, version }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDocPages, setTotalDocPages] = useState(1);
  const [hasLockedPages, setHasLockedPages] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);

    async function load() {
      try {
        const buffer = await fetchDeliverableBlob(jobId, deliverableId, isFinal ? 'final' : 'preview', true);
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          await docx.renderAsync(buffer, containerRef.current, null, {
            className: 'docx-preview-content',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
          });

          if (!isFinal && containerRef.current) {
            const pages = containerRef.current.querySelectorAll('.docx-preview-content > section, .docx, section');
            if (pages.length > 2) {
              setTotalDocPages(pages.length);
              setHasLockedPages(true);
              for (let i = 2; i < pages.length; i++) {
                pages[i].style.filter = 'blur(6px)';
                pages[i].style.opacity = '0.25';
                pages[i].style.pointerEvents = 'none';
                pages[i].style.userSelect = 'none';
                pages[i].style.maxHeight = '240px';
                pages[i].style.overflow = 'hidden';
              }
            } else {
              setHasLockedPages(false);
            }
          }
        }
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('Docx render error:', err);
          setError(err.message || 'Không thể đọc nội dung file Word.');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [jobId, deliverableId, isFinal]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0f172a', borderRadius: '10px 10px 0 0', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>{isFinal ? 'Tài liệu Word' : 'Xem trước tài liệu Word (.docx)'}</span>
        {!isFinal && <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: '#cbd5e1', padding: '2px 8px' }}>Bản xem trước</span>}
      </div>

      <div
        style={{
          position: 'relative',
          background: '#e2e8f0',
          borderRadius: '0 0 10px 10px',
          padding: '16px',
          maxHeight: 520,
          overflowY: 'auto',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.08)',
        }}
      >
        {loading && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <span style={{ fontSize: 13 }}>Đang tải tài liệu Word...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '20px', textAlign: 'center', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ position: 'relative', width: '100%' }}>
          <div
            ref={containerRef}
            style={{
              background: '#ffffff',
              borderRadius: 6,
              boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
              minHeight: loading ? 0 : 300,
              padding: '12px',
            }}
          />

          {!isFinal && !loading && !error && (
            <DocumentWatermarkOverlay jobId={jobId} version={version} />
          )}

          {!isFinal && hasLockedPages && !loading && !error && (
            <div
              style={{
                margin: '20px auto 10px',
                maxWidth: 480,
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 12,
                padding: '24px 20px',
                textAlign: 'center',
                color: '#f8fafc',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                position: 'relative',
                zIndex: 6,
              }}
            >
              <b style={{ fontSize: 14, color: '#ffffff', display: 'block', marginBottom: 6 }}>
                Xem trước giới hạn 2 trang đầu
              </b>
              <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Vui lòng nghiệm thu công việc để xem và tải toàn bộ tài liệu ({totalDocPages} trang).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 3. EXCEL / SPREADSHEET VIEWER (SheetJS / xlsx) */
export function SecureExcelViewer({ jobId, deliverableId, isFinal, version }) {
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);

    async function load() {
      try {
        const buffer = await fetchDeliverableBlob(jobId, deliverableId, isFinal ? 'final' : 'preview', true);
        if (cancelled) return;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const parsedSheets = workbook.SheetNames.map(name => {
          const ws = workbook.Sheets[name];
          let html = '';
          let totalRows = 0;
          let isTrimmed = false;

          if (!isFinal && ws && ws['!ref']) {
            const range = XLSX.utils.decode_range(ws['!ref']);
            totalRows = range.e.r - range.s.r + 1;
            if (totalRows > 20) {
              isTrimmed = true;
              const trimmedRange = {
                s: { c: range.s.c, r: range.s.r },
                e: { c: range.e.c, r: Math.min(range.s.r + 19, range.e.r) }
              };
              html = XLSX.utils.sheet_to_html(ws, { id: 'excel-table', editable: false, range: XLSX.utils.encode_range(trimmedRange) });
            } else {
              html = XLSX.utils.sheet_to_html(ws, { id: 'excel-table', editable: false });
            }
          } else {
            html = XLSX.utils.sheet_to_html(ws, { id: 'excel-table', editable: false });
          }
          return { name, html, totalRows, isTrimmed };
        });
        if (cancelled) return;
        setSheets(parsedSheets);
        setActiveSheet(0);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Không thể đọc bảng tính Excel.');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [jobId, deliverableId, isFinal]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0f172a', borderRadius: '10px 10px 0 0', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>{isFinal ? 'Bảng tính' : 'Xem trước bảng tính Excel / CSV'}</span>
        {!isFinal && <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: '#cbd5e1', padding: '2px 8px' }}>Bản xem trước</span>}
      </div>

      {/* Sheets Navigation Tabs */}
      {sheets.length > 1 && (
        <div style={{ display: 'flex', gap: 4, background: '#1e293b', padding: '6px 10px', overflowX: 'auto' }}>
          {sheets.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheet(idx)}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: 'none',
                background: activeSheet === idx ? '#10b981' : 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: activeSheet === idx ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          background: '#ffffff',
          borderRadius: '0 0 10px 10px',
          border: '1px solid var(--border)',
          padding: '12px',
          maxHeight: 450,
          overflow: 'auto',
        }}
      >
        {loading && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <span style={{ fontSize: 13 }}>Đang tải bảng tính...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '20px', textAlign: 'center', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ position: 'relative', minWidth: 'fit-content' }}>
          {!loading && !error && sheets[activeSheet] && (
            <div
              dangerouslySetInnerHTML={{ __html: sheets[activeSheet].html }}
              style={{
                fontSize: 13,
                fontFamily: 'system-ui, sans-serif',
                overflowX: 'auto',
              }}
            />
          )}

          {!isFinal && !loading && !error && (
            <DocumentWatermarkOverlay jobId={jobId} version={version} />
          )}
        </div>

        {/* Khóa các dòng sau 20 dòng */}
        {!isFinal && sheets[activeSheet]?.isTrimmed && (
          <div
            style={{
              margin: '16px auto 8px',
              padding: '16px 20px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 8,
              textAlign: 'center',
              color: '#f8fafc',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <b style={{ fontSize: 13.5, color: '#ffffff', display: 'block', marginBottom: 4 }}>
              Hiển thị 20 dòng đầu tiên (Tổng cộng {sheets[activeSheet].totalRows} dòng)
            </b>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Vui lòng nghiệm thu công việc để xem và tải toàn bộ bảng tính.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** 4. TEXT / CODE VIEWER */
export function SecureTextViewer({ jobId, deliverableId, isFinal, version, fileName }) {
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
    <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Đang tải nội dung văn bản...</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>
  );

  const ext = (fileName || '').split('.').pop().toLowerCase();
  const allLines = content.split('\n');
  const isTrimmed = !isFinal && allLines.length > 50;
  const displayedContent = isTrimmed ? allLines.slice(0, 50).join('\n') : content;

  return (
    <div style={{ position: 'relative', userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      <div style={{ background: '#0f172a', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '10px 14px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>{fileName || 'Tệp văn bản'} · {allLines.length} dòng</span>
          {!isFinal && <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: '#cbd5e1', padding: '2px 8px' }}>Bản xem trước</span>}
        </div>
        <div style={{ position: 'relative', maxHeight: 450, overflow: 'auto' }}>
          <div style={{ position: 'relative', minHeight: '100%' }}>
            <pre style={{ margin: 0, padding: '16px', fontSize: 13, lineHeight: 1.6, color: ext === 'json' ? '#93c5fd' : '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{displayedContent}</pre>
            {!isFinal && (
              <DocumentWatermarkOverlay jobId={jobId} version={version} />
            )}
          </div>

          {isTrimmed && (
            <div
              style={{
                margin: '16px',
                padding: '18px 20px',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                textAlign: 'center',
                color: '#f8fafc',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              <b style={{ fontSize: 13.5, color: '#ffffff', display: 'block', marginBottom: 4 }}>
                Hiển thị 50 dòng đầu tiên (Tổng cộng {allLines.length} dòng)
              </b>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Vui lòng nghiệm thu công việc để xem và tải toàn bộ nội dung.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 5. UNIFIED DOCUMENT VIEWER */
export function SecureDocumentViewer({ d, revealFinal }) {
  useEffect(() => {
    if (revealFinal) return;
    const handleKeyDown = (e) => {
      // Chặn Ctrl+P / Cmd+P (In ra file PDF) và Ctrl+S / Cmd+S (Lưu trang)
      if ((e.ctrlKey || e.metaKey) && ['p', 'P', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [revealFinal]);

  if (!d) return null;

  const fileName = d.fileName || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const ft = (d.fileType || '').toLowerCase();

  const isPdf = ext === 'pdf' || ft.includes('pdf');
  const isDocx = ['docx', 'doc'].includes(ext) || ft.includes('word') || ft.includes('officedocument.wordprocessingml');
  const isExcel = ['xlsx', 'xls', 'csv'].includes(ext) || ft.includes('excel') || ft.includes('spreadsheet') || ft.includes('officedocument.spreadsheetml');
  const isText = ['txt', 'json', 'xml', 'md', 'rtf', 'js', 'ts', 'py', 'java', 'cpp', 'html', 'css'].includes(ext) || ft.startsWith('text/');

  let inner = null;
  if (isPdf) {
    if (!revealFinal && !d.hasWatermarkedPreview) return null;
    inner = <SecurePdfViewer jobId={d.jobId} deliverableId={d.id} isFinal={revealFinal} version={d.version} />;
  } else if (isDocx) {
    inner = <SecureDocxViewer jobId={d.jobId} deliverableId={d.id} isFinal={revealFinal} version={d.version} fileName={d.fileName} />;
  } else if (isExcel) {
    inner = <SecureExcelViewer jobId={d.jobId} deliverableId={d.id} isFinal={revealFinal} version={d.version} fileName={d.fileName} />;
  } else if (isText) {
    inner = <SecureTextViewer jobId={d.jobId} deliverableId={d.id} isFinal={revealFinal} version={d.version} fileName={d.fileName} />;
  }

  if (!inner) return null;

  return (
    <div
      className="secure-doc-shield"
      onDragStart={(e) => e.preventDefault()}
      style={{ position: 'relative' }}
    >
      {!revealFinal && (
        <style>{`
          @media print {
            .secure-doc-shield {
              display: none !important;
            }
          }
        `}</style>
      )}
      {inner}
    </div>
  );
}
