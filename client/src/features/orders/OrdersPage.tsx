import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../catalog/catalog.api';
import { fetchOrders, orderStatusLabel, type Order } from './orders.api';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((result) => { if (active) setOrders(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los pedidos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Tu cuenta</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Mis pedidos</h1>
      {loading && <p className="py-12 text-center text-slate-600">Cargando tus pedidos…</p>}
      {!loading && error && <p className="mt-6 rounded-xl bg-red-50 p-5 text-red-800">{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Todavía no tienes pedidos.</p>
          <Link className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white" to="/catalogo">Explorar catálogo</Link>
        </section>
      )}
      {!loading && !error && orders.length > 0 && (
        <div className="mt-7 space-y-4">
          {orders.map((order) => (
            <Link className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-300" key={order.id} to={'/pedidos/' + order.id}>
              <div>
                <p className="font-semibold text-slate-950">{order.orderNumber}</p>
                <p className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleString('es-CL')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-950">{formatPrice(order.totalClp)}</p>
                <p className="mt-1 text-sm text-slate-600">{orderStatusLabel(order.status)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
