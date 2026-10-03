import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '../catalog/catalog.api';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import { createOrder } from './orders.api';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, loading, error, refresh } = useCart();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasUnavailableItems = cart?.items.some((item) => !item.available) ?? false;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const order = await createOrder({
        recipientName: String(form.get('recipientName') ?? ''),
        phone: String(form.get('phone') ?? ''),
        address: String(form.get('address') ?? ''),
        commune: String(form.get('commune') ?? ''),
        region: String(form.get('region') ?? ''),
      });
      await refresh();
      navigate('/pedidos/' + order.id, { replace: true });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No fue posible crear el pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Último paso</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Datos de entrega</h1>
      {loading && <p className="py-10 text-center text-slate-600">Cargando tu carrito…</p>}
      {!loading && (error || formError) && <p aria-live="polite" className="mt-6 rounded-xl bg-red-50 p-5 text-red-800">{formError ?? error}</p>}
      {!loading && !error && cart?.items.length === 0 && (
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Tu carrito está vacío.</p>
          <Link className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white" to="/catalogo">Volver al catálogo</Link>
        </section>
      )}
      {!loading && cart && cart.items.length > 0 && (
        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_19rem]">
          <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6" onSubmit={handleSubmit}>
            <p className="text-sm leading-6 text-slate-600">
              Este pedido reserva el stock durante un tiempo limitado. Puedes pagar con Webpay en ambiente de integración o aprobar el pago simulado; ninguno genera un cobro real.
            </p>
            {hasUnavailableItems && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hay productos sin stock suficiente. Vuelve al carrito y ajusta las cantidades.</p>}
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Nombre de quien recibe
              <input autoComplete="name" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" defaultValue={user?.name ?? ''} maxLength={100} minLength={2} name="recipientName" required />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Teléfono
              <input autoComplete="tel" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={20} minLength={8} name="phone" pattern="[+0-9 ()-]+" required />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Dirección
              <input autoComplete="street-address" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={200} minLength={5} name="address" required />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Comuna
                <input autoComplete="address-level2" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={80} minLength={2} name="commune" required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Región
                <input autoComplete="address-level1" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={80} minLength={2} name="region" required />
              </label>
            </div>
            {formError && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
            <button className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={submitting || hasUnavailableItems} type="submit">
              {submitting ? 'Creando pedido…' : 'Crear pedido'}
            </button>
          </form>
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Resumen</h2>
            <ul className="mt-4 space-y-3">
              {cart.items.map((item) => (
                <li className="flex justify-between gap-4 text-sm" key={item.id}>
                  <span className="text-slate-600">{item.product.name} × {item.quantity}</span>
                  <span className="shrink-0 font-medium text-slate-800">{formatPrice(item.lineSubtotalClp)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-sm text-slate-600">
              <span>Envío (demo)</span><span>{formatPrice(0)}</span>
            </div>
            <div className="mt-3 flex justify-between font-bold text-slate-950">
              <span>Total</span><span>{formatPrice(cart.subtotalClp)}</span>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
