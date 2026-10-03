import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  {
    image: '/images/fotohome.jpg',
    alt: 'Computadores, monitores, celulares y periféricos para un espacio de tecnología.',
    eyebrow: 'Tecnología para tu día a día',
    title: 'Haz espacio para algo mejor.',
    description: 'Equipos, componentes y accesorios para llevar tus ideas más lejos.',
    action: 'Explorar catálogo',
  },
  {
    image: '/images/ofertas.jpg',
    alt: 'Promoción de temporada con notebooks, audífonos y productos tecnológicos.',
    eyebrow: 'Selección ElectroStore',
    title: 'Tecnología elegida con criterio.',
    description: 'Compara alternativas, revisa sus detalles y encuentra la opción adecuada para ti.',
    action: 'Ver productos',
  },
];

export default function HomeSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = slides[activeIndex];

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused]);

  function showSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  return (
    <section aria-label="Destacados de ElectroStore" className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
      <div aria-roledescription="carrusel" className="overflow-hidden rounded-[1.5rem] bg-[var(--color-deep)] shadow-[0_24px_65px_rgb(71_39_34/18%)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="relative isolate">
          <img
            alt={slide.alt}
            className="hero-media-enter aspect-[16/10] max-h-[560px] w-full object-cover sm:aspect-[16/7]"
            fetchPriority="high"
            key={slide.image}
            src={slide.image}
          />
          <div aria-hidden="true" className="absolute inset-0 -z-0 bg-gradient-to-r from-[#2b1718]/95 via-[#2b1718]/68 to-[#2b1718]/5" />
          <div className="absolute inset-y-0 left-0 z-10 flex max-w-2xl flex-col justify-end p-6 pb-9 text-white sm:justify-center sm:p-10 lg:p-16">
            <p className="w-fit border-l-2 border-[#ef7777] pl-3 text-xs font-bold uppercase tracking-[0.16em] text-[#f6d8d5] sm:text-sm">{slide.eyebrow}</p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{slide.title}</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#f3e8df] sm:text-base">{slide.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="group inline-flex w-fit rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-[#d3363f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" to="/catalogo">{slide.action}<span aria-hidden="true" className="ml-2 transition-transform group-hover:translate-x-1">→</span></Link>
              <a className="inline-flex w-fit rounded-full border border-white/45 bg-[#2b1718]/25 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10" href="#categorias">Ver categorías</a>
            </div>
          </div>
          <div aria-label="Controles del carrusel" className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-3 sm:px-5">
            <button aria-label="Mostrar imagen anterior" className="grid size-10 place-items-center rounded-full border border-white/30 bg-[#2b1718]/45 text-2xl text-white shadow backdrop-blur transition hover:bg-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => showSlide(activeIndex - 1)} type="button">‹</button>
            <button aria-label="Mostrar imagen siguiente" className="grid size-10 place-items-center rounded-full border border-white/30 bg-[#2b1718]/45 text-2xl text-white shadow backdrop-blur transition hover:bg-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => showSlide(activeIndex + 1)} type="button">›</button>
          </div>
        </div>
      </div>
      <div aria-label="Elegir imagen destacada" className="mt-4 flex justify-center gap-2.5">
        {slides.map((item, index) => (
          <button
            aria-current={index === activeIndex ? 'true' : undefined}
            aria-label={`Mostrar imagen ${index + 1}: ${item.title}`}
            className={`h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-9 bg-[var(--color-brand)]' : 'w-4 bg-[#c9bdb1] hover:bg-[#9d8b82]'}`}
            key={item.image}
            onClick={() => showSlide(index)}
            type="button"
          />
        ))}
      </div>
      {activeIndex === 1 && <p className="mt-3 text-center text-xs text-slate-500">Consulta en el catálogo los precios y la disponibilidad vigente.</p>}
    </section>
  );
}
