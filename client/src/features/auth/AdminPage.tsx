import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { formatPrice } from '../catalog/catalog.api';
import {
  adminOrderStatusLabel,
  createAdminProduct,
  fetchAdminCategories,
  fetchAdminDashboard,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminReturnRequests,
  fetchAdminUsers,
  nextAdminOrderStatuses,
  updateAdminOrderStatus,
  updateAdminReturnRequest,
  updateAdminProduct,
  updateAdminUser,
  uploadAdminImage,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminDashboard,
  type AdminProduct,
  type AdminReturnRequest,
  type AdminUser,
  type ProductInput,
} from './admin.api';
import { useAuth } from './AuthContext';

type ProductForm = {
  categoryId: string;
  sku: string;
  name: string;
  description: string;
  features: string;
  specifications: string;
  condition: 'Nuevo' | 'Reacondicionado' | 'Usado';
  priceClp: string;
  transferPriceClp: string;
  stock: string;
  imageUrl: string;
};

const emptyForm: ProductForm = { categoryId: '', sku: '', name: '', description: '', features: '', specifications: '', condition: 'Nuevo', priceClp: '', transferPriceClp: '', stock: '0', imageUrl: '' };

function productForm(product: AdminProduct): ProductForm {
  return {
    categoryId: product.categoryId,
    sku: product.sku,
    name: product.name,
    description: product.description,
    features: product.features.join('\n'),
    specifications: product.specifications,
    condition: product.condition,
    priceClp: String(product.priceClp),
    transferPriceClp: product.transferPriceClp === null ? '' : String(product.transferPriceClp),
    stock: String(product.stock),
    imageUrl: product.imageUrl ?? '',
  };
}

function productInput(form: ProductForm): ProductInput {
  return {
    categoryId: form.categoryId,
    sku: form.sku.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    features: form.features.split('\n').map((feature) => feature.trim()).filter(Boolean),
    specifications: form.specifications.trim(),
    condition: form.condition,
    priceClp: Number(form.priceClp),
    transferPriceClp: form.transferPriceClp.trim() ? Number(form.transferPriceClp) : null,
    stock: Number(form.stock),
    imageUrl: form.imageUrl.trim() || null,
  };
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'dashboard' | 'sales' | 'pending' | 'low-stock' | 'returns' | 'products' | 'orders' | 'users'>('dashboard');
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [returnRequests, setReturnRequests] = useState<AdminReturnRequest[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [productPagination, setProductPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [userSearch, setUserSearch] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ name: '', role: 'CUSTOMER' as AdminUser['role'], isActive: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProducts = useCallback(async (query: string, page: number) => {
    const result = await fetchAdminProducts(query, page, 10);
    setProducts(result.data);
    setProductPagination(result.pagination);
  }, []);
  const loadUsers = useCallback(async (query: string, page: number) => {
    const result = await fetchAdminUsers(query, page, 10);
    setUsers(result.data);
    setUserPagination(result.pagination);
  }, []);
  const loadDashboard = useCallback(async () => {
    try { setDashboard(await fetchAdminDashboard()); setDashboardError(null); }
    catch (cause) { setDashboardError(cause instanceof Error ? cause.message : 'No se pudo cargar el resumen.'); }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAdminCategories(), fetchAdminProducts('', 1, 10), fetchAdminOrders(), fetchAdminUsers('', 1, 10), fetchAdminDashboard(), fetchAdminReturnRequests()])
      .then(([categoryResult, productResult, orderResult, userResult, dashboardResult, returnResult]) => {
        if (!active) return;
        setCategories(categoryResult);
        setProducts(productResult.data);
        setProductPagination(productResult.pagination);
        setOrders(orderResult);
        setUsers(userResult.data);
        setUserPagination(userResult.pagination);
        setDashboard(dashboardResult);
        setReturnRequests(returnResult);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el panel.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function clearMessages() {
    setError(null);
    setNotice(null);
  }

  function editProduct(product: AdminProduct) {
    setEditingId(product.id);
    setForm(productForm(product));
    clearMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setSaving(true);
    try {
      const input = productInput(form);
      if (editingId) await updateAdminProduct(editingId, input);
      else await createAdminProduct(input);
      await loadProducts(search, productPage);
      setForm(emptyForm);
      setEditingId(null);
      setNotice(editingId ? 'Producto actualizado.' : 'Producto creado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el producto.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product: AdminProduct) {
    clearMessages();
    setBusyId(product.id);
    try {
      await updateAdminProduct(product.id, { isActive: !product.isActive });
      await loadProducts(search, productPage);
      setNotice(product.isActive ? 'Producto desactivado.' : 'Producto activado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado del producto.');
    } finally {
      setBusyId(null);
    }
  }

  async function changeOrderStatus(order: AdminOrder, status: AdminOrderStatus) {
    if (status === 'CANCELLED' && !window.confirm('¿Cancelar este pedido y devolver las unidades reservadas al stock?')) return;
    clearMessages();
    setBusyId(order.id);
    try {
      const updated = await updateAdminOrderStatus(order.id, status);
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      await loadDashboard();
      setNotice('Estado del pedido actualizado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el pedido.');
    } finally {
      setBusyId(null);
    }
  }

  async function processReturnRequest(request: AdminReturnRequest, status: 'REFUNDED' | 'REJECTED') {
    const confirmation = status === 'REFUNDED'
      ? `Se procesará un reembolso completo de ${formatPrice(request.amountClp)}. Confirma que recibiste y revisaste el producto.`
      : '¿Rechazar esta solicitud de devolución?';
    if (!window.confirm(confirmation)) return;
    clearMessages(); setBusyId(request.id);
    try {
      const updated = await updateAdminReturnRequest(request.id, status);
      setReturnRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(status === 'REFUNDED' ? 'Reembolso registrado. Confirma el resultado en el proveedor de pago si fue Webpay.' : 'Solicitud de devolución rechazada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo procesar la solicitud.');
      try { setReturnRequests(await fetchAdminReturnRequests()); } catch { /* conserva la lista visible si falla la recarga */ }
    } finally { setBusyId(null); }
  }

  async function resolveReturnManually(request: AdminReturnRequest, status: 'REQUESTED' | 'REFUNDED') {
    const confirmation = status === 'REFUNDED'
      ? 'Confirma que verificaste con el proveedor que el reembolso se completó.'
      : 'Confirma que revisaste con el proveedor que NO se hizo el reembolso y autorizas un nuevo intento.';
    if (!window.confirm(confirmation)) return;
    clearMessages(); setBusyId(request.id);
    try {
      const updated = await updateAdminReturnRequest(request.id, status, true);
      setReturnRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(status === 'REFUNDED' ? 'Reembolso confirmado manualmente.' : 'La solicitud quedó disponible para un nuevo intento.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la solicitud.'); }
    finally { setBusyId(null); }
  }

  const confirmedOrders = orders.filter((order) => order.paidAt !== null && order.payments.some((payment) => payment.status === 'APPROVED') && order.returnRequest?.status !== 'REFUNDED');
  const pendingOrders = orders.filter((order) => ['PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED'].includes(order.status));

  function viewLowStockProduct(sku: string) {
    setTab('products');
    setSearch(sku);
    setSearchInput(sku);
    setProductPage(1);
    setLoading(true);
    void loadProducts(sku, 1).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo buscar el producto.')).finally(() => setLoading(false));
  }

  async function searchProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    const query = searchInput.trim();
    setSearch(query);
    setProductPage(1);
    setLoading(true);
    try { await loadProducts(query, 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron buscar productos.'); }
    finally { setLoading(false); }
  }

  async function changeProductPage(page: number) {
    if (page < 1 || page > productPagination.pages || page === productPage) return;
    clearMessages();
    setLoading(true);
    try {
      await loadProducts(search, page);
      setProductPage(page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar esa página de productos.');
    } finally {
      setLoading(false);
    }
  }

  function editUser(user: AdminUser) {
    setEditingUserId(user.id);
    setUserForm({ name: user.name, role: user.role, isActive: user.isActive });
    clearMessages();
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUserId) return;
    clearMessages(); setSaving(true);
    try {
      await updateAdminUser(editingUserId, userForm);
      await loadUsers(userSearch, userPage);
      setEditingUserId(null);
      setNotice('Cuenta actualizada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la cuenta.');
    } finally { setSaving(false); }
  }

  async function searchUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); clearMessages();
    const query = userSearchInput.trim();
    setUserSearch(query); setUserPage(1); setLoading(true);
    try { await loadUsers(query, 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron buscar las cuentas.'); }
    finally { setLoading(false); }
  }

  async function changeUserPage(page: number) {
    if (page < 1 || page > userPagination.pages || page === userPage) return;
    clearMessages(); setLoading(true);
    try { await loadUsers(userSearch, page); setUserPage(page); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar esa página de cuentas.'); }
    finally { setLoading(false); }
  }

  async function selectProductImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    clearMessages();
    setUploadingImage(true);
    try {
      const imageUrl = await uploadAdminImage(file);
      setForm((current) => ({ ...current, imageUrl }));
      setNotice('Imagen cargada. Guarda el producto para aplicar el cambio.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la imagen.');
    } finally {
      setUploadingImage(false);
      input.value = '';
    }
  }

  return (
    <main className="admin-page mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">Acceso protegido</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Administración</h1>
      <p className="mt-2 max-w-2xl leading-6 text-slate-600">Administra el catálogo, el stock y el estado de los pedidos.</p>

      <div className="mt-7 flex flex-wrap gap-3 border-b border-slate-200" role="tablist" aria-label="Secciones de administración">
        <button aria-selected={tab === 'dashboard'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'dashboard' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('dashboard')} role="tab" type="button">Resumen</button>
        <button aria-selected={tab === 'sales'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'sales' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('sales')} role="tab" type="button">Ventas confirmadas ({confirmedOrders.length})</button>
        <button aria-selected={tab === 'pending'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'pending' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('pending')} role="tab" type="button">Pedidos pendientes ({dashboard?.pendingOrderCount ?? pendingOrders.length})</button>
        <button aria-selected={tab === 'low-stock'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'low-stock' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('low-stock')} role="tab" type="button">Stock bajo ({dashboard?.lowStockCount ?? 0})</button>
        <button aria-selected={tab === 'returns'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'returns' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('returns')} role="tab" type="button">Devoluciones ({returnRequests.filter((request) => request.status === 'REQUESTED').length})</button>
        <button aria-selected={tab === 'products'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'products' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('products')} role="tab" type="button">Productos</button>
        <button aria-selected={tab === 'orders'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'orders' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('orders')} role="tab" type="button">Pedidos ({orders.length})</button>
        <button aria-selected={tab === 'users'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'users' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('users')} role="tab" type="button">Cuentas ({userPagination.total})</button>
      </div>

      {error && <p aria-live="polite" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p aria-live="polite" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      {loading && <p className="py-10 text-center text-slate-600">Cargando información…</p>}

      {!loading && (tab === 'dashboard' || tab === 'sales') && <section className="mt-6 space-y-6">
        {dashboardError && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{dashboardError}</p>}
        <div>
          <h2 className="text-xl font-bold text-slate-950">Resumen de ventas confirmadas</h2>
          <p className="mt-1 text-sm text-slate-600">Solo incluye pedidos pagados con al menos un pago aprobado.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {([['today', 'Hoy'], ['week', 'Esta semana'], ['month', 'Este mes']] as const).map(([key, label]) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={key}>
              <p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{formatPrice(dashboard?.sales[key].revenueClp ?? 0)}</p><p className="mt-1 text-sm text-slate-500">{dashboard?.sales[key].orderCount ?? 0} pedidos confirmados</p>
            </article>)}
          </div>
        </div>
        {tab === 'dashboard' && <div className="grid gap-4 md:grid-cols-2">
          <button className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left hover:bg-amber-100" onClick={() => setTab('pending')} type="button"><p className="text-sm font-semibold text-amber-900">Pedidos pendientes</p><p className="mt-1 text-3xl font-black text-amber-950">{dashboard?.pendingOrderCount ?? pendingOrders.length}</p><p className="mt-1 text-sm text-amber-800">Pagos o preparación por gestionar</p></button>
          <button className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-left hover:bg-rose-100" onClick={() => setTab('low-stock')} type="button"><p className="text-sm font-semibold text-rose-900">Productos con stock bajo</p><p className="mt-1 text-3xl font-black text-rose-950">{dashboard?.lowStockCount ?? 0}</p><p className="mt-1 text-sm text-rose-800">Cinco unidades o menos</p></button>
        </div>}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Productos más vendidos</h2><p className="mt-1 text-sm text-slate-600">Unidades en pedidos pagados con pago aprobado durante los últimos 30 días.</p>
          {dashboard?.topSellingProducts.length ? <div className="mt-4 divide-y divide-slate-100">{dashboard.topSellingProducts.map((product) => <div className="flex flex-wrap items-center justify-between gap-2 py-3" key={product.id}><div><p className="font-semibold text-slate-900">{product.name}</p><p className="text-xs text-slate-500">SKU {product.sku}</p></div><p className="text-sm text-slate-700"><strong>{product.unitsSold}</strong> vendidos · Stock: <strong>{product.stock}</strong></p></div>)}</div> : <p className="mt-4 text-sm text-slate-600">Aún no hay ventas confirmadas en este periodo.</p>}
        </div>
        {tab === 'sales' && <section className="space-y-4"><h2 className="text-xl font-bold text-slate-950">Pedidos con venta confirmada</h2>{confirmedOrders.length ? confirmedOrders.map((order) => <OrderCard busy={busyId === order.id} key={order.id} onStatusChange={(status) => void changeOrderStatus(order, status)} order={order} />) : <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Todavía no hay ventas confirmadas.</p>}</section>}
      </section>}

      {!loading && tab === 'pending' && <section className="mt-6 space-y-4"><h2 className="text-xl font-bold text-slate-950">Pedidos pendientes de gestión</h2><p className="text-sm text-slate-600">Incluye pago pendiente y pedidos pagados que siguen en preparación o envío.</p>{pendingOrders.length ? pendingOrders.map((order) => <OrderCard busy={busyId === order.id} key={order.id} onStatusChange={(status) => void changeOrderStatus(order, status)} order={order} />) : <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No hay pedidos pendientes.</p>}</section>}

      {!loading && tab === 'low-stock' && <section className="mt-6"><h2 className="text-xl font-bold text-slate-950">Productos para reponer</h2><p className="mt-1 text-sm text-slate-600">Productos activos con cinco unidades o menos disponibles.</p><div className="mt-4 space-y-3">{dashboard?.lowStockProducts.length ? dashboard.lowStockProducts.map((product) => <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={product.id}><div><h3 className="font-semibold text-slate-950">{product.name}</h3><p className="mt-1 text-xs text-slate-500">SKU {product.sku} · {product.category.name}</p></div><div className="flex items-center gap-4"><span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-800">Stock: {product.stock}</span><button className="text-sm font-semibold text-blue-700 underline" onClick={() => viewLowStockProduct(product.sku)} type="button">Editar producto</button></div></article>) : <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No hay productos activos con stock bajo.</p>}</div></section>}

      {!loading && tab === 'returns' && <section className="mt-6 space-y-4"><div><h2 className="text-xl font-bold text-slate-950">Devoluciones y reembolsos</h2><p className="mt-1 text-sm text-slate-600">Revisa el producto recibido antes de aprobar. El reembolso cubre el total pagado y el stock no se repone automáticamente.</p></div>{returnRequests.length ? returnRequests.map((request) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={request.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-bold text-slate-950">Pedido {request.order.orderNumber}</h3><p className="mt-1 text-sm text-slate-600">{request.order.user.name} · {request.order.user.email}</p><p className="mt-1 text-xs text-slate-500">Solicitada {new Date(request.requestedAt).toLocaleString('es-CL')} · {request.order.payments.map((payment) => payment.provider === 'WEBPAY' ? 'Webpay' : 'Pago simulado').join(', ')}</p></div><div className="text-right"><p className="font-bold text-slate-950">{formatPrice(request.amountClp)}</p><p className="mt-1 text-sm text-slate-600">{{ REQUESTED: 'Pendiente de revisión', PROCESSING: 'Revisar con proveedor', REFUNDED: 'Reembolso procesado', REJECTED: 'Rechazada' }[request.status]}</p></div></div><p className="mt-4 text-sm text-slate-700">{request.reason}</p><p className="mt-2 text-xs text-slate-500">{request.order.items.map((item) => `${item.productName} × ${item.quantity}`).join(' · ')}</p>{request.adminNote && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{request.adminNote}</p>}{request.status === 'REQUESTED' && <div className="mt-4 flex flex-wrap gap-3"><button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={busyId === request.id} onClick={() => void processReturnRequest(request, 'REFUNDED')} type="button">{busyId === request.id ? 'Procesando…' : 'Aprobar y reembolsar'}</button><button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={busyId === request.id} onClick={() => void processReturnRequest(request, 'REJECTED')} type="button">Rechazar</button></div>}{request.status === 'PROCESSING' && <div className="mt-4 flex flex-wrap items-center gap-3"><p className="w-full text-sm font-semibold text-amber-800">El resultado del proveedor requiere revisión manual.</p><button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white" disabled={busyId === request.id} onClick={() => void resolveReturnManually(request, 'REFUNDED')} type="button">Confirmar reembolso realizado</button><button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold" disabled={busyId === request.id} onClick={() => void resolveReturnManually(request, 'REQUESTED')} type="button">Autorizar nuevo intento</button></div>}</article>) : <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Aún no hay solicitudes de devolución.</p>}</section>}

      {!loading && tab === 'products' && (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={(event) => void submitProduct(event)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>
                <p className="mt-1 text-sm text-slate-500">Los precios se guardan en pesos chilenos enteros. El checkout actual cobra mediante Webpay.</p>
              </div>
              {editingId && <button className="text-sm font-medium text-slate-600 underline" onClick={() => { setEditingId(null); setForm(emptyForm); }} type="button">Cancelar edición</button>}
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Categoría
              <select className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required value={form.categoryId}>
                <option value="">Selecciona una categoría</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">SKU
                <input className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={64} minLength={2} onChange={(event) => setForm({ ...form, sku: event.target.value })} required value={form.sku} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Nombre
                <input className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={160} minLength={2} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Descripción
              <textarea className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={2000} minLength={5} onChange={(event) => setForm({ ...form, description: event.target.value })} required rows={3} value={form.description} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Características del producto
              <textarea className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={4000} onChange={(event) => setForm({ ...form, features: event.target.value })} placeholder={'Una característica por línea\nEj.: Conectividad Wi-Fi 6'} rows={3} value={form.features} />
              <span className="text-xs font-normal text-slate-500">Escribe una característica por línea.</span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Especificaciones del producto
              <textarea className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={4000} onChange={(event) => setForm({ ...form, specifications: event.target.value })} placeholder={'Una especificación por línea, idealmente Nombre: valor\nEj.: Memoria: 16 GB'} rows={4} value={form.specifications} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Condición
                <select className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" onChange={(event) => setForm({ ...form, condition: event.target.value as ProductForm['condition'] })} value={form.condition}><option>Nuevo</option><option>Reacondicionado</option><option>Usado</option></select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Precio transferencia / depósito (CLP, opcional)
                <input className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" min={1} onChange={(event) => setForm({ ...form, transferPriceClp: event.target.value })} type="number" value={form.transferPriceClp} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Precio Webpay (CLP)
                <input className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" min={1} onChange={(event) => setForm({ ...form, priceClp: event.target.value })} required type="number" value={form.priceClp} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Stock
                <input className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" min={0} onChange={(event) => setForm({ ...form, stock: event.target.value })} required type="number" value={form.stock} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">URL de imagen (opcional)
              <input className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={2048} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://… o sube una imagen" type="text" value={form.imageUrl} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">O selecciona un archivo
              <input accept="image/jpeg,image/png,image/webp" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:font-semibold file:text-blue-700" disabled={uploadingImage} onChange={(event) => void selectProductImage(event)} type="file" />
              <span className="text-xs font-normal text-slate-500">JPG, PNG o WebP; máximo 5 MB.</span>
            </label>
            {form.imageUrl && <img alt="Vista previa de la imagen del producto" className="h-40 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" src={form.imageUrl} />}
            <button className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={saving || uploadingImage || categories.length === 0} type="submit">
              {uploadingImage ? 'Subiendo imagen…' : saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </form>

          <section aria-label="Catálogo administrable" className="min-w-0">
            <form className="flex gap-2" onSubmit={(event) => void searchProducts(event)}>
              <label className="sr-only" htmlFor="admin-product-search">Buscar por nombre o SKU</label>
              <input className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" id="admin-product-search" onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar por nombre o SKU" value={searchInput} />
              <button className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="submit">Buscar</button>
            </form>
            <p className="mt-3 text-sm text-slate-500">{productPagination.total === 0 ? 'No hay productos' : `Mostrando ${(productPage - 1) * productPagination.limit + 1}–${Math.min(productPage * productPagination.limit, productPagination.total)} de ${productPagination.total} productos`}</p>
            <div className="mt-4 space-y-3">
              {products.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No hay productos para mostrar.</p>}
              {products.map((product) => (
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={product.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">{product.name}</h3>
                        {!product.isActive && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Inactivo</span>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{product.sku} · {product.category.name}{!product.category.isActive ? ' (categoría inactiva)' : ''}</p>
                      <p className="mt-2 text-sm text-slate-700">Webpay: {formatPrice(product.priceClp)}{product.transferPriceClp !== null ? ` · Transferencia: ${formatPrice(product.transferPriceClp)}` : ''} · Stock: <strong>{product.stock}</strong> · {product.condition}</p>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button className="text-sm font-medium text-blue-700 underline" onClick={() => editProduct(product)} type="button">Editar</button>
                      <button className="text-sm font-medium text-slate-600 underline disabled:opacity-50" disabled={busyId === product.id} onClick={() => void toggleProduct(product)} type="button">{product.isActive ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {productPagination.pages > 1 && <nav aria-label="Paginación de productos" className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={loading || productPage <= 1} onClick={() => void changeProductPage(productPage - 1)} type="button">← Anterior</button>
              <span aria-live="polite" className="text-sm font-medium text-slate-600">Página {productPage} de {productPagination.pages}</span>
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={loading || productPage >= productPagination.pages} onClick={() => void changeProductPage(productPage + 1)} type="button">Siguiente →</button>
            </nav>}
          </section>
        </div>
      )}

      {!loading && tab === 'users' && (
        <section aria-label="Cuentas registradas" className="mt-6">
          <form className="flex gap-2" onSubmit={(event) => void searchUsers(event)}>
            <label className="sr-only" htmlFor="admin-user-search">Buscar cuentas por nombre o correo</label>
            <input className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" id="admin-user-search" onChange={(event) => setUserSearchInput(event.target.value)} placeholder="Buscar por nombre o correo" value={userSearchInput} />
            <button className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="submit">Buscar</button>
          </form>
          <p className="mt-3 text-sm text-slate-500">{userPagination.total === 0 ? 'No hay cuentas registradas' : `Mostrando ${(userPage - 1) * userPagination.limit + 1}–${Math.min(userPage * userPagination.limit, userPagination.total)} de ${userPagination.total} cuentas`}</p>
          <div className="mt-4 space-y-3">
            {users.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No hay cuentas que coincidan con la búsqueda.</p>}
            {users.map((account) => <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={account.id}>
              {editingUserId === account.id ? <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={(event) => void submitUser(event)}>
                <label className="text-sm font-medium text-slate-700">Nombre<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={80} minLength={2} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} required value={userForm.name} /></label>
                <div className="text-sm"><span className="font-medium text-slate-700">Correo</span><p className="mt-2 text-slate-600">{account.email}</p><p className="mt-1 text-xs text-slate-500">No editable aquí: el cambio requiere verificar el nuevo correo.</p></div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">Rol<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal disabled:bg-slate-100" disabled={currentUser?.id === account.id} onChange={(event) => setUserForm({ ...userForm, role: event.target.value as AdminUser['role'] })} value={userForm.role}><option value="CUSTOMER">Cliente</option><option value="ADMIN">Administrador</option></select></label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input checked={userForm.isActive} disabled={currentUser?.id === account.id} onChange={(event) => setUserForm({ ...userForm, isActive: event.target.checked })} type="checkbox" /> Cuenta activa</label>
                  {currentUser?.id === account.id && <span className="text-xs text-slate-500">No puedes cambiar tu propio rol ni desactivar tu cuenta.</span>}
                  <div className="ml-auto flex gap-3"><button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Guardar'}</button><button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => setEditingUserId(null)} type="button">Cancelar</button></div>
                </div>
              </form> : <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{account.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.role === 'ADMIN' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{account.role === 'ADMIN' ? 'Administrador' : 'Cliente'}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{account.isActive ? 'Activa' : 'Desactivada'}</span>{account.id === currentUser?.id && <span className="text-xs text-slate-500">Tu cuenta</span>}</div><p className="mt-1 break-all text-sm text-slate-600">{account.email}</p><p className="mt-1 text-xs text-slate-500">Registrada el {new Date(account.createdAt).toLocaleDateString('es-CL')}</p></div>
                <button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50" onClick={() => editUser(account)} type="button">Editar cuenta</button>
              </div>}
            </article>)}
          </div>
          {userPagination.pages > 1 && <nav aria-label="Paginación de cuentas" className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={loading || userPage <= 1} onClick={() => void changeUserPage(userPage - 1)} type="button">← Anterior</button><span aria-live="polite" className="text-sm font-medium text-slate-600">Página {userPage} de {userPagination.pages}</span><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={loading || userPage >= userPagination.pages} onClick={() => void changeUserPage(userPage + 1)} type="button">Siguiente →</button></nav>}
        </section>
      )}

      {!loading && tab === 'orders' && (
        <section className="mt-6 space-y-4">
          {orders.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Todavía no hay pedidos.</p>}
          {orders.map((order) => <OrderCard busy={busyId === order.id} key={order.id} onStatusChange={(status) => void changeOrderStatus(order, status)} order={order} />)}
        </section>
      )}
    </main>
  );
}

function OrderCard({ order, busy, onStatusChange }: { order: AdminOrder; busy: boolean; onStatusChange: (status: AdminOrderStatus) => void }) {
  const nextStatuses = nextAdminOrderStatuses(order.status);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-950">{order.orderNumber}</h2>
          <p className="mt-1 text-sm text-slate-600">{order.user.name} · {order.user.email}</p>
          <p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString('es-CL')}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-950">{formatPrice(order.totalClp)}</p>
          <p className="mt-1 text-sm text-slate-600">{adminOrderStatusLabel(order.status)}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-sm text-slate-700">{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(' · ')}</p>
          <p className="mt-1 text-xs text-slate-500">Entrega: {order.address}, {order.commune}, {order.region} · {order.phone}</p>
          {order.payments.length > 0 && <p className="mt-2 text-xs text-slate-500">Pago: {order.payments.map((payment) => `${payment.provider === 'WEBPAY' ? 'Webpay' : 'Pago'} (${payment.status === 'APPROVED' ? 'aprobado' : payment.status === 'REJECTED' ? 'rechazado' : 'pendiente'})`).join(', ')}</p>}
        </div>
        {nextStatuses.length > 0 && (
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            Actualizar estado
            <select className="rounded-lg border border-slate-300 px-3 py-2" disabled={busy} onChange={(event) => { if (event.target.value) onStatusChange(event.target.value as AdminOrderStatus); }} value="">
              <option value="">Elegir…</option>
              {nextStatuses.map((status) => <option key={status} value={status}>{adminOrderStatusLabel(status)}</option>)}
            </select>
          </label>
        )}
      </div>
    </article>
  );
}
