import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ redirectTo = '/' }) {
  const token = sessionStorage.getItem('token');
  const location = useLocation();

  // not logged in → send to login and remember where they wanted to go
  if (!token) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // logged in → render the nested routes
  return <Outlet />;
}
