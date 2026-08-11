import { Outlet } from 'react-router-dom';
import IconDefs from './IconDefs';

export default function AuthLayout() {
  return (
    <>
      <IconDefs />
      <Outlet />
    </>
  );
}
