import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { changePassword, deleteAddressRequest, fetchAddressesRequest, saveAddressRequest, type Address } from './auth.api';
import { useAuth } from './AuthContext';
import { fetchOrders, type Order } from '../orders/orders.api';

const fieldClass = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const blankAddress = { label: 'Casa', recipientName: '', phone: '', address: '', commune: '', region: '', isDefault: false };

export default function ProfilePage() {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressForm, setAddressForm] = useState(blankAddress);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  async function refreshAddresses() { setAddresses(await fetchAddressesRequest()); }
  useEffect(() => {
    void refreshAddresses().catch(() => setError('No fue posible cargar tus direcciones.'));
    void fetchOrders().then(setOrders).catch(() => undefined);
  }, []);
  if (!user) return null;

  async function submitProfile(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice(''); setSaving(true);
    try { await updateName(name); setNotice('Tus datos personales se actualizaron.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible guardar los cambios.'); }
    finally { setSaving(false); }
  }

  async function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await saveAddressRequest({ ...addressForm, label: String(form.get('label')), recipientName: String(form.get('recipientName')), phone: String(form.get('phone')), address: String(form.get('address')), commune: String(form.get('commune')), region: String(form.get('region')), isDefault: form.get('isDefault') === 'on', id: editingId });
      await refreshAddresses(); setAddressForm(blankAddress); setEditingId(undefined); setNotice('La dirección se guardó correctamente.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible guardar la dirección.'); }
    finally { setSaving(false); }
  }

  function editAddress(address: Address) {
    setEditingId(address.id);
    setAddressForm({ label: address.label, recipientName: address.recipientName, phone: address.phone, address: address.address, commune: address.commune, region: address.region, isDefault: address.isDefault });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function removeAddress(id: string) {
    setError(''); setNotice('');
    try { await deleteAddressRequest(id); await refreshAddresses(); setNotice('La dirección se eliminó.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible eliminar la dirección.'); }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get('currentPassword') ?? '');
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirmPassword') ?? '')) { setError('Las contraseñas nuevas no coinciden.'); return; }
    setSaving(true);
    try { await changePassword(currentPassword, password); formElement.reset(); setNotice('Tu contraseña se cambió correctamente.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cambiar la contraseña.'); }
    finally { setSaving(false); }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">Mi cuenta</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Hola, {user.name}</h1>
      <p className="mt-3 text-sm text-slate-600">Administra tus datos, direcciones y compras.</p>
      {(error || notice) && <p aria-live="polite" className={`mt-5 rounded-xl p-4 text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{error || notice}</p>}

      <div className="mt-7 grid gap-6 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Secciones de mi cuenta" className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">Mi perfil</p>
          <a className="block rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-[var(--color-brand)]" href="#datos">Datos personales</a>
          <a className="mt-1 block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" href="#direcciones">Direcciones</a>
          <a className="mt-1 block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" href="#seguridad">Seguridad y contraseña</a>
          <a className="mt-1 block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" href="#pagos">Pagos</a>
          <Link className="mt-1 block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" to="/pedidos">Mis pedidos</Link>
          <p className="mt-5 border-t border-slate-100 px-3 pt-4 text-xs leading-5 text-slate-500">Mantén tus datos y direcciones actualizados para tus próximas compras.</p>
        </nav>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" id="datos">
            <h2 className="text-lg font-bold text-slate-950">Datos personales</h2>
            <form className="mt-5 max-w-xl space-y-4" onSubmit={submitProfile}>
              <label className="block text-sm font-medium text-slate-700">Nombre completo<input autoComplete="name" className={`${fieldClass} mt-2`} maxLength={80} minLength={2} onChange={(event) => setName(event.target.value)} required value={name} /></label>
              <label className="block text-sm font-medium text-slate-700">Correo electrónico<input className={`${fieldClass} mt-2 bg-slate-50 text-slate-500`} readOnly value={user.email} /><span className="mt-1 block text-xs text-slate-500">Para cambiar el correo primero habilitaremos la verificación de propiedad.</span></label>
              <p className="text-sm text-slate-500">Tipo de cuenta: {user.role === 'ADMIN' ? 'Administración' : 'Cliente'}</p>
              <button className="rounded-xl bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Guardar datos'}</button>
            </form>
            {user.role === 'ADMIN' && <Link className="ml-3 inline-flex rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700" to="/admin">Administración</Link>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" id="direcciones">
            <h2 className="text-lg font-bold text-slate-950">Direcciones de envío</h2>
            <p className="mt-1 text-sm text-slate-500">Guarda tus direcciones frecuentes para tenerlas a mano al comprar.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {addresses.map((address) => <article className="rounded-xl border border-slate-200 p-4" key={address.id}>
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{address.label} {address.isDefault && <span className="ml-1 text-xs font-semibold text-blue-700">· Principal</span>}</h3><p className="mt-2 text-sm text-slate-700">{address.recipientName}</p><p className="text-sm text-slate-600">{address.address}, {address.commune}, {address.region}</p><p className="mt-1 text-sm text-slate-500">{address.phone}</p></div></div>
                <div className="mt-4 flex gap-4 text-sm font-semibold"><button className="text-blue-700 hover:underline" onClick={() => editAddress(address)} type="button">Editar</button><button className="text-red-700 hover:underline" onClick={() => void removeAddress(address.id)} type="button">Eliminar</button></div>
              </article>)}
              {addresses.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:col-span-2">Todavía no tienes direcciones guardadas.</p>}
            </div>

            <form className="mt-6 border-t border-slate-100 pt-6" onSubmit={submitAddress}>
              <h3 className="font-bold text-slate-900">{editingId ? 'Editar dirección' : 'Agregar dirección'}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {([['label','Nombre de la dirección','Casa'],['recipientName','Quien recibe','Nombre completo'],['phone','Teléfono','+56 9 1234 5678'],['address','Dirección','Calle y número'],['commune','Comuna','Comuna'],['region','Región','Región']] as const).map(([key,label,placeholder]) => <label className="text-sm font-medium text-slate-700" key={key}>{label}<input autoComplete={key === 'recipientName' ? 'name' : key === 'phone' ? 'tel' : key === 'address' ? 'street-address' : 'off'} className={`${fieldClass} mt-2`} maxLength={key === 'address' ? 200 : 100} minLength={key === 'phone' ? 8 : 2} name={key} onChange={(event) => setAddressForm({ ...addressForm, [key]: event.target.value })} placeholder={placeholder} required value={addressForm[key]} /></label>)}
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input checked={addressForm.isDefault} name="isDefault" onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })} type="checkbox" /> Usar como dirección principal</label>
              <div className="mt-5 flex gap-3"><button className="rounded-xl bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60" disabled={saving} type="submit">{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar dirección'}</button>{editingId && <button className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700" onClick={() => { setEditingId(undefined); setAddressForm(blankAddress); }} type="button">Cancelar</button>}</div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" id="seguridad">
            <h2 className="text-lg font-bold text-slate-950">Seguridad y contraseña</h2>
            <p className="mt-1 text-sm text-slate-500">Para cambiarla, confirma primero tu contraseña actual.</p>
            <form className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-2" onSubmit={submitPassword}>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Contraseña actual<input autoComplete="current-password" className={`${fieldClass} mt-2`} maxLength={128} name="currentPassword" required type="password" /></label>
              <label className="text-sm font-medium text-slate-700">Nueva contraseña<input autoComplete="new-password" className={`${fieldClass} mt-2`} maxLength={128} minLength={12} name="password" required type="password" /></label>
              <label className="text-sm font-medium text-slate-700">Confirmar contraseña<input autoComplete="new-password" className={`${fieldClass} mt-2`} maxLength={128} minLength={12} name="confirmPassword" required type="password" /></label>
              <div className="sm:col-span-2"><button className="rounded-xl bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60" disabled={saving}>{saving ? 'Actualizando…' : 'Cambiar contraseña'}</button></div>
            </form>
            <p className="mt-4 text-sm text-slate-500">También puedes <Link className="font-semibold text-blue-700 hover:underline" to="/recuperar-clave">recuperarla usando tu correo</Link>.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" id="pagos">
            <h2 className="text-lg font-bold text-slate-950">Pagos y compras</h2>
            <div className="mt-4 rounded-xl bg-blue-50 p-4"><h3 className="font-semibold text-blue-950">Método disponible: Webpay</h3><p className="mt-1 text-sm leading-6 text-blue-900">Al pagar serás dirigido al portal seguro de Webpay. ElectroStore no almacena números de tarjeta, códigos de seguridad ni datos bancarios.</p></div>
            <h3 className="mt-6 font-bold text-slate-900">Historial de pagos</h3>
            <ul className="mt-3 divide-y divide-slate-100">{orders.flatMap((order) => order.payments.map((payment) => <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm" key={payment.id}><span><span className="font-semibold text-slate-800">Pedido {order.orderNumber}</span><span className="ml-2 text-slate-500">{payment.provider === 'WEBPAY' ? 'Webpay' : 'Pago'}</span></span><span className="text-slate-600">{payment.status === 'APPROVED' ? 'Aprobado' : payment.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}</span></li>))}{orders.every((order) => order.payments.length === 0) && <li className="py-3 text-sm text-slate-500">No hay pagos registrados todavía.</li>}</ul>
          </section>
        </div>
      </div>
    </main>
  );
}
