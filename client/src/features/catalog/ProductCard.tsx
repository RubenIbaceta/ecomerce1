import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import { formatPrice, type Product } from './catalog.api';
import { StoreIcon } from '../../app/StoreIcon';

export default function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function addToCart() {
    setAdding(true);
    setMessage(null);
    try {
      await addItem(product.id);
      setMessage('Agregado al carrito');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo agregar al carrito.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="product-card group flex flex-col overflow-hidden rounded-xl border transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <Link aria-label={`Ver ${product.name}`} className="block" to={`/productos/${product.slug}`}>
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f1ebe2] p-5">
          {product.imageUrl ? <img alt={product.name} className="h-full w-full object-contain transition duration-300 group-hover:scale-105" loading="lazy" src={product.imageUrl} /> : <span aria-hidden="true" className="grid size-20 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]"><StoreIcon className="size-9" name="product" /></span>}
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-brand)]">{product.category.name}</p>
            <span className={`border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${product.stock > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{product.stock > 0 ? 'Disponible' : 'Agotado'}</span>
          </div>
          <h2 className="mt-2 min-h-12 text-base font-bold leading-6 text-slate-900 group-hover:text-[var(--color-brand)]">{product.name}</h2>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{product.description}</p>
          <div className="mt-3 space-y-1 text-xs text-slate-600"><p>SKU: <span className="font-semibold text-slate-800">{product.sku}</span></p><p>Condición: <span className="font-semibold text-slate-800">{product.condition}</span></p><p>Stock: <span className="font-semibold text-slate-800">{product.stock} unidades</span></p></div>
          {product.features.length > 0 && <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-600">{product.features.slice(0, 2).map((feature) => <li className="line-clamp-1" key={feature}>{feature}</li>)}</ul>}
        </div>
      </Link>
      <div className="mt-auto px-5 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Precio otros medios de pago</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--color-ink)]">{formatPrice(product.priceClp)}</p>
        {product.transferPriceClp !== null && <p className="mt-1 text-sm text-slate-700">Transferencia/depósito: <strong>{formatPrice(product.transferPriceClp)}</strong></p>}
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          {user ? <button className="rounded-full bg-[var(--color-brand)] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--color-brand-dark)] disabled:cursor-wait disabled:opacity-60" disabled={adding || product.stock < 1} onClick={() => void addToCart()} type="button">{adding ? 'Agregando…' : 'Agregar al carrito'}</button> : <Link className="rounded-full bg-[var(--color-brand)] px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[var(--color-brand-dark)]" to="/ingresar">Inicia sesión</Link>}
          <Link aria-label={`Ver ${product.name}`} className="grid size-10 place-items-center rounded-full border border-[#d5c9bc] text-slate-700 transition hover:border-red-300 hover:text-[var(--color-brand)]" to={`/productos/${product.slug}`}>→</Link>
        </div>
        {message && <p aria-live="polite" className="mt-2 text-xs text-slate-600">{message}</p>}
      </div>
    </article>
  );
}
