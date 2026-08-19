import { Outlet, useLocation } from 'react-router-dom';
import IconDefs from './IconDefs';
import TopNav from './TopNav';
import ModalRoot from './ModalRoot';
import MessengerWidget from './messenger/MessengerWidget';
import { useStore } from '../context/StoreContext';

export default function Layout() {
  const { state } = useStore();
  const location = useLocation();
  const isLoggedIn = !!state.currentUser;
  const onMessagesPage = location.pathname.startsWith('/messages');

  return (
    <>
      <IconDefs />
      <TopNav />
      <Outlet />
      <ModalRoot />
      {isLoggedIn && !onMessagesPage && <MessengerWidget />}
    </>
  );
}