import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProduct, formatPrice, type Product } from './catalog.api';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [slug]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <Link className="text-sm font-medium text-blue-700 hover:underline" to="/catalogo">← Volver al catálogo</Link>
      {loading && <p className="py-16 text-center text-slate-600">Cargando producto…</p>}
      {!loading && error && <p className="mt-8 rounded-xl bg-red-50 p-5 text-red-800">{error}</p>}
      {!loading && !error && product && (
        <article className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-blue-100">
            {product.imageUrl ? <img alt={product.name} className="h-full w-full object-cover" src={product.imageUrl} /> : <span aria-hidden="true" className="text-7xl text-blue-700">✦</span>}
          </div>
          <div className="py-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{product.category.name}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{product.name}</h1>
            <p className="mt-5 text-2xl font-bold text-slate-950">{formatPrice(product.priceClp)}</p>
            <p className="mt-6 leading-7 text-slate-600">{product.description}</p>
            <p className="mt-6 text-sm text-slate-600">{product.stock > 0 ? 'Disponible' : 'Sin stock por ahora'}</p>
          </div>
        </article>
      )}
    </main>
  );
}
