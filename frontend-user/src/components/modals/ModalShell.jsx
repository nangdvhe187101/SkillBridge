import Icon from '../Icon';

export default function ModalShell({ onClose, wide, chat, review, children }) {
  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal-box' + (wide ? ' modal-wide' : '') + (chat ? ' chat-box' : '') + (review ? ' review' : '')}>
        <button className="modal-close" onClick={onClose}><Icon name="x" /></button>
        {children}
      </div>
    </div>
  );
}
