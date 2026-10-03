import { Link, Route, Routes } from 'react-router-dom';
import HomeSlider from './HomeSlider';
import CatalogPage from '../features/catalog/CatalogPage';
import ProductPage from '../features/catalog/ProductPage';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import AdminPage from '../features/auth/AdminPage';
import LoginPage from '../features/auth/LoginPage';
import ProfilePage from '../features/auth/ProfilePage';
import ProtectedRoute from '../features/auth/ProtectedRoute';
import RegisterPage from '../features/auth/RegisterPage';
import CartPage from '../features/cart/CartPage';
import { CartProvider, useCart } from '../features/cart/CartContext';
import CheckoutPage from '../features/orders/CheckoutPage';
import OrderPage from '../features/orders/OrderPage';
import OrdersPage from '../features/orders/OrdersPage';

function HomePage() {
  return (
    <main className="min-h-[70vh]">
      <HomeSlider />
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <p className="text-center text-sm leading-6 text-slate-500">Una tienda de demostración para explorar tecnología, armar tu carrito y seguir tus pedidos.</p>
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link className="text-lg font-bold tracking-tight text-slate-950" to="/">
            Electro<span className="text-blue-700">Demo</span>
          </Link>
          <nav aria-label="Navegación principal">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end sm:gap-x-5">
              <Link className="text-sm font-medium text-slate-700 hover:text-blue-700" to="/catalogo">
              Catálogo
              </Link>
              {!loading && (user ? (
                <>
                  <Link className="text-sm font-medium text-slate-700 hover:text-blue-700" to="/carrito">
                    Carrito{cart && cart.itemCount > 0 ? ' (' + cart.itemCount + ')' : ''}
                  </Link>
                  <Link className="text-sm font-medium text-slate-700 hover:text-blue-700" to="/pedidos">Mis pedidos</Link>
                  {user.role === 'ADMIN' && <Link className="text-sm font-medium text-slate-700 hover:text-blue-700" to="/admin">Administración</Link>}
                  <Link className="text-sm font-medium text-slate-700 hover:text-blue-700" to="/perfil">Mi cuenta</Link>
                  <button
                    className="text-sm font-medium text-slate-700 hover:text-blue-700"
                    onClick={() => { void signOut(); }}
                    type="button"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link className="text-sm font-medium text-slate-700 hover:text-blue-700" to="/ingresar">Ingresar</Link>
                  <Link className="text-sm font-medium text-blue-700 hover:underline" to="/registro">Crear cuenta</Link>
                </>
              ))}
            </div>
          </nav>
        </div>
      </header>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<CatalogPage />} path="/catalogo" />
        <Route element={<ProductPage />} path="/productos/:slug" />
        <Route element={<LoginPage />} path="/ingresar" />
        <Route element={<RegisterPage />} path="/registro" />
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
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-slate-500">
          Electro Demo · Proyecto educativo de portafolio
        </div>
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
