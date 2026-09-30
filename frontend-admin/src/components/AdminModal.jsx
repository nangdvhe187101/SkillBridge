import React, { useEffect, useRef } from 'react';
import Icon from './Icon';

/**
 * Standard Accessible Modal for SkillBridge Admin
 * - Supports ESC key to close
 * - Traps scroll on body
 * - WCAG compliant (role="dialog", aria-modal="true")
 */
export default function AdminModal({
  isOpen,
  onClose,
  title,
  icon,
  iconColor = 'var(--primary)',
  children,
  maxWidth = 480,
  ariaLabel
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element or modal container
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        position: 'fixed',
        inset: 0,
        padding: 16
      }}
    >
      <div
        ref={modalRef}
        className="modal-box"
        style={{
          width: '100%',
          maxWidth,
          borderRadius: 20,
          background: 'var(--surface-2, #ffffff)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px 28px',
          position: 'relative',
          animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Đóng hộp thoại"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: 'var(--surface)',
            color: 'var(--ink-soft)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-soft)')}
        >
          <Icon name="x" style={{ width: 16, height: 16 }} />
        </button>

        {title && (
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink)',
              margin: '0 0 12px 0'
            }}
          >
            {icon && (
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'var(--surface)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: iconColor,
                  flexShrink: 0
                }}
              >
                <Icon name={icon} style={{ width: 18, height: 18 }} />
              </span>
            )}
            <span>{title}</span>
          </h3>
        )}

        <div style={{ color: 'var(--ink)' }}>{children}</div>
      </div>
    </div>
  );
}
