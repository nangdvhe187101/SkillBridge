import React from 'react';

/**
 * Reusable Pagination Component for SkillBridge
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-based index)
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Callback when page changes (newPage: number) => void
 * @param {number} [props.totalItems] - Total count of items
 * @param {number} [props.pageSize] - Number of items per page
 * @param {Function} [props.onPageSizeChange] - Callback when page size changes
 * @param {number[]} [props.pageSizeOptions] - Available page size options (e.g. [6, 12, 24])
 * @param {string} [props.itemLabel] - Label for items (e.g. 'công việc', 'người dùng', 'mục')
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [6, 12, 24],
  itemLabel = 'kết quả'
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (pageSize || 10))) {
    return null; // No pagination needed if only 1 page
  }

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push('ellipsis-start');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('ellipsis-end');
      }

      pages.push(totalPages);
    }
    return pages;
  };

  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div
      className="sb-pagination-wrap"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 24,
        paddingTop: 16,
        borderTop: '1px solid var(--border)'
      }}
    >
      {/* Left: Summary text and optional page size select */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--ink-soft)' }}>
        {totalItems > 0 && (
          <span>
            Hiển thị <b>{startItem}</b> – <b>{endItem}</b> trong <b>{totalItems}</b> {itemLabel}
          </span>
        )}
        {onPageSizeChange && pageSize && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>/ trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              style={{
                padding: '3px 8px',
                fontSize: 12,
                borderRadius: 6,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                cursor: 'pointer'
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* First Page */}
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{ padding: '4px 8px', minWidth: 32, fontSize: 12 }}
          title="Trang đầu"
        >
          «
        </button>

        {/* Prev Page */}
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '4px 8px', minWidth: 32, fontSize: 12 }}
          title="Trang trước"
        >
          ‹
        </button>

        {/* Number Buttons */}
        {getPageNumbers().map((p, idx) => {
          if (p === 'ellipsis-start' || p === 'ellipsis-end') {
            return (
              <span key={`el-${idx}`} style={{ padding: '0 4px', color: 'var(--ink-soft)', fontSize: 12 }}>
                …
              </span>
            );
          }

          const isActive = p === currentPage;
          return (
            <button
              key={p}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => onPageChange(p)}
              style={{
                padding: '4px 10px',
                minWidth: 32,
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ padding: '4px 8px', minWidth: 32, fontSize: 12 }}
          title="Trang kế tiếp"
        >
          ›
        </button>

        {/* Last Page */}
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={{ padding: '4px 8px', minWidth: 32, fontSize: 12 }}
          title="Trang cuối"
        >
          »
        </button>
      </div>
    </div>
  );
}
