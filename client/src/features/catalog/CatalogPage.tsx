import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchCategories, fetchProducts, formatPrice, type Category, type Product } from './catalog.api';

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
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Encuentra tu próximo equipo</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Catálogo</h1>
      </div>

      <form key={searchParams.toString()} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-6" onSubmit={submitFilters}>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Buscar
          <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" defaultValue={query} name="q" placeholder="Notebook, audífonos…" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Categoría
          <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" defaultValue={category} name="category">
            <option value="">Todas</option>
            {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Precio desde
          <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" defaultValue={minPrice} min="0" name="minPrice" type="number" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Precio hasta
          <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" defaultValue={maxPrice} min="0" name="maxPrice" type="number" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Ordenar
          <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" defaultValue={sort} name="sort">
            <option value="newest">Más recientes</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
            <option value="name_asc">Nombre</option>
          </select>
        </label>
        <div className="flex items-end sm:col-span-2 lg:col-span-6">
          <button className="w-full rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800 sm:w-auto" type="submit">Aplicar filtros</button>
        </div>
      </form>

      <section aria-live="polite" className="mt-8">
        {categoryError && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-4 text-amber-900">{categoryError} Los filtros de categoría podrían no estar disponibles.</p>}
        {loading && <p className="py-12 text-center text-slate-600" role="status">Cargando productos…</p>}
        {!loading && error && <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-800"><p>{error}</p><button className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => setReload((value) => value + 1)} type="button">Reintentar</button></div>}
        {!loading && !error && listing?.data.length === 0 && <div className="rounded-xl bg-white p-8 text-center text-slate-600"><p>No encontramos productos con esos filtros.</p><button className="mt-4 font-semibold text-blue-700 underline" onClick={() => setSearchParams({})} type="button">Limpiar filtros</button></div>}
        {!loading && !error && listing && listing.data.length > 0 && (
          <>
            <p className="mb-4 text-sm text-slate-600">{listing.pagination.total} productos</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listing.data.map((product) => (
                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white" key={product.id}>
                  <Link aria-label={`Ver ${product.name}`} className="block" to={`/productos/${product.slug}`}>
                    <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100">
                      {product.imageUrl ? <img alt={product.name} className="h-full w-full object-contain p-3" src={product.imageUrl} /> : <span aria-hidden="true" className="text-5xl text-blue-700">✦</span>}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{product.category.name}</p>
                      <h2 className="mt-2 text-lg font-semibold text-slate-950">{product.name}</h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p>
                      <p className="mt-4 text-xl font-bold text-slate-950">{formatPrice(product.priceClp)}</p>
                    </div>
                  </Link>
                </article>
              ))}
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
