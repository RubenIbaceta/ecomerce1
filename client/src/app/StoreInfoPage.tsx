import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

const pages: Record<string, { title: string; intro: string; sections: Array<[string, string]> }> = {
  'sobre-nosotros': {
    title: 'Sobre ElectroStore',
    intro: 'Somos un proyecto de tienda de tecnología pensado para que elegir y comprar componentes sea simple, claro y seguro.',
    sections: [
      ['Nuestra propuesta', 'Reunimos componentes, periféricos y equipos para distintas configuraciones y necesidades. Cada ficha presenta precio, stock, condición y especificaciones para ayudar a comparar antes de comprar.'],
      ['Cómo trabajamos', 'El proyecto incluye catálogo, cuentas, carrito, pagos de integración, seguimiento de pedidos y herramientas de administración. La información del catálogo es referencial mientras se prepara el proyecto.'],
      ['Compra acompañada', 'Desde tu cuenta puedes revisar pedidos, actualizar tus datos y solicitar una devolución dentro del plazo definido en la información de cambios y devoluciones.'],
    ],
  },
  despachos: {
    title: 'Despachos y seguimiento',
    intro: 'El checkout calcula una tarifa y un plazo estimado según la región seleccionada.',
    sections: [
      ['Tarifas de referencia', 'Región Metropolitana: estándar $2.990 (2 a 3 días hábiles) o prioritario $4.990 (1 a 2 días hábiles). Valparaíso, O’Higgins y Maule: estándar $4.990 (3 a 5 días hábiles). Otras regiones: estándar $6.990 (5 a 8 días hábiles).'],
      ['Seguimiento', 'El número de pedido identifica tu compra. En Mis pedidos puedes consultar si está pagada, en preparación, enviada o completada. El administrador actualiza estos estados manualmente; no hay una empresa de transporte conectada.'],
      ['Alcance actual', 'Las tarifas y plazos son una simulación local de ElectroStore, no una cotización de un transportista. Los plazos son estimados y se muestran como días hábiles.'],
    ],
  },
  devoluciones: {
    title: 'Cambios y devoluciones',
    intro: 'Puedes enviar una solicitud de devolución desde el detalle de un pedido pagado.',
    sections: [
      ['Plazo y solicitud', 'El proyecto permite solicitar una devolución hasta 30 días después del pago confirmado. Describe el motivo desde el detalle del pedido; la solicitud queda pendiente de revisión administrativa.'],
      ['Revisión y reembolso', 'El administrador revisa el caso y el producto recibido antes de procesar un reembolso completo. Las compras simuladas se registran como devolución simulada; los pagos Webpay usan el ambiente de integración configurado.'],
      ['Inventario', 'El stock no aumenta cuando se solicita ni cuando se aprueba una devolución. El producto debe recibirse e inspeccionarse antes de decidir si puede volver al inventario.'],
      ['Límite del proyecto', 'Este flujo demuestra el proceso de la tienda y no reemplaza una política comercial o legal definitiva.'],
    ],
  },
  privacidad: {
    title: 'Privacidad',
    intro: 'ElectroStore usa los datos necesarios para administrar cuentas, compras y entregas dentro de este proyecto.',
    sections: [
      ['Datos de cuenta y compra', 'Se guardan nombre, correo, direcciones, historial de pedidos y datos de contacto para entregar y consultar las compras. Las sesiones usan una cookie protegida.'],
      ['Pagos', 'La tienda no guarda números de tarjeta ni códigos de seguridad. El pago Webpay se completa en el formulario alojado por Transbank; los resultados y referencias de pago se registran para actualizar el pedido.'],
      ['Correo', 'Si SMTP está configurado, se utiliza para verificar el correo, recuperar contraseñas y recibir consultas de contacto. Si no está configurado, esos mensajes no se pueden enviar.'],
      ['Almacenamiento del proyecto', 'En una instalación local, la información se guarda en PostgreSQL y las imágenes cargadas en el directorio de archivos configurado por la aplicación. El administrador debe mantener respaldos.'],
    ],
  },
  terminos: {
    title: 'Términos de compra',
    intro: 'Estas condiciones describen el funcionamiento actual del proyecto ElectroStore.',
    sections: [
      ['Catálogo y disponibilidad', 'Los precios, características, imágenes y existencias son referenciales mientras el catálogo no haya sido revisado para una operación real. El pedido confirma los productos y valores guardados al momento de crearlo.'],
      ['Pedido y pago', 'Al crear un pedido se reserva temporalmente el stock. Si el pago se rechaza, se cancela o vence la reserva, las unidades se liberan. El pedido se considera pagado solo tras una confirmación aprobada del proveedor.'],
      ['Despacho', 'Las tarifas y fechas se estiman dentro del proyecto. El estado del pedido se actualiza manualmente y no se genera una etiqueta ni un seguimiento de transportista.'],
      ['Devoluciones', 'Las solicitudes siguen el proceso descrito en Cambios y devoluciones.'],
      ['Ambiente de pago', 'Webpay se encuentra configurado para integración y no procesa cobros comerciales.'],
    ],
  },
};

function ContactForm() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setMessage(null);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch('/api/v1/contact', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? 'No se pudo enviar el mensaje.');
      form.reset();
      setMessage({ text: 'Recibimos tu consulta. Te responderemos al correo que indicaste.', error: false });
    } catch (cause) { setMessage({ text: cause instanceof Error ? cause.message : 'No se pudo enviar el mensaje.', error: true }); }
    finally { setSending(false); }
  }

  return <form className="mt-7 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" onSubmit={(event) => void submit(event)}>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Nombre<input autoComplete="name" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={100} minLength={2} name="name" required /></label><label className="text-sm font-semibold text-slate-700">Correo<input autoComplete="email" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={254} name="email" required type="email" /></label></div>
    <label className="block text-sm font-semibold text-slate-700">Asunto<input className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={120} minLength={3} name="subject" required /></label>
    <label className="block text-sm font-semibold text-slate-700">Mensaje<textarea className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" maxLength={3000} minLength={10} name="message" required rows={5} /></label>
    {message && <p aria-live="polite" className={`rounded-lg p-3 text-sm ${message.error ? 'bg-amber-50 text-amber-900' : 'bg-green-50 text-green-800'}`}>{message.text}</p>}
    <button className="rounded-xl bg-[var(--color-brand)] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={sending} type="submit">{sending ? 'Enviando…' : 'Enviar consulta'}</button>
    <p className="text-xs text-slate-500">El envío requiere que SMTP y la dirección de soporte estén configurados en el entorno local.</p>
  </form>;
}

export default function StoreInfoPage() {
  const { slug = '' } = useParams();
  const page = pages[slug];
  const isContact = slug === 'contacto';
  const title = isContact ? 'Contacto' : page?.title ?? 'Información';
  const intro = isContact ? 'Escríbenos sobre un producto, tu cuenta o un pedido. Incluye el número de pedido si corresponde.' : page?.intro ?? '';
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
    <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">ElectroStore</p>
    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{intro}</p>
    {isContact ? <><ContactForm /><p className="mt-5 text-sm text-slate-600">También puedes revisar el estado y el detalle de tus compras en <Link className="font-semibold text-blue-700 underline" to="/pedidos">Mis pedidos</Link>.</p></> : <div className="mt-7 space-y-4">{page?.sections.map(([heading, body]) => <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" key={heading}><h2 className="text-lg font-bold text-slate-950">{heading}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></section>)}</div>}
  </main>;
}
