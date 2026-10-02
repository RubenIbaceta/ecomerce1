import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await register(
        String(form.get('name') ?? ''),
        String(form.get('email') ?? ''),
        String(form.get('password') ?? ''),
      );
      navigate('/perfil', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible crear la cuenta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12 sm:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Nueva cuenta</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Crear cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">Usa al menos 12 caracteres para tu contraseña.</p>
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Nombre
            <input autoComplete="name" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={80} minLength={2} name="name" required />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Correo electrónico
            <input autoComplete="email" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" name="email" required type="email" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Contraseña
            <input autoComplete="new-password" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={128} minLength={12} name="password" required type="password" />
          </label>
          {error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-600">
          ¿Ya tienes cuenta? <Link className="font-semibold text-blue-700 hover:underline" to="/ingresar">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
