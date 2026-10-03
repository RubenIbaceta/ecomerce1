import { useState } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  {
    image: '/images/fotohome.jpg',
    alt: 'Computadores, monitores, celulares y periféricos para un espacio de tecnología.',
    eyebrow: 'TECNOLOGÍA PARA TU DÍA A DÍA',
    title: 'Tu próximo espacio empieza aquí.',
    description: 'Explora equipos y accesorios disponibles en el catálogo.',
    action: 'Explorar catálogo',
  },
  {
    image: '/images/ofertas.jpg',
    alt: 'Promoción de temporada con notebooks, audífonos y productos tecnológicos.',
    eyebrow: 'DESTACADOS DE LA TIENDA',
    title: 'Descubre lo que tenemos para ti.',
    description: 'Conoce productos y novedades del catálogo ElectroStore.',
    action: 'Ver productos',
  },
];

export default function HomeSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const slide = slides[activeIndex];

  function showSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  return (
    <section aria-label="Destacados de ElectroStore" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div aria-roledescription="carrusel" className="overflow-hidden rounded-3xl bg-slate-950 shadow-xl shadow-slate-900/10">
        <div className="relative isolate">
          <img
            alt={slide.alt}
            className="aspect-[16/9] max-h-[520px] w-full object-cover sm:aspect-[16/7]"
            fetchPriority="high"
            src={slide.image}
          />
          <div aria-hidden="true" className="absolute inset-0 -z-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-transparent" />
          <div className="absolute inset-y-0 left-0 z-10 flex max-w-2xl flex-col justify-end p-6 pb-9 text-white sm:justify-center sm:p-10 lg:p-14">
            <p className="w-fit rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-100 backdrop-blur sm:text-sm">{slide.eyebrow}</p>
            <h1 className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">{slide.title}</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-100 sm:text-base">{slide.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="inline-flex w-fit rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" to="/catalogo">{slide.action}<span aria-hidden="true" className="ml-2">→</span></Link>
              <a className="inline-flex w-fit rounded-xl border border-white/50 bg-slate-950/20 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15" href="#categorias">Ver categorías</a>
            </div>
          </div>
          <div aria-label="Controles del carrusel" className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-3 sm:px-5">
            <button aria-label="Mostrar imagen anterior" className="grid size-10 place-items-center rounded-full bg-white/90 text-2xl text-slate-900 shadow transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={() => showSlide(activeIndex - 1)} type="button">‹</button>
            <button aria-label="Mostrar imagen siguiente" className="grid size-10 place-items-center rounded-full bg-white/90 text-2xl text-slate-900 shadow transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={() => showSlide(activeIndex + 1)} type="button">›</button>
          </div>
        </div>
      </div>
      <div aria-label="Elegir imagen destacada" className="mt-4 flex justify-center gap-2">
        {slides.map((item, index) => (
          <button
            aria-current={index === activeIndex ? 'true' : undefined}
            aria-label={`Mostrar imagen ${index + 1}: ${item.title}`}
            className={`size-3 rounded-full transition ${index === activeIndex ? 'bg-blue-700 ring-4 ring-blue-100' : 'bg-slate-300 hover:bg-slate-500'}`}
            key={item.image}
            onClick={() => showSlide(index)}
            type="button"
          />
        ))}
      </div>
      {activeIndex === 1 && <p className="mt-3 text-center text-xs text-slate-500">Los precios y descuentos impresos en esta imagen son ilustrativos; revisa el catálogo para ver los precios vigentes.</p>}
    </section>
  );
}
