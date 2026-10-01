import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Admin from './pages/Admin';
import Login from './pages/Login';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import IconDefs from './components/IconDefs';

export default function App() {
  // Pre-warm Admin backend ngầm ngay khi admin mở trang
  useEffect(() => {
    try {
      const apiUrl = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) || 'http://localhost:5005/api';
      const healthUrl = apiUrl.replace(/\/api\/?$/, '') + '/health';
      fetch(healthUrl, { method: 'GET', mode: 'cors' }).catch(() => {});
    } catch {
      // Bỏ qua lỗi mạng nền
    }
  }, []);

  return (
    <BrowserRouter>
      <IconDefs />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AdminProtectedRoute>
              <Admin />
            </AdminProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
