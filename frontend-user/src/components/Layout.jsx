import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import IconDefs from './IconDefs';
import TopNav from './TopNav';
import ModalRoot from './ModalRoot';
import MessengerWidget from './messenger/MessengerWidget';
import Footer from './Footer';
import { useStore } from '../context/StoreContext';

export default function Layout() {
  const { state } = useStore();
  const location = useLocation();
  const isLoggedIn = !!state.currentUser;
  const onMessagesPage = location.pathname.startsWith('/messages');

  // Dynamic visual viewport adjustment for mobile virtual keyboards
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      const currentHeight = vv ? vv.height : window.innerHeight;
      const windowHeight = window.innerHeight;
      const keyboardHeight = Math.max(0, windowHeight - currentHeight);

      document.documentElement.style.setProperty('--visual-viewport-height', `${currentHeight}px`);
      document.documentElement.style.setProperty('--keyboard-offset', `${keyboardHeight}px`);

      if (keyboardHeight > 80) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);
    handleViewportChange();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
      document.documentElement.style.removeProperty('--visual-viewport-height');
      document.documentElement.style.removeProperty('--keyboard-offset');
      document.body.classList.remove('keyboard-open');
    };
  }, []);

  return (
    <>
      <IconDefs />
      <a href="#main-content" className="skip-link">Bỏ qua đến nội dung chính</a>
      <TopNav />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <ModalRoot />
      {isLoggedIn && !onMessagesPage && <MessengerWidget />}
      {!onMessagesPage && <Footer />}
    </>
  );
}