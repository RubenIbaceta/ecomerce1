import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProduct, formatPrice, type Product } from './catalog.api';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';

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
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <Link className="text-sm font-medium text-blue-700 hover:underline" to="/catalogo">← Volver al catálogo</Link>
      {loading && <p className="py-16 text-center text-slate-600">Cargando producto…</p>}
      {!loading && error && <div role="alert" className="mt-8 rounded-xl bg-red-50 p-5 text-red-800"><p>{error}</p><button className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => setReload((value) => value + 1)} type="button">Reintentar</button></div>}
      {!loading && !error && product && (
        <article className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-blue-100">
            {product.imageUrl ? <img alt={product.name} className="h-full w-full object-contain p-4" src={product.imageUrl} /> : <span aria-hidden="true" className="text-7xl text-blue-700">✦</span>}
          </div>
          <div className="py-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{product.category.name}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{product.name}</h1>
            <p className="mt-5 text-2xl font-bold text-slate-950">{formatPrice(product.priceClp)}</p>
            <p className="mt-6 leading-7 text-slate-600">{product.description}</p>
            <p className="mt-6 text-sm text-slate-600">{product.stock > 0 ? 'Disponible' : 'Sin stock por ahora'}</p>
            {product.stock > 0 && user && (
              <button className="mt-6 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={adding} onClick={() => void addToCart()} type="button">
                {adding ? 'Agregando…' : 'Agregar al carrito'}
              </button>
            )}
            {product.stock > 0 && !user && !authLoading && (
              <Link className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800" to="/ingresar">
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
