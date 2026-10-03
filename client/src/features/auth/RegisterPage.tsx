import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { resendVerification } from './auth.api';
import { StoreIcon } from '../../app/StoreIcon';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    try {
      const result = await register(
        String(form.get('name') ?? ''),
        email,
        String(form.get('password') ?? ''),
      );
      if (result.verificationRequired) setRegisteredEmail(result.email);
      else navigate('/perfil', { replace: true });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No fue posible crear la cuenta.';
      if (message.includes('La cuenta se creó')) setRegisteredEmail(email);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendAgain() {
    if (!registeredEmail) return;
    setError(null); setNotice('');
    try { const result = await resendVerification(registeredEmail); setNotice(result.message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo reenviar el correo.'); }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="surface-card rounded-[1.5rem] p-6 sm:p-8">
        <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]"><StoreIcon className="size-5" name="account" /></span>
        <p className="mt-6 border-l-2 border-[var(--color-brand)] pl-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">Nueva cuenta</p>
        <h1 className="mt-3 text-4xl font-bold text-[var(--color-ink)]">Crea tu cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">Guarda direcciones, revisa pedidos y compra más rápido. Usa al menos 12 caracteres para tu contraseña.</p>
        {registeredEmail ? <div className="mt-7 rounded-2xl bg-emerald-50 p-5 text-sm leading-6 text-emerald-900"><h2 className="font-bold">Confirma tu correo</h2><p className="mt-2">Enviamos un enlace de verificación a <strong>{registeredEmail}</strong>. Confirma la dirección antes de iniciar sesión.</p>{notice && <p aria-live="polite" className="mt-3">{notice}</p>}{error && <p aria-live="polite" className="mt-3 text-red-800">{error}</p>}<button className="mt-4 font-bold underline" onClick={() => void sendAgain()} type="button">Reenviar enlace</button><p className="mt-4"><Link className="font-semibold underline" to="/ingresar">Ir a iniciar sesión</Link></p></div> : <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Nombre
            <input autoComplete="name" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" maxLength={80} minLength={2} name="name" required />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Correo electrónico
            <input autoComplete="email" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" name="email" required type="email" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Contraseña
            <input autoComplete="new-password" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" maxLength={128} minLength={12} name="password" required type="password" />
          </label>
          {error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button className="w-full rounded-full bg-[var(--color-brand)] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[var(--color-brand-dark)] disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>}
        <p className="mt-6 text-sm text-slate-600">
          ¿Ya tienes cuenta? <Link className="font-semibold text-blue-700 hover:underline" to="/ingresar">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
