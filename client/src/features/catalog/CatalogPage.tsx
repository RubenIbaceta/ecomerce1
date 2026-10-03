import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCategories, fetchProducts, type Category, type Product } from './catalog.api';
import ProductCard from './ProductCard';

type Listing = {
  data: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? '1');

  useEffect(() => {
    const controller = new AbortController();
    setCategoryError(null);
    fetchCategories(controller.signal)
      .then(setCategories)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setCategoryError(cause instanceof Error ? cause.message : 'No se pudieron cargar las categorías.');
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(searchParams);
    params.set('page', String(Math.max(1, page)));
    setLoading(true);
    setError(null);
    fetchProducts(params, controller.signal)
      .then(setListing)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los productos.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [searchParams, page, reload]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of ['q', 'category', 'minPrice', 'maxPrice', 'sort']) {
      const value = String(formData.get(key) ?? '').trim();
      if (value) next.set(key, value);
    }
    next.set('page', '1');
    setSearchParams(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[var(--color-deep)] px-6 py-9 text-white shadow-[0_22px_50px_rgb(71_39_34/12%)] sm:px-10 sm:py-12">
        <div aria-hidden="true" className="absolute -right-24 -top-28 size-72 rounded-full border-[42px] border-white/5" />
        <p className="relative border-l-2 border-[#ef7777] pl-3 text-xs font-bold uppercase tracking-[0.16em] text-[#f4cfcc]">Encuentra tu próximo equipo</p>
        <h1 className="relative mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Catálogo</h1>
        <p className="relative mt-3 max-w-2xl text-sm leading-6 text-[#dccdc4]">Compara productos, precios y especificaciones para elegir con toda la información a la vista.</p>
      </div>

      <form key={searchParams.toString()} className="surface-card mt-7 grid gap-4 rounded-xl p-5 sm:grid-cols-2 lg:grid-cols-6 lg:p-6" onSubmit={submitFilters}>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Buscar
          <input className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" defaultValue={query} name="q" placeholder="Notebook, audífonos…" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Categoría
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" defaultValue={category} name="category">
            <option value="">Todas</option>
            {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Precio desde
          <input className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" defaultValue={minPrice} min="0" name="minPrice" type="number" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Precio hasta
          <input className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" defaultValue={maxPrice} min="0" name="maxPrice" type="number" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Ordenar
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" defaultValue={sort} name="sort">
            <option value="newest">Más recientes</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
            <option value="name_asc">Nombre</option>
          </select>
        </label>
        <div className="flex items-end sm:col-span-2 lg:col-span-6">
          <button className="w-full rounded-full bg-[var(--color-brand)] px-6 py-3 font-bold text-white shadow-sm transition hover:bg-[var(--color-brand-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto" type="submit">Aplicar filtros</button>
        </div>
      </form>

      <section aria-live="polite" className="mt-8">
        {categoryError && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-4 text-amber-900">{categoryError} Los filtros de categoría podrían no estar disponibles.</p>}
        {loading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Cargando productos">{Array.from({ length: 6 }, (_, index) => <div className="surface-card overflow-hidden rounded-xl" key={index}><div className="skeleton aspect-[4/3]" /><div className="space-y-3 p-5"><div className="skeleton h-3 w-1/3 rounded" /><div className="skeleton h-5 w-4/5 rounded" /><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-10 w-1/2 rounded" /></div></div>)}</div>}
        {!loading && error && <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-800"><p>{error}</p><button className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => setReload((value) => value + 1)} type="button">Reintentar</button></div>}
        {!loading && !error && listing?.data.length === 0 && <div className="rounded-xl bg-white p-8 text-center text-slate-600"><p>No encontramos productos con esos filtros.</p><button className="mt-4 font-semibold text-blue-700 underline" onClick={() => setSearchParams({})} type="button">Limpiar filtros</button></div>}
        {!loading && !error && listing && listing.data.length > 0 && (
          <>
            <p className="mb-4 text-sm text-slate-600">{listing.pagination.total} productos</p>
            <div className="reveal-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listing.data.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {listing.pagination.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => changePage(page - 1)} type="button">Anterior</button>
                <span className="text-sm text-slate-600">Página {page} de {listing.pagination.pages}</span>
                <button className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40" disabled={page >= listing.pagination.pages} onClick={() => changePage(page + 1)} type="button">Siguiente</button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
