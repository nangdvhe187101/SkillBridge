import { Outlet } from 'react-router-dom';
import IconDefs from './IconDefs';
import TopNav from './TopNav';
import ModalRoot from './ModalRoot';

export default function Layout() {
  return (
    <>
      <IconDefs />
      <TopNav />
      <Outlet />
      <ModalRoot />
    </>
  );
}
