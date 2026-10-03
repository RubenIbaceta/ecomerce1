import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProduct, formatPrice, type Product } from './catalog.api';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';

function specificationRows(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const separator = line.indexOf(':');
    return separator > 0
      ? { label: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() }
      : { label: 'Detalle', value: line };
  });
}

export default function ProductPage() {
  const { slug = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchProduct(slug, controller.signal)
      .then(setProduct)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el producto.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, reload]);

  async function addToCart() {
    if (!product) return;
    setAdding(true);
    setCartError(null);
    setCartMessage(null);
    try {
      await addItem(product.id);
      setCartMessage('Producto agregado a tu carrito.');
    } catch (cause) {
      setCartError(cause instanceof Error ? cause.message : 'No fue posible agregar el producto.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-brand)] hover:underline" to="/catalogo">← Volver al catálogo</Link>
      {loading && <p className="py-16 text-center text-slate-600">Cargando producto…</p>}
      {!loading && error && <div role="alert" className="mt-8 rounded-xl bg-red-50 p-5 text-red-800"><p>{error}</p><button className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => setReload((value) => value + 1)} type="button">Reintentar</button></div>}
      {!loading && !error && product && (
        <article className="mt-7 grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:grid-cols-2">
          <div className="flex min-h-80 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8 sm:min-h-[480px]">
            {product.imageUrl ? <img alt={product.name} className="h-full max-h-[560px] w-full object-contain" src={product.imageUrl} /> : <span aria-hidden="true" className="grid size-28 place-items-center rounded-full bg-blue-50 text-7xl text-blue-700">✦</span>}
          </div>
          <div className="p-6 sm:p-9 lg:p-12">
            <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-800">{product.category.name}</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{product.name}</h1>
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Precio Webpay</p>
              <p className="text-3xl font-black tracking-tight text-slate-950">{formatPrice(product.priceClp)}</p>
              {product.transferPriceClp !== null
                ? <p className="text-sm text-slate-700">Transferencia / depósito: <strong>{formatPrice(product.transferPriceClp)}</strong></p>
                : <p className="text-sm text-slate-500">Transferencia / depósito: precio por consultar.</p>}
              <p className="text-xs leading-5 text-slate-500">El pago en línea disponible actualmente se procesa con Webpay.</p>
            </div>
            <div className="my-6 h-px bg-slate-200" />
            <p className="leading-7 text-slate-600">{product.description}</p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm"><p className={`inline-flex items-center gap-2 font-bold ${product.stock > 0 ? 'text-emerald-700' : 'text-slate-500'}`}><span aria-hidden="true" className={`size-2 rounded-full ${product.stock > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`} />{product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock por ahora'}</p><p className="text-slate-600">Condición: <strong className="text-slate-900">{product.condition}</strong></p><p className="text-slate-600">SKU: <strong className="text-slate-900">{product.sku}</strong></p></div>
            <div className="mt-7 grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2">
              <section>
                <h2 className="text-lg font-bold text-slate-950">Características del producto</h2>
                {product.features.length > 0 ? <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{product.features.map((feature) => <li className="flex gap-2" key={feature}><span aria-hidden="true" className="font-bold text-blue-700">✓</span><span>{feature}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Características por confirmar.</p>}
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-950">Especificaciones del producto</h2>
                {specificationRows(product.specifications).length > 0 ? <dl className="mt-3 divide-y divide-slate-100 text-sm">{specificationRows(product.specifications).map((row, index) => <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 py-2" key={`${row.label}-${index}`}><dt className="font-medium text-slate-600">{row.label}</dt><dd className="text-right text-slate-800">{row.value}</dd></div>)}</dl> : <p className="mt-3 text-sm text-slate-500">Especificaciones por confirmar.</p>}
              </section>
            </div>
            {product.stock > 0 && user && (
              <button className="mt-7 block w-full rounded-xl bg-[var(--color-brand)] px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-56" disabled={adding} onClick={() => void addToCart()} type="button">
                {adding ? 'Agregando…' : 'Agregar al carrito'}
              </button>
            )}
            {product.stock > 0 && !user && !authLoading && (
              <Link className="mt-7 inline-flex rounded-xl bg-[var(--color-brand)] px-5 py-3.5 font-bold text-white transition hover:bg-blue-800" to="/ingresar">
                Inicia sesión para agregar
              </Link>
            )}
            {cartMessage && <p aria-live="polite" className="mt-3 text-sm font-medium text-green-700">{cartMessage} <Link className="underline" to="/carrito">Ver carrito</Link></p>}
            {cartError && <p aria-live="polite" className="mt-3 text-sm text-red-700">{cartError}</p>}
          </div>
        </article>
      )}
    </main>
  );
}
