import { Navigate } from 'react-router-dom';
import { getAccessToken, setAccessToken } from '../api/tokenStore';

export default function AdminProtectedRoute({ children }) {
  let token = getAccessToken();

  if (!token) {
    const saved = localStorage.getItem('admin_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.token) {
          setAccessToken(parsed.token);
          token = parsed.token;
        }
      } catch {
        localStorage.removeItem('admin_user');
      }
    }
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
