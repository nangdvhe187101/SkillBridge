import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Icon from '../components/Icon';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { message, danger, confirmLabel, cancelLabel }
  const resolver = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    setState({ message, danger: !!opts.danger, confirmLabel: opts.confirmLabel || 'Xác nhận', cancelLabel: opts.cancelLabel || 'Huỷ' });
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const handle = (result) => {
    setState(null);
    if (resolver.current) { resolver.current(result); resolver.current = null; }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) handle(false); }}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <button className="modal-close" onClick={() => handle(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" width="16" height="16" />
            </button>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {state.danger && <Icon name="alert-triangle" width="20" height="20" style={{ color: 'var(--coral)' }} />}
              {state.danger ? 'Xác nhận thao tác' : 'Xác nhận'}
            </h3>
            <p style={{ marginTop: 10 }}>{state.message}</p>
            <div className="modal-actions">
              <button className="btn btn-primary" style={state.danger ? { background: 'var(--coral)' } : undefined} onClick={() => handle(true)}>
                {state.confirmLabel}
              </button>
              <button className="btn btn-outline" onClick={() => handle(false)}>{state.cancelLabel}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
