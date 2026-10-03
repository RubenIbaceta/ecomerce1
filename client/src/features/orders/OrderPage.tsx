import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCart } from '../cart/CartContext';
import { formatPrice } from '../catalog/catalog.api';
import { cancelOrder, fetchOrder, orderStatusLabel, requestOrderReturn, startWebpayPayment, type Order } from './orders.api';

export default function OrderPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [retryingPurchase, setRetryingPurchase] = useState(false);
  const webpayResult = searchParams.get('webpay');
  const paymentMethod = (location.state as { paymentMethod?: 'webpay' } | null)?.paymentMethod;
  const autoPaymentStarted = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrder(await fetchOrder(orderId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el pedido.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!order || order.status !== 'PENDING_PAYMENT' || !paymentMethod || autoPaymentStarted.current) return;
    autoPaymentStarted.current = true;
    setBusy(true);
    setError(null);

    void (async () => {
      try {
        const checkout = await startWebpayPayment(order.id);
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = checkout.url;
        const token = document.createElement('input');
        token.type = 'hidden';
        token.name = 'token_ws';
        token.value = checkout.token;
        form.append(token);
        document.body.append(form);
        form.submit();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No fue posible iniciar el método de pago elegido.');
        setBusy(false);
      }
    })();
  }, [order, paymentMethod]);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      setOrder(await cancelOrder(orderId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cancelar el pedido.');
    } finally {
      setBusy(false);
    }
  }

  async function payWithWebpay() {
    setBusy(true);
    setError(null);
    try {
      const checkout = await startWebpayPayment(orderId);
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkout.url;
      const token = document.createElement('input');
      token.type = 'hidden';
      token.name = 'token_ws';
      token.value = checkout.token;
      form.append(token);
      document.body.append(form);
      form.submit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible iniciar Webpay.');
      setBusy(false);
    }
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    setBusy(true); setError(null);
    try {
      await requestOrderReturn(order.id, returnReason);
      setOrder(await fetchOrder(order.id));
      setReturnFormOpen(false);
      setReturnReason('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo enviar la solicitud.'); }
    finally { setBusy(false); }
  }

  async function addOrderToCartAgain() {
    if (!order) return;
    setRetryingPurchase(true); setError(null);
    try {
      for (const item of order.items) await addItem(item.productId, item.quantity);
      navigate('/carrito');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron agregar todos los productos al carrito.'); }
    finally { setRetryingPurchase(false); }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link className="text-sm font-bold text-[var(--color-brand)] hover:underline" to="/pedidos">← Volver a mis pedidos</Link>
      {loading && <p className="py-12 text-center text-slate-600">Cargando el pedido…</p>}
      {!loading && error && !order && <p className="mt-6 rounded-xl bg-red-50 p-5 text-red-800">{error}</p>}
      {!loading && order && (
        <>
          <div className="relative mt-6 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-[1.5rem] bg-[var(--color-deep)] p-6 text-white shadow-[0_22px_50px_rgb(71_39_34/12%)] sm:p-8">
            <span aria-hidden="true" className="absolute -right-12 -top-20 size-52 rounded-full border-[30px] border-white/5" />
            <div>
              <p className="border-l-2 border-[#ef7777] pl-3 text-xs font-bold uppercase tracking-[0.14em] text-[#f4cfcc]">Pedido</p>
              <h1 className="mt-3 text-4xl font-bold">{order.orderNumber}</h1>
            </div>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">{orderStatusLabel(order.status)}</span>
          </div>
          {error && <p aria-live="polite" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          {webpayResult === 'paid' && <p aria-live="polite" className="mt-6 rounded-xl bg-green-50 p-5 text-green-800">Webpay confirmó tu pago.</p>}
          {webpayResult === 'failed' && <p aria-live="polite" className="mt-6 rounded-xl bg-amber-50 p-5 text-amber-900">El pago no fue autorizado o se canceló en Webpay. Se liberó la reserva de stock.</p>}
          {webpayResult === 'review' && <p aria-live="polite" className="mt-6 rounded-xl bg-amber-50 p-5 text-amber-900">No pudimos confirmar el resultado con Webpay. Actualiza el pedido antes de volver a intentarlo.</p>}
          {order.status === 'PENDING_PAYMENT' && (
            <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
              <p className="text-sm leading-6 text-blue-950">Completa el pago con Webpay. La reserva de productos vence el {new Date(order.reservationExpiresAt).toLocaleString('es-CL')}.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-full bg-[var(--color-brand)] px-5 py-3 font-bold text-white transition hover:bg-[var(--color-brand-dark)] disabled:opacity-60" disabled={busy} onClick={() => void payWithWebpay()} type="button">
                  {busy ? 'Conectando…' : 'Pagar con Webpay'}
                </button>
                <button className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60" disabled={busy} onClick={() => void cancel()} type="button">
                  Cancelar pedido
                </button>
              </div>
            </section>
          )}
          {order.status === 'PAID' && <p className="mt-6 rounded-xl bg-green-50 p-5 text-green-800">{order.payments.some((payment) => payment.provider === 'WEBPAY' && payment.status === 'APPROVED') ? 'Webpay confirmó tu pago.' : 'Pago confirmado.'}</p>}
          {order.status === 'CANCELLED' && <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-950">Pedido cancelado y stock liberado</h2><p className="mt-1 text-sm text-amber-900">Puedes volver a agregar los productos al carrito. Se comprobará el stock disponible y el precio vigente.</p><button className="mt-4 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={retryingPurchase} onClick={() => void addOrderToCartAgain()} type="button">{retryingPurchase ? 'Agregando…' : 'Volver a intentar la compra'}</button></section>}
          {!['CANCELLED', 'PENDING_PAYMENT'].includes(order.status) && <section aria-label="Seguimiento del pedido" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-950">Seguimiento</h2><ol className="mt-4 grid gap-3 sm:grid-cols-4">{(['PAID', 'PREPARING', 'SHIPPED', 'COMPLETED'] as const).map((step, index) => { const current = ['PAID', 'PREPARING', 'SHIPPED', 'COMPLETED'].indexOf(order.status); const reached = index <= current; return <li className={`rounded-xl border p-3 ${reached ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`} key={step}><p className={`text-sm font-bold ${reached ? 'text-blue-900' : 'text-slate-500'}`}>{['Pago confirmado', 'En preparación', 'Enviado', 'Entregado'][index]}</p><p className="mt-1 text-xs text-slate-500">{index < current ? 'Completado' : index === current ? 'Estado actual' : 'Pendiente'}</p></li>; })}</ol><p className="mt-3 text-xs text-slate-500">Seguimiento interno asociado al pedido {order.orderNumber}; el estado lo actualiza la administración.</p></section>}
          {order.returnRequest ? <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-950">Solicitud de devolución</h2><p className="mt-2 text-sm text-slate-700">Estado: <strong>{{ REQUESTED: 'En revisión', PROCESSING: 'Reembolso en proceso', REFUNDED: 'Reembolso registrado', REJECTED: 'Solicitud rechazada' }[order.returnRequest.status]}</strong></p><p className="mt-1 text-sm text-slate-600">Motivo: {order.returnRequest.reason}</p>{order.returnRequest.adminNote && <p className="mt-2 text-xs text-slate-500">{order.returnRequest.adminNote}</p>}</section> : order.paidAt && ['PAID', 'PREPARING', 'SHIPPED', 'COMPLETED'].includes(order.status) && Date.now() - new Date(order.paidAt).getTime() <= 30 * 24 * 60 * 60 * 1000 && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-950">¿Necesitas devolver tu compra?</h2><p className="mt-1 text-sm text-slate-600">Puedes solicitar una devolución dentro de los 30 días desde el pago. La tienda revisará el caso antes de procesar el reembolso.</p>{returnFormOpen ? <form className="mt-4 space-y-3" onSubmit={(event) => void submitReturn(event)}><label className="block text-sm font-medium text-slate-700">Motivo<textarea className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={1000} minLength={10} onChange={(event) => setReturnReason(event.target.value)} required rows={3} value={returnReason} /></label><div className="flex gap-3"><button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? 'Enviando…' : 'Enviar solicitud'}</button><button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold" onClick={() => setReturnFormOpen(false)} type="button">Cancelar</button></div></form> : <button className="mt-4 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-blue-700" onClick={() => setReturnFormOpen(true)} type="button">Solicitar devolución</button>}<p className="mt-3 text-xs text-slate-500">El inventario solo se actualiza después de recibir y revisar el producto.</p></section>}
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_21rem]">
            <section className="surface-card rounded-xl p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-950">Productos</h2>
              <ul className="mt-4 divide-y divide-slate-100">
                {order.items.map((item) => (
                  <li className="flex justify-between gap-4 py-4 first:pt-0 last:pb-0" key={item.id}>
                    <div>
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="mt-1 text-sm text-slate-500">SKU {item.sku} · {item.quantity} × {formatPrice(item.unitPriceClp)}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-slate-900">{formatPrice(item.unitPriceClp * item.quantity)}</p>
                  </li>
                ))}
              </ul>
            </section>
            <aside className="surface-card h-fit rounded-xl p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-950">Entrega y total</h2>
              <p className="mt-4 font-medium text-slate-800">{order.recipientName}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{order.address}, {order.commune}, {order.region}<br />{order.phone}</p>
              <p className="mt-3 text-sm text-slate-600">{order.shippingMethod === 'EXPRESS' ? 'Despacho prioritario' : 'Despacho estándar'} · estimado hasta {new Date(order.estimatedDeliveryAt).toLocaleDateString('es-CL')}</p>
              <div className="mt-5 flex justify-between border-t border-slate-200 pt-4 text-sm text-slate-600"><span>Subtotal</span><span>{formatPrice(order.subtotalClp)}</span></div>
              <div className="mt-2 flex justify-between text-sm text-slate-600"><span>Envío</span><span>{formatPrice(order.shippingClp)}</span></div>
              <div className="mt-3 flex justify-between border-t border-slate-200 pt-4 font-bold text-slate-950"><span>Total</span><span>{formatPrice(order.totalClp)}</span></div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
