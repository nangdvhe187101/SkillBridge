export function JobCardSkeleton() {
  return (
    <div
      className="job-card"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius, 12px)',
        padding: '20px',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton skeleton-circle" style={{ width: 44, height: 44, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '60%', height: 16 }} />
          <div className="skeleton skeleton-text" style={{ width: '40%', height: 12, marginBottom: 0 }} />
        </div>
      </div>
      <div className="skeleton skeleton-text" style={{ width: '90%', height: 14 }} />
      <div className="skeleton skeleton-text" style={{ width: '75%', height: 14 }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 70, height: 24, borderRadius: 999 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <div className="skeleton skeleton-text" style={{ width: '30%', height: 16, marginBottom: 0 }} />
        <div className="skeleton skeleton-text" style={{ width: '20%', height: 12, marginBottom: 0 }} />
      </div>
    </div>
  );
}

export function PageLoadingSkeleton({ title = 'Đang tải trang...' }) {
  return (
    <div className="page active" style={{ minHeight: '65vh', padding: '32px 0' }} aria-busy="true" aria-label={title}>
      <div className="wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        {/* Header Skeleton */}
        <div style={{ marginBottom: 32 }}>
          <div className="skeleton skeleton-text" style={{ width: 140, height: 14, marginBottom: 12 }} />
          <div className="skeleton skeleton-text" style={{ width: '45%', height: 32, marginBottom: 10 }} />
          <div className="skeleton skeleton-text" style={{ width: '30%', height: 16 }} />
        </div>

        {/* Content Grid Skeleton */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }} aria-hidden="true">
      <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton skeleton-text" style={{ flex: 1, height: 14, marginBottom: 0 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton skeleton-text" style={{ flex: 1, height: 14, marginBottom: 0, opacity: 0.8 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
