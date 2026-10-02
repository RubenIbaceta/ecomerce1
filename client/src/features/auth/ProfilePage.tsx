import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Mi cuenta</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Hola, {user.name}</h1>
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Datos del perfil</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Correo electrónico</dt>
            <dd className="mt-1 font-medium text-slate-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Tipo de cuenta</dt>
            <dd className="mt-1 font-medium text-slate-800">{user.role === 'ADMIN' ? 'Administración' : 'Cliente'}</dd>
          </div>
        </dl>
        {user.role === 'ADMIN' && (
          <Link className="mt-6 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800" to="/admin">
            Ir al área de administración
          </Link>
        )}
      </section>
    </main>
  );
}
