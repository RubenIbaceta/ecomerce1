import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { formatPrice } from '../catalog/catalog.api';
import {
  adminOrderStatusLabel,
  createAdminProduct,
  fetchAdminCategories,
  fetchAdminOrders,
  fetchAdminProducts,
  nextAdminOrderStatuses,
  updateAdminOrderStatus,
  updateAdminProduct,
  uploadAdminImage,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminProduct,
  type ProductInput,
} from './admin.api';

type ProductForm = {
  categoryId: string;
  sku: string;
  name: string;
  description: string;
  priceClp: string;
  stock: string;
  imageUrl: string;
};

const emptyForm: ProductForm = { categoryId: '', sku: '', name: '', description: '', priceClp: '', stock: '0', imageUrl: '' };

function productForm(product: AdminProduct): ProductForm {
  return {
    categoryId: product.categoryId,
    sku: product.sku,
    name: product.name,
    description: product.description,
    priceClp: String(product.priceClp),
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
    priceClp: Number(form.priceClp),
    stock: Number(form.stock),
    imageUrl: form.imageUrl.trim() || null,
  };
}

export default function AdminPage() {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProducts = useCallback(async (query = '') => setProducts(await fetchAdminProducts(query)), []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAdminCategories(), fetchAdminProducts(), fetchAdminOrders()])
      .then(([categoryResult, productResult, orderResult]) => {
        if (!active) return;
        setCategories(categoryResult);
        setProducts(productResult);
        setOrders(orderResult);
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
      await loadProducts(search);
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
      await loadProducts(search);
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
      setNotice('Estado del pedido actualizado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el pedido.');
    } finally {
      setBusyId(null);
    }
  }

  async function searchProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setSearch(searchInput);
    setLoading(true);
    try { await loadProducts(searchInput); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron buscar productos.'); }
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
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Acceso protegido</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Administración</h1>
      <p className="mt-2 max-w-2xl leading-6 text-slate-600">Administra el catálogo, el stock y el estado de los pedidos.</p>

      <div className="mt-7 flex flex-wrap gap-3 border-b border-slate-200" role="tablist" aria-label="Secciones de administración">
        <button aria-selected={tab === 'products'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'products' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('products')} role="tab" type="button">Productos</button>
        <button aria-selected={tab === 'orders'} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === 'orders' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600')} onClick={() => setTab('orders')} role="tab" type="button">Pedidos ({orders.length})</button>
      </div>

      {error && <p aria-live="polite" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p aria-live="polite" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      {loading && <p className="py-10 text-center text-slate-600">Cargando información…</p>}

      {!loading && tab === 'products' && (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" onSubmit={(event) => void submitProduct(event)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>
                <p className="mt-1 text-sm text-slate-500">Los precios se guardan en pesos chilenos enteros.</p>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Precio (CLP)
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
            <div className="mt-4 space-y-3">
              {products.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No hay productos para mostrar.</p>}
              {products.map((product) => (
                <article className="rounded-xl border border-slate-200 bg-white p-4" key={product.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">{product.name}</h3>
                        {!product.isActive && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Inactivo</span>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{product.sku} · {product.category.name}{!product.category.isActive ? ' (categoría inactiva)' : ''}</p>
                      <p className="mt-2 text-sm text-slate-700">{formatPrice(product.priceClp)} · Stock: <strong>{product.stock}</strong></p>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button className="text-sm font-medium text-blue-700 underline" onClick={() => editProduct(product)} type="button">Editar</button>
                      <button className="text-sm font-medium text-slate-600 underline disabled:opacity-50" disabled={busyId === product.id} onClick={() => void toggleProduct(product)} type="button">{product.isActive ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
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
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
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
          {order.payments.length > 0 && <p className="mt-2 text-xs text-slate-500">Pago: {order.payments.map((payment) => `${payment.provider} (${payment.status === 'APPROVED' ? 'aprobado' : payment.status === 'REJECTED' ? 'rechazado' : 'pendiente'})`).join(', ')}</p>}
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
