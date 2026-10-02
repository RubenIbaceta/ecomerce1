export default function AdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Acceso protegido</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Área de administración</h1>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="leading-7 text-slate-600">
          Tu cuenta tiene permisos de administración. La gestión de productos y pedidos se incorporará en sus fases correspondientes.
        </p>
      </section>
    </main>
  );
}
