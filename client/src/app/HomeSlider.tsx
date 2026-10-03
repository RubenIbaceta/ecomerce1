import { useState } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  {
    image: '/images/fotohome.jpg',
    alt: 'Computadores, monitores, celulares y periféricos para un espacio de tecnología.',
    eyebrow: 'ELECTRO DEMO',
    title: 'Tecnología para lo que viene.',
    description: 'Encuentra equipos y accesorios para armar tu próximo espacio.',
    action: 'Explorar catálogo',
  },
  {
    image: '/images/ofertas.jpg',
    alt: 'Banner gráfico de demostración con notebooks, audífonos y productos tecnológicos.',
    eyebrow: 'NOVEDADES Y DESTACADOS',
    title: 'Encuentra tu próximo favorito.',
    description: 'Descubre los productos disponibles en nuestra tienda demo.',
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
    <section aria-label="Destacados de Electro Demo" className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <div aria-roledescription="carrusel" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative">
          <img
            alt={slide.alt}
            className="aspect-[16/8] w-full object-cover sm:aspect-[16/7]"
            fetchPriority="high"
            src={slide.image}
          />
          <div aria-label="Controles del carrusel" className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-3 sm:px-5">
            <button aria-label="Mostrar imagen anterior" className="grid size-10 place-items-center rounded-full bg-white/90 text-2xl text-slate-900 shadow transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={() => showSlide(activeIndex - 1)} type="button">‹</button>
            <button aria-label="Mostrar imagen siguiente" className="grid size-10 place-items-center rounded-full bg-white/90 text-2xl text-slate-900 shadow transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={() => showSlide(activeIndex + 1)} type="button">›</button>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{slide.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{slide.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{slide.description}</p>
          </div>
          <Link className="inline-flex shrink-0 justify-center rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" to="/catalogo">{slide.action}</Link>
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
      <p className="mt-3 text-center text-xs text-slate-500">El banner de ofertas es una imagen de muestra; los precios vigentes son los publicados en el catálogo.</p>
    </section>
  );
}
