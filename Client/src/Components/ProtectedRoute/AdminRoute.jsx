// src/Components/ProtectedRoute/AdminRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function AdminRoute({ redirectTo = '/' }) {
  const location = useLocation();
  const token = sessionStorage.getItem('token');

  let user = null;
  try { user = JSON.parse(sessionStorage.getItem('user') || 'null'); } catch {}

  if (!token || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  if (String(user.role || '').toLowerCase() !== 'admin') {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}
