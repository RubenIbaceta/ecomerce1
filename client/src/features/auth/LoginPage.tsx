import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/perfil';
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await signIn(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
      navigate(destination, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12 sm:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Tu cuenta</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">Ingresa para ver tu perfil.</p>
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Correo electrónico
            <input autoComplete="email" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" name="email" required type="email" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Contraseña
            <input autoComplete="current-password" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" name="password" required type="password" />
          </label>
          {error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-600">
          ¿Aún no tienes cuenta? <Link className="font-semibold text-blue-700 hover:underline" to="/registro">Crear cuenta</Link>
        </p>
      </div>
    </main>
  );
}
