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