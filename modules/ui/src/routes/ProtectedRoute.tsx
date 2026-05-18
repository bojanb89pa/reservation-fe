import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../state/authStore';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  const { initiateLogin } = useAuth();

  if (!isAuthenticated) {
    // Redirect to auth server rather than a local login page
    initiateLogin();
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
