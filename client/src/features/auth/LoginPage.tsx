import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { resendVerification } from './auth.api';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/perfil';
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const notice = (location.state as { notice?: string } | null)?.notice ?? '';
  const [verificationMessage, setVerificationMessage] = useState('');

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

  async function sendVerificationAgain() {
    setError(null); setVerificationMessage('');
    try { const result = await resendVerification(email); setVerificationMessage(result.message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible reenviar el enlace.'); }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-2xl font-black text-[var(--color-brand)]">E</span>
        <p className="mt-6 text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">Tu cuenta</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">Ingresa para ver tu perfil.</p>
        {notice && <p aria-live="polite" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Correo electrónico
            <input autoComplete="email" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <div className="-mt-2 text-right"><Link className="text-sm font-semibold text-blue-700 hover:underline" to="/recuperar-clave">¿Olvidaste tu contraseña?</Link></div>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Contraseña
            <input autoComplete="current-password" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" name="password" required type="password" />
          </label>
          {error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {error?.includes('Confirma tu correo') && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><button className="font-semibold underline" onClick={() => void sendVerificationAgain()} type="button">Reenviar verificación</button>{verificationMessage && <p className="mt-2" aria-live="polite">{verificationMessage}</p>}</div>}
          <button className="w-full rounded-xl bg-[var(--color-brand)] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60" disabled={submitting} type="submit">
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
