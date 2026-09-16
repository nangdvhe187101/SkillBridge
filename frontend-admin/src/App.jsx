import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Admin from './pages/Admin';
import Login from './pages/Login';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import IconDefs from './components/IconDefs';

export default function App() {
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
