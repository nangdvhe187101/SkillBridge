import { createContext, useCallback, useContext, useState } from 'react';
import Icon from '../components/Icon';

const ToastContext = createContext(null);

function renderToastIcon(ic) {
  if (!ic) return null;
  if (typeof ic === 'object') return ic;
  if (ic === 'check' || ic === 'success') {
    return <Icon name="check" width="16" height="16" style={{ color: '#16a34a' }} />;
  }
  if (ic === 'x' || ic === 'error' || ic === 'danger') {
    return <Icon name="x" width="16" height="16" style={{ color: '#dc2626' }} />;
  }
  if (ic === 'warning' || ic === 'alert') {
    return <Icon name="alert-triangle" width="16" height="16" style={{ color: '#ea580c' }} />;
  }
  if (ic === 'hourglass' || ic === 'timer' || ic === 'clock') {
    return <Icon name="clock" width="16" height="16" style={{ color: '#ea580c' }} />;
  }
  if (ic === 'copy' || ic === 'clipboard' || ic === 'link') {
    return <Icon name="copy" width="16" height="16" style={{ color: 'var(--primary)' }} />;
  }
  if (ic === 'info' || ic === 'bell' || ic === 'broadcast') {
    return <Icon name="bell" width="16" height="16" style={{ color: 'var(--primary)' }} />;
  }
  if (ic === 'ban' || ic === 'blocked') {
    return <Icon name="ban" width="16" height="16" style={{ color: '#dc2626' }} />;
  }
  if (ic === 'lock' || ic === 'secure') {
    return <Icon name="lock" width="16" height="16" style={{ color: 'var(--primary)' }} />;
  }
  if (ic === 'star') {
    return <Icon name="star" width="16" height="16" style={{ color: '#eab308' }} />;
  }
  if (ic === 'wallet' || ic === 'money') {
    return <Icon name="wallet" width="16" height="16" style={{ color: '#16a34a' }} />;
  }
  if (ic === 'shield') {
    return <Icon name="shield-check" width="16" height="16" style={{ color: 'var(--primary)' }} />;
  }
  if (ic === 'trash') {
    return <Icon name="trash" width="16" height="16" style={{ color: '#dc2626' }} />;
  }
  if (ic === 'file' || ic === 'file-text') {
    return <Icon name="file-text" width="16" height="16" style={{ color: 'var(--primary)' }} />;
  }
  if (ic === 'heart') {
    return <Icon name="heart" width="16" height="16" style={{ color: '#dc2626' }} />;
  }
  if (ic === 'edit') {
    return <Icon name="edit" width="16" height="16" style={{ color: 'var(--primary)' }} />;
  }
  if (ic === 'zap' || ic === 'rocket') {
    return <Icon name="zap" width="16" height="16" style={{ color: '#eab308' }} />;
  }
  if (ic === 'crown') {
    return <Icon name="crown" width="16" height="16" style={{ color: '#eab308' }} />;
  }
  if (ic === 'handshake' || ic === 'award') {
    return <Icon name="award" width="16" height="16" style={{ color: '#16a34a' }} />;
  }
  if (ic === 'user') {
    return <Icon name="user" width="16" height="16" style={{ color: 'var(--primary)' }} />;
  }
  return <Icon name="check" width="16" height="16" style={{ color: '#16a34a' }} />;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((text, icon = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, icon }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div className="toast" key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="t-ic" style={{ display: 'flex', alignItems: 'center' }}>{renderToastIcon(t.icon)}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
