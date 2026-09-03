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
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return asBuffer ? res.arrayBuffer() : res.blob();
}

/** Watermark Overlay Component for HTML-rendered documents (Word, Excel, Text) */
function DocumentWatermarkOverlay({ jobId, version }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      {[...Array(6)].map((_, idx) => (
        <div
          key={idx}
          style={{
            transform: 'rotate(-22deg)',
            color: 'rgba(99, 102, 241, 0.08)',
            fontSize: 'clamp(14px, 2.2vw, 22px)',
            fontWeight: 800,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            textShadow: '0 0 1px rgba(0,0,0,0.05)',
          }}
        >
          SKILLBRIDGE · BẢN XEM TRƯỚC · CHƯA NGHIỆM THU
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 16,
          background: 'rgba(15, 23, 42, 0.75)',
          color: '#e2e8f0',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>🛡️ SkillBridge Protected</span>
        <span>•</span>
        <span>Job #{jobId} v{version || 1}</span>
      </div>
    </div>
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
      const label = 'SKILLBRIDGE · BẢN XEM TRƯỚC · CHƯA NGHIỆM THU';
      const lineH = fontSize * 3;
      for (let y = -height; y <= height; y += lineH) ctx.fillText(label, 0, y);
      ctx.restore();

      const badge = Math.max(10, fontSize * 0.5);
      ctx.font = `600 ${badge}px sans-serif`;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.22)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`© SkillBridge Protected - Job #${jobId} v${version || 1}`, width - 12, height - 10);
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
    if (!loading && pdfDocRef.current) renderPage(currentPage);
  }, [currentPage, loading, renderPage]);

  if (loading) return (
    <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📑</div>
      <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>⏳ Đang nạp và giải mã tài liệu PDF bảo mật...</span>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0f172a', borderRadius: '10px 10px 0 0', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>📑 {isFinal ? 'Bản gốc hoàn thiện' : 'Bản xem trước tài liệu PDF'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}>◀</button>
          <span style={{ fontSize: 12, color: '#e2e8f0', minWidth: 70, textAlign: 'center', fontWeight: 500 }}>Trang {currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}>▶</button>
        </div>
        {!isFinal && <span className="badge badge-warning" style={{ fontSize: 11, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>🔒 Bản bảo vệ</span>}
      </div>
      <div style={{ background: '#334155', display: 'flex', justifyContent: 'center', padding: '16px 12px', borderRadius: '0 0 10px 10px' }} onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', display: 'block' }} />
      </div>
      {!isFinal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 8 }}>
          <span>🛡️</span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Tài liệu được bảo vệ bản quyền qua SkillBridge. Bản gốc tải về chỉ mở sau khi nghiệm thu.</span>
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

/** 2. WORD VIEWER (docx-preview) */
export function SecureDocxViewer({ jobId, deliverableId, isFinal, version, fileName }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>📝 {isFinal ? 'Bản gốc tài liệu Word' : 'Bản xem trước tài liệu Word (.docx)'}</span>
        {!isFinal && <span className="badge badge-warning" style={{ fontSize: 11, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>🔒 Bản bảo vệ</span>}
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
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <span style={{ fontSize: 13 }}>⏳ Đang phân tích và hiển thị tài liệu Word...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '20px', textAlign: 'center', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

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
      </div>

      {!isFinal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 8 }}>
          <span>🛡️</span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Tài liệu Word được hiển thị trực tiếp trên SkillBridge. File gốc sạch tải về sau khi nghiệm thu.</span>
        </div>
      )}
    </div>
  );
}

/** 3. EXCEL / SPREADSHEET VIEWER (SheetJS / xlsx) */
export function SecureExcelViewer({ jobId, deliverableId, isFinal, version, fileName }) {
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
          const html = XLSX.utils.sheet_to_html(ws, { id: 'excel-table', editable: false });
          return { name, html };
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
        <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>📊 {isFinal ? 'Bản gốc bảng tính' : 'Bản xem trước bảng tính Excel / CSV'}</span>
        {!isFinal && <span className="badge badge-warning" style={{ fontSize: 11, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>🔒 Bản bảo vệ</span>}
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
              📑 {s.name}
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
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <span style={{ fontSize: 13 }}>⏳ Đang tải và phân tích dữ liệu bảng tính...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '20px', textAlign: 'center', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

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

      {!isFinal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 8 }}>
          <span>🛡️</span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Bảng tính được bảo vệ bởi SkillBridge. Bản gốc có công thức hoàn chỉnh tải về sau khi giải ngân.</span>
        </div>
      )}
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
      <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
      <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>⏳ Đang tải nội dung văn bản...</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>⚠️ {error}</div>
  );

  const ext = (fileName || '').split('.').pop().toLowerCase();

  return (
    <div style={{ position: 'relative', userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
      <div style={{ background: '#0f172a', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '10px 14px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>📝 {fileName || 'Tệp văn bản'} · {content.split('\n').length} dòng</span>
          {!isFinal && <span className="badge badge-warning" style={{ fontSize: 11, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>🔒 Bản bảo vệ</span>}
        </div>
        <div style={{ position: 'relative', maxHeight: 450, overflow: 'auto' }}>
          <pre style={{ margin: 0, padding: '16px', fontSize: 13, lineHeight: 1.6, color: ext === 'json' ? '#93c5fd' : '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{content}</pre>
          {!isFinal && (
            <DocumentWatermarkOverlay jobId={jobId} version={version} />
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

/** 5. UNIFIED DOCUMENT VIEWER */
export function SecureDocumentViewer({ d, revealFinal }) {
  if (!d) return null;

  const fileName = d.fileName || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const ft = (d.fileType || '').toLowerCase();

  const isPdf = ext === 'pdf' || ft.includes('pdf');
  const isDocx = ['docx', 'doc'].includes(ext) || ft.includes('word') || ft.includes('officedocument.wordprocessingml');
  const isExcel = ['xlsx', 'xls', 'csv'].includes(ext) || ft.includes('excel') || ft.includes('spreadsheet') || ft.includes('officedocument.spreadsheetml');
  const isText = ['txt', 'json', 'xml', 'md', 'rtf', 'js', 'ts', 'py', 'java', 'cpp', 'html', 'css'].includes(ext) || ft.startsWith('text/');

  if (isPdf) {
    return <SecurePdfViewer jobId={d.jobId} deliverableId={d.id} isFinal={revealFinal} version={d.version} />;
  }

  if (isDocx) {
    return <SecureDocxViewer jobId={d.jobId} deliverableId={d.id} isFinal={revealFinal} version={d.version} fileName={d.fileName} />;
  }

  if (isExcel) {
    return <SecureExcelViewer jobId={d.jobId} deliverableId={d.id} isFinal={revealFinal} version={d.version} fileName={d.fileName} />;
  }

  if (isText) {
    return <SecureTextViewer jobId={d.jobId} deliverableId={d.id} isFinal={revealFinal} version={d.version} fileName={d.fileName} />;
  }

  return null;
}
