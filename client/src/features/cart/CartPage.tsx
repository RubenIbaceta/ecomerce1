import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../catalog/catalog.api';
import { useCart } from './CartContext';

export default function CartPage() {
  const { cart, loading, error, updateQuantity, removeItem } = useCart();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  async function update(itemId: string, quantity: number) {
    setBusyItem(itemId);
    setActionError(null);
    try {
      await updateQuantity(itemId, quantity);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No fue posible actualizar la cantidad.');
    } finally {
      setBusyItem(null);
    }
  }

  async function remove(itemId: string) {
    setBusyItem(itemId);
    setActionError(null);
    try {
      await removeItem(itemId);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No fue posible quitar el producto.');
    } finally {
      setBusyItem(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Tu compra</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Carrito</h1>
      {loading && <p className="py-12 text-center text-slate-600">Cargando tu carrito…</p>}
      {!loading && (error || actionError) && (
        <p aria-live="polite" className="mt-6 rounded-xl bg-red-50 p-5 text-red-800">{actionError ?? error}</p>
      )}
      {!loading && !error && cart?.items.length === 0 && (
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Todavía no agregas productos.</p>
          <Link className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800" to="/catalogo">
            Explorar catálogo
          </Link>
        </section>
      )}
      {!loading && !error && cart && cart.items.length > 0 && (
        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_19rem]">
          <section aria-label="Productos en tu carrito" className="space-y-4">
            {cart.items.map((item) => (
              <article className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" key={item.id}>
                <Link aria-label={'Ver ' + item.product.name} className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100" to={'/productos/' + item.product.slug}>
                  {item.product.imageUrl
                    ? <img alt={item.product.name} className="h-full w-full object-cover" src={item.product.imageUrl} />
                    : <span aria-hidden="true" className="text-3xl text-blue-700">✦</span>}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{item.product.categoryName}</p>
                  <Link className="mt-1 block font-semibold text-slate-950 hover:text-blue-700" to={'/productos/' + item.product.slug}>{item.product.name}</Link>
                  <p className="mt-1 text-sm text-slate-600">{formatPrice(item.product.priceClp)} c/u</p>
                  {!item.available && <p className="mt-2 text-sm font-medium text-red-700">Stock insuficiente; ajusta o quita este producto.</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div aria-label={'Cantidad de ' + item.product.name} className="flex items-center rounded-lg border border-slate-300">
                      <button aria-label="Reducir cantidad" className="px-3 py-1.5 text-slate-700 disabled:opacity-40" disabled={busyItem === item.id || item.quantity <= 1} onClick={() => void update(item.id, item.quantity - 1)} type="button">−</button>
                      <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button aria-label="Aumentar cantidad" className="px-3 py-1.5 text-slate-700 disabled:opacity-40" disabled={busyItem === item.id || item.quantity >= Math.min(item.stock, 99)} onClick={() => void update(item.id, item.quantity + 1)} type="button">+</button>
                    </div>
                    <button className="text-sm font-medium text-slate-500 underline hover:text-red-700 disabled:opacity-50" disabled={busyItem === item.id} onClick={() => void remove(item.id)} type="button">Quitar</button>
                    <span className="ml-auto font-bold text-slate-950">{formatPrice(item.lineSubtotalClp)}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Resumen</h2>
            <div className="mt-5 flex justify-between text-sm text-slate-600">
              <span>Productos ({cart.itemCount})</span>
              <span>{formatPrice(cart.subtotalClp)}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 font-bold text-slate-950">
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotalClp)}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">El envío y el pago se calcularán en la siguiente fase.</p>
            <Link className="mt-5 inline-flex w-full justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/catalogo">
              Seguir comprando
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
