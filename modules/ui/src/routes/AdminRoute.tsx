import { Navigate, Outlet } from 'react-router-dom';
import { useIsAdmin } from '../hooks/useAuth';

export function AdminRoute() {
  const isAdmin = useIsAdmin();
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
