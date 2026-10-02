import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPrice } from '../catalog/catalog.api';
import { cancelOrder, fetchOrder, orderStatusLabel, payDemoOrder, type Order } from './orders.api';

export default function OrderPage() {
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      setOrder(await payDemoOrder(orderId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible simular el pago.');
    } finally {
      setBusy(false);
    }
  }

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

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <Link className="text-sm font-medium text-blue-700 hover:underline" to="/pedidos">← Volver a mis pedidos</Link>
      {loading && <p className="py-12 text-center text-slate-600">Cargando el pedido…</p>}
      {!loading && error && !order && <p className="mt-6 rounded-xl bg-red-50 p-5 text-red-800">{error}</p>}
      {!loading && order && (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pedido</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">{order.orderNumber}</h1>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{orderStatusLabel(order.status)}</span>
          </div>
          {error && <p aria-live="polite" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          {order.status === 'PENDING_PAYMENT' && (
            <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm leading-6 text-blue-950">Pago de demostración: no se realizará ningún cobro. La reserva vence el {new Date(order.reservationExpiresAt).toLocaleString('es-CL')}.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={busy} onClick={() => void pay()} type="button">
                  {busy ? 'Procesando…' : 'Pagar en modo demo'}
                </button>
                <button className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60" disabled={busy} onClick={() => void cancel()} type="button">
                  Cancelar pedido
                </button>
              </div>
            </section>
          )}
          {order.status === 'PAID' && <p className="mt-6 rounded-xl bg-green-50 p-5 text-green-800">Pago de demostración aprobado. No se realizó un cobro real.</p>}
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_18rem]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-950">Productos</h2>
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
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-950">Entrega y total</h2>
              <p className="mt-4 font-medium text-slate-800">{order.recipientName}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{order.address}, {order.commune}, {order.region}<br />{order.phone}</p>
              <div className="mt-5 flex justify-between border-t border-slate-200 pt-4 text-sm text-slate-600"><span>Subtotal</span><span>{formatPrice(order.subtotalClp)}</span></div>
              <div className="mt-2 flex justify-between text-sm text-slate-600"><span>Envío (demo)</span><span>{formatPrice(order.shippingClp)}</span></div>
              <div className="mt-3 flex justify-between border-t border-slate-200 pt-4 font-bold text-slate-950"><span>Total</span><span>{formatPrice(order.totalClp)}</span></div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
