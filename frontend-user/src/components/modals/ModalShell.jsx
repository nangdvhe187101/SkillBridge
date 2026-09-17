import { useEffect } from 'react';
import Icon from '../Icon';

export default function ModalShell({ onClose, wide, chat, review, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={'modal-box' + (wide ? ' modal-wide' : '') + (chat ? ' chat-box' : '') + (review ? ' review' : '')}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Đóng hộp thoại"
        >
          <Icon name="x" />
        </button>
        {children}
      </div>
    </div>
  );
}
