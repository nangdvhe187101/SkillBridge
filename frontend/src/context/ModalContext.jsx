import { createContext, useContext, useState } from 'react';

const ModalContext = createContext(null);

// modal: { type: 'pay'|'chat'|'review'|'success'|'report', props: {...} } | null
export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);

  const openModal = (type, props = {}) => setModal({ type, props });
  const closeModal = () => setModal(null);

  return (
    <ModalContext.Provider value={{ modal, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
