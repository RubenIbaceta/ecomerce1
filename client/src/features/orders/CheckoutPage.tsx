import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '../catalog/catalog.api';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import { createOrder, fetchShippingQuotes, type ShippingQuote } from './orders.api';

const chileanRegions = ['Región Metropolitana de Santiago', 'Región de Arica y Parinacota', 'Región de Tarapacá', 'Región de Antofagasta', 'Región de Atacama', 'Región de Coquimbo', 'Región de Valparaíso', 'Región del Libertador General Bernardo O’Higgins', 'Región del Maule', 'Región de Ñuble', 'Región del Biobío', 'Región de La Araucanía', 'Región de Los Ríos', 'Región de Los Lagos', 'Región de Aysén', 'Región de Magallanes y de la Antártica Chilena'];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, loading, error, refresh } = useCart();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [region, setRegion] = useState(chileanRegions[0]);
  const [shippingMethod, setShippingMethod] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const selectedQuote = shippingQuotes.find((quote) => quote.method === shippingMethod);
  const hasUnavailableItems = cart?.items.some((item) => !item.available) ?? false;

  useEffect(() => {
    let active = true;
    fetchShippingQuotes(region).then((quotes) => {
      if (!active) return;
      setShippingQuotes(quotes);
      setShippingMethod('STANDARD');
      setShippingError(null);
    }).catch((cause: unknown) => {
      if (active) setShippingError(cause instanceof Error ? cause.message : 'No se pudo calcular el despacho.');
    });
    return () => { active = false; };
  }, [region]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const paymentMethod = 'webpay';
    try {
      const order = await createOrder({
        recipientName: String(form.get('recipientName') ?? ''),
        phone: String(form.get('phone') ?? ''),
        address: String(form.get('address') ?? ''),
        commune: String(form.get('commune') ?? ''),
        region,
        shippingMethod,
      });
      await refresh();
      navigate('/pedidos/' + order.id, { replace: true, state: { paymentMethod } });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No fue posible crear el pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="border-l-2 border-[var(--color-brand)] pl-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">Último paso</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--color-ink)] sm:text-5xl">Finaliza tu compra</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Ingresa los datos de entrega y confirma el pago con Webpay.</p>
      {loading && <p className="py-10 text-center text-slate-600">Cargando tu carrito…</p>}
      {!loading && (error || formError) && <p aria-live="polite" className="mt-6 rounded-xl bg-red-50 p-5 text-red-800">{formError ?? error}</p>}
      {!loading && !error && cart?.items.length === 0 && (
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Tu carrito está vacío.</p>
          <Link className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white" to="/catalogo">Volver al catálogo</Link>
        </section>
      )}
      {!loading && cart && cart.items.length > 0 && (
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_21rem]">
          <form className="surface-card space-y-6 rounded-xl p-5 sm:p-7" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Datos de envío</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Completa la información de la persona que recibirá el pedido.</p>
            </div>
            {hasUnavailableItems && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hay productos sin stock suficiente. Vuelve al carrito y ajusta las cantidades.</p>}
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Nombre de quien recibe
              <input autoComplete="name" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" defaultValue={user?.name ?? ''} maxLength={100} minLength={2} name="recipientName" required />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Teléfono
              <input autoComplete="tel" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" maxLength={20} minLength={8} name="phone" pattern="[+0-9 ()-]+" required />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Dirección
              <input autoComplete="street-address" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" maxLength={200} minLength={5} name="address" required />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Comuna
                <input autoComplete="address-level2" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" maxLength={80} minLength={2} name="commune" required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Región
                <select autoComplete="address-level1" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" name="region" onChange={(event) => setRegion(event.target.value)} required value={region}>{chileanRegions.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-slate-900">Tipo de despacho</legend>
              {shippingError && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{shippingError}</p>}
              {shippingQuotes.map((quote) => <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition has-[:checked]:border-red-500 has-[:checked]:bg-red-50" key={quote.method}>
                <input checked={shippingMethod === quote.method} className="mt-1 accent-red-700" name="shippingMethod" onChange={() => setShippingMethod(quote.method)} type="radio" value={quote.method} />
                <span className="flex flex-1 justify-between gap-3"><span><span className="block text-sm font-bold text-slate-900">{quote.label}</span><span className="mt-1 block text-xs text-slate-500">Entrega estimada: {quote.minDays === quote.maxDays ? `${quote.maxDays} días hábiles` : `${quote.minDays} a ${quote.maxDays} días hábiles`}</span></span><span className="text-sm font-semibold text-slate-800">{formatPrice(quote.priceClp)}</span></span>
              </label>)}
              <p className="text-xs leading-5 text-slate-500">Simulación de ElectroStore para el proyecto; no requiere empresa de transporte. La fecha es referencial y el seguimiento se actualiza desde el estado del pedido.</p>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-slate-900">Método de pago</legend>
              <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 transition has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                <input className="mt-1 accent-red-700" defaultChecked name="paymentMethod" type="radio" value="webpay" />
                <span><span className="block text-sm font-bold text-slate-900">Webpay</span><span className="mt-1 block text-xs leading-5 text-slate-500">Serás redirigido a Webpay para completar el pago.</span></span>
              </label>
            </fieldset>
            {formError && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
            <button className="w-full rounded-full bg-[var(--color-brand)] px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-[var(--color-brand-dark)] disabled:cursor-wait disabled:opacity-60" disabled={submitting || hasUnavailableItems || !selectedQuote || Boolean(shippingError)} type="submit">
              {submitting ? 'Creando pedido…' : 'Crear pedido'}
            </button>
          </form>
          <aside className="surface-card h-fit rounded-xl p-5 lg:sticky lg:top-44">
            <h2 className="text-lg font-bold text-slate-950">Resumen de compra</h2>
            <ul className="mt-4 space-y-3">
              {cart.items.map((item) => (
                <li className="flex justify-between gap-4 text-sm" key={item.id}>
                  <span className="text-slate-600">{item.product.name} × {item.quantity}</span>
                  <span className="shrink-0 font-medium text-slate-800">{formatPrice(item.lineSubtotalClp)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-sm text-slate-600">
              <span>Envío</span><span>{selectedQuote ? formatPrice(selectedQuote.priceClp) : 'Calculando…'}</span>
            </div>
            <div className="mt-3 flex justify-between font-bold text-slate-950">
              <span>Total</span><span>{formatPrice(cart.subtotalClp + (selectedQuote?.priceClp ?? 0))}</span>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
