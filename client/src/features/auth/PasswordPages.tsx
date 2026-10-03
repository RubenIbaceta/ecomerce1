import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { requestPasswordReset, resetPassword, verifyEmail } from './auth.api';

const inputClass = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

function AccountPanel({ title, children }: { title: string; children: ReactNode }) {
  return <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16"><section className="surface-card rounded-[1.5rem] p-6 sm:p-8"><p className="border-l-2 border-[var(--color-brand)] pl-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">ElectroStore</p><h1 className="mt-3 text-4xl font-bold text-[var(--color-ink)]">{title}</h1>{children}</section></main>;
}

export function ForgotPasswordPage() {
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try { const form = new FormData(event.currentTarget); const result = await requestPasswordReset(String(form.get('email') ?? '')); setMessage(result.message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible procesar la solicitud.'); }
    finally { setBusy(false); }
  }
  return <AccountPanel title="Recuperar contraseña"><p className="mt-2 text-sm leading-6 text-slate-600">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.</p><form className="mt-6 space-y-4" onSubmit={submit}><label className="block text-sm font-medium text-slate-700">Correo electrónico<input autoComplete="email" className={`${inputClass} mt-2`} name="email" required type="email" /></label>{message && <p aria-live="polite" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}{error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<button className="w-full rounded-full bg-[var(--color-brand)] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button></form><Link className="mt-5 inline-block text-sm font-semibold text-blue-700 hover:underline" to="/ingresar">Volver a iniciar sesión</Link></AccountPanel>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''; const navigate = useNavigate();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget); const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirmPassword') ?? '')) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try { await resetPassword(token, password); navigate('/ingresar', { replace: true, state: { notice: 'Contraseña actualizada. Ya puedes iniciar sesión.' } }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cambiar la contraseña.'); }
    finally { setBusy(false); }
  }
  return <AccountPanel title="Nueva contraseña"><p className="mt-2 text-sm text-slate-600">Elige una contraseña de al menos 12 caracteres.</p><form className="mt-6 space-y-4" onSubmit={submit}><label className="block text-sm font-medium text-slate-700">Nueva contraseña<input autoComplete="new-password" className={`${inputClass} mt-2`} maxLength={128} minLength={12} name="password" required type="password" /></label><label className="block text-sm font-medium text-slate-700">Confirmar contraseña<input autoComplete="new-password" className={`${inputClass} mt-2`} maxLength={128} minLength={12} name="confirmPassword" required type="password" /></label>{error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<button className="w-full rounded-xl bg-[var(--color-brand)] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={busy || !token}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button></form></AccountPanel>;
}

export function VerifyEmailPage() {
  const [params] = useSearchParams(); const token = params.get('token') ?? '';
  const [message, setMessage] = useState('Verificando el enlace…'); const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (!token) { setMessage('El enlace de verificación no es válido.'); setError(true); return; }
    verifyEmail(token).then(() => { if (active) setMessage('Correo confirmado. Ya puedes iniciar sesión.'); })
      .catch((cause) => { if (active) { setMessage(cause instanceof Error ? cause.message : 'No se pudo verificar el correo.'); setError(true); } });
    return () => { active = false; };
  }, [token]);
  return <AccountPanel title="Verificación de correo"><p aria-live="polite" className={`mt-4 rounded-xl p-4 text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'}`}>{message}</p><Link className="mt-5 inline-block font-semibold text-blue-700 hover:underline" to="/ingresar">Ir a iniciar sesión</Link></AccountPanel>;
}
