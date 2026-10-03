import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatPrice } from '../catalog/catalog.api';
import { fetchOrders, orderStatusLabel, type Order } from './orders.api';

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const webpayResult = searchParams.get('webpay');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchOrders()
      .then((result) => { if (active) setOrders(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los pedidos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">Tu cuenta</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Mis pedidos</h1>
      <p className="mt-3 text-sm text-slate-600">Revisa los detalles y el estado de tus compras.</p>
      {webpayResult === 'review' && <p aria-live="polite" className="mt-5 rounded-xl bg-amber-50 p-5 text-amber-900">No pudimos reconocer el retorno de Webpay. Abre un pedido y actualiza su estado.</p>}
      {loading && <p className="py-12 text-center text-slate-600">Cargando tus pedidos…</p>}
      {!loading && error && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-5 text-red-800"><p>{error}</p><button className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => setReload((value) => value + 1)} type="button">Reintentar</button></div>}
      {!loading && !error && orders.length === 0 && (
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Todavía no tienes pedidos.</p>
          <Link className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white" to="/catalogo">Explorar catálogo</Link>
        </section>
      )}
      {!loading && !error && orders.length > 0 && (
        <div className="mt-7 space-y-4">
          {orders.map((order) => (
            <Link className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md" key={order.id} to={'/pedidos/' + order.id}>
              <div>
                <p className="font-semibold text-slate-950">{order.orderNumber}</p>
                <p className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleString('es-CL')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-950">{formatPrice(order.totalClp)}</p>
                <p className="mt-1 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{orderStatusLabel(order.status)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
