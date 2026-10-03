import { useEffect, useState, type FormEvent } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import HomeSlider from './HomeSlider';
import CatalogPage from '../features/catalog/CatalogPage';
import ProductPage from '../features/catalog/ProductPage';
import { fetchCategories, type Category } from '../features/catalog/catalog.api';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import AdminPage from '../features/auth/AdminPage';
import LoginPage from '../features/auth/LoginPage';
import ProfilePage from '../features/auth/ProfilePage';
import ProtectedRoute from '../features/auth/ProtectedRoute';
import RegisterPage from '../features/auth/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from '../features/auth/PasswordPages';
import CartPage from '../features/cart/CartPage';
import { CartProvider, useCart } from '../features/cart/CartContext';
import CheckoutPage from '../features/orders/CheckoutPage';
import OrderPage from '../features/orders/OrderPage';
import OrdersPage from '../features/orders/OrdersPage';
import StoreInfoPage from './StoreInfoPage';

function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal)
      .then(setCategories)
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-[70vh]">
      <HomeSlider />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14" id="categorias">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Explora nuestras categorías</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Encuentra componentes, equipos y accesorios seleccionados para tu próxima configuración.</p>
          </div>
          <Link className="text-sm font-bold text-[var(--color-brand)] hover:underline" to="/catalogo">Ver todo el catálogo →</Link>
        </div>
        {loading && <p className="mt-6 text-sm text-slate-500" role="status">Cargando categorías…</p>}
        {!loading && error && <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="status">No pudimos cargar las categorías ahora. Puedes explorar el catálogo completo.</p>}
        {!loading && !error && categories.length === 0 && <p className="mt-6 text-sm text-slate-500">Las categorías aparecerán aquí cuando estén disponibles.</p>}
        {!loading && !error && categories.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <Link className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md sm:p-5" key={category.id} to={`/catalogo?category=${encodeURIComponent(category.slug)}`}>
                <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-blue-50 text-lg font-black text-[var(--color-brand)] transition group-hover:bg-[var(--color-brand)] group-hover:text-white">{category.name.slice(0, 1).toUpperCase()}</span>
                <span className="mt-4 block font-bold text-slate-900">{category.name}</span>
                <span className="mt-1 block min-h-10 text-xs leading-5 text-slate-500">{category.description ?? 'Encuentra productos seleccionados de esta categoría.'}</span>
                <span className="mt-2 block text-xs font-semibold text-[var(--color-brand)]">{category._count.products} productos</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="benefits-title" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14" id="beneficios">
        <h2 className="text-center text-2xl font-black tracking-tight text-slate-950 sm:text-3xl" id="benefits-title">Compra con confianza</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-600">Información clara y acompañamiento en cada etapa de tu compra.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Envíos', 'Ingresa tu dirección y consulta la información de entrega al comprar.', '↗'],
            ['Compra segura', 'Completa tu compra a través del método de pago disponible.', '✓'],
            ['Soporte', 'Consulta el estado de tus pedidos desde tu cuenta.', '?'],
            ['Garantía', 'Revisa la información de garantía asociada a cada producto.', '◇'],
          ].map(([title, description, icon]) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={title}><span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-blue-50 text-lg font-black text-[var(--color-brand)]">{icon}</span><h3 className="mt-4 font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></article>)}
        </div>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-950">Página no encontrada</h1>
      <Link className="mt-6 inline-block text-blue-700 underline" to="/">
        Volver al inicio
      </Link>
    </main>
  );
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [navCategories, setNavCategories] = useState<Category[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal).then(setNavCategories).catch(() => setNavCategories([]));
    return () => controller.abort();
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/catalogo?q=${encodeURIComponent(query)}` : '/catalogo');
  }

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-ink)]">
      <div className="bg-[var(--color-ink)] px-4 py-2 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
        Tecnología, computación y accesorios para tu día a día
      </div>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[auto_minmax(240px,1fr)_auto] lg:gap-8 lg:px-8">
          <Link aria-label="ElectroStore, inicio" className="w-fit text-2xl font-black tracking-tight text-slate-950" to="/">
            Electro<span className="text-[var(--color-brand)]">Store</span>
          </Link>
          <form className="order-3 flex w-full items-center rounded-xl border border-slate-300 bg-slate-50 p-1 focus-within:border-[var(--color-brand)] focus-within:ring-2 focus-within:ring-blue-100 lg:order-none" onSubmit={submitSearch} role="search">
            <label className="sr-only" htmlFor="site-search">Buscar productos</label>
            <input className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500" id="site-search" onChange={(event) => setSearch(event.target.value)} placeholder="Busca productos en el catálogo…" value={search} />
            <button className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" type="submit">Buscar</button>
          </form>
          <nav aria-label="Accesos de cuenta" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold sm:justify-end">
            {!loading && (user ? (
              <>
                <Link className="text-slate-700 transition hover:text-[var(--color-brand)]" to="/perfil">Mi cuenta</Link>
                <Link className="text-slate-700 transition hover:text-[var(--color-brand)]" to="/pedidos">Mis pedidos</Link>
                <Link className="text-slate-700 transition hover:text-[var(--color-brand)]" to="/carrito">Carrito{cart && cart.itemCount > 0 ? ` (${cart.itemCount})` : ''}</Link>
                {user.role === 'ADMIN' && <Link className="text-slate-700 transition hover:text-[var(--color-brand)]" to="/admin">Administración</Link>}
                <button className="text-slate-600 transition hover:text-[var(--color-brand)]" onClick={() => { void signOut(); }} type="button">Salir</button>
              </>
            ) : (
              <>
                <Link className="text-slate-700 transition hover:text-[var(--color-brand)]" to="/ingresar">Ingresar</Link>
                <Link className="rounded-lg bg-[var(--color-brand)] px-3 py-2 text-white transition hover:bg-blue-800" to="/registro">Crear cuenta</Link>
              </>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-100">
          <nav aria-label="Navegación por categorías" className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3 text-sm font-semibold sm:px-6 lg:px-8">
            <Link className="whitespace-nowrap text-[var(--color-brand)]" to="/catalogo">Todas las categorías</Link>
            {navCategories.map((category) => <Link className="whitespace-nowrap text-slate-600 transition hover:text-[var(--color-brand)]" key={category.id} to={`/catalogo?category=${encodeURIComponent(category.slug)}`}>{category.name}</Link>)}
          </nav>
        </div>
      </header>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<CatalogPage />} path="/catalogo" />
        <Route element={<ProductPage />} path="/productos/:slug" />
        <Route element={<LoginPage />} path="/ingresar" />
        <Route element={<RegisterPage />} path="/registro" />
        <Route element={<ForgotPasswordPage />} path="/recuperar-clave" />
        <Route element={<ResetPasswordPage />} path="/restablecer-clave" />
        <Route element={<VerifyEmailPage />} path="/verificar-correo" />
        <Route element={<StoreInfoPage />} path="/sobre-nosotros" />
        <Route element={<StoreInfoPage />} path="/contacto" />
        <Route element={<StoreInfoPage />} path="/informacion/:slug" />
        <Route element={<ProtectedRoute />} >
          <Route element={<ProfilePage />} path="/perfil" />
          <Route element={<CartPage />} path="/carrito" />
          <Route element={<CheckoutPage />} path="/checkout" />
          <Route element={<OrdersPage />} path="/pedidos" />
          <Route element={<OrderPage />} path="/pedidos/:orderId" />
        </Route>
        <Route element={<ProtectedRoute role="ADMIN" />}>
          <Route element={<AdminPage />} path="/admin" />
        </Route>
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
      <footer className="mt-12 bg-[var(--color-ink)] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lg:px-8">
          <div className="sm:col-span-2">
            <Link className="text-2xl font-black tracking-tight text-white" to="/">Electro<span className="text-blue-400">Store</span></Link>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Tecnología, computación y accesorios para acompañarte cada día.</p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Comprar</h2>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-400">
              <Link className="transition hover:text-white" to="/catalogo">Catálogo</Link>
              <Link className="transition hover:text-white" to="/carrito">Carrito</Link>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Ayuda</h2>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-400">
              <Link className="transition hover:text-white" to="/contacto">Contacto</Link>
              <Link className="transition hover:text-white" to="/informacion/despachos">Despachos y seguimiento</Link>
              <Link className="transition hover:text-white" to="/informacion/devoluciones">Cambios y devoluciones</Link>
              <Link className="transition hover:text-white" to="/pedidos">Mis pedidos</Link>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">ElectroStore</h2>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-400">
              <Link className="transition hover:text-white" to="/sobre-nosotros">Sobre nosotros</Link>
              <Link className="transition hover:text-white" to="/informacion/privacidad">Privacidad</Link>
              <Link className="transition hover:text-white" to="/informacion/terminos">Términos de compra</Link>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Mi cuenta</h2>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-400">
              <Link className="transition hover:text-white" to="/ingresar">Ingresar</Link>
              <Link className="transition hover:text-white" to="/registro">Crear cuenta</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} ElectroStore. Todos los derechos reservados.</div>
      </footer>
    </div>
  );
}

function CartEnabledApp() {
  const { user } = useAuth();
  return <CartProvider key={user?.id ?? 'anonymous'}><AppContent /></CartProvider>;
}

export default function App() {
  return <AuthProvider><CartEnabledApp /></AuthProvider>;
}
