import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import Loader from './Loader';

const AUTH_BYPASS = import.meta.env.VITE_BYPASS_AUTH === 'true';

export function ProtectedRoute() {
  if (AUTH_BYPASS) return <Outlet />;
  const { user, loading } = useAuth();
  const activeUser = user || auth.currentUser;
  if (loading) return <Loader text="Checking session..." />;
  if (!activeUser && import.meta.env.DEV) {
    console.warn('[RouteGuard] Redirecting to /login because no authenticated user is available.');
  }
  return activeUser ? <Outlet /> : <Navigate to="/login" replace />;
}

export function UserOnlyRoute() {
  if (AUTH_BYPASS) return <Outlet />;
  const { role, loading } = useAuth();
  if (loading) return <Loader text="Checking role..." />;
  if (role === 'admin' && import.meta.env.DEV) {
    console.info('[RouteGuard] Redirecting admin user to /admin/dashboard.');
  }
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Outlet />;
}

export function AdminOnlyRoute() {
  if (AUTH_BYPASS) return <Outlet />;
  const { role, loading } = useAuth();
  if (loading) return <Loader text="Checking admin access..." />;
  if (role !== 'admin' && import.meta.env.DEV) {
    console.warn('[RouteGuard] Blocking admin route because role is not admin. Redirecting to /dashboard.');
  }
  return role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
