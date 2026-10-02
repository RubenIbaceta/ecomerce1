import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ role }: { role?: 'CUSTOMER' | 'ADMIN' }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-16 text-center text-slate-600">Comprobando tu sesión…</main>;
  }
  if (!user) return <Navigate replace state={{ from: location.pathname }} to="/ingresar" />;
  if (role && user.role !== role) return <Navigate replace to="/perfil" />;
  return <Outlet />;
}
