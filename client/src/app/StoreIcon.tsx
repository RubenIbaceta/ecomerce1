import type { ReactNode } from 'react';

type IconName =
  | 'account'
  | 'cart'
  | 'search'
  | 'shipping'
  | 'secure'
  | 'support'
  | 'warranty'
  | 'computer'
  | 'component'
  | 'storage'
  | 'memory'
  | 'monitor'
  | 'audio'
  | 'peripheral'
  | 'graphics'
  | 'processor'
  | 'accessory'
  | 'product';

const paths: Record<IconName, ReactNode> = {
  account: <><circle cx="12" cy="8" r="3" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
  cart: <><path d="M3 4h2l2.2 10h9.9l2-7H6" /><circle cx="9" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  shipping: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  secure: <><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6z" /><path d="m9 12 2 2 4-5" /></>,
  support: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><path d="M4 13h3v6H5a1 1 0 0 1-1-1zm16 0h-3v6h2a1 1 0 0 0 1-1zM17 19c-1 2-3 2-5 2" /></>,
  warranty: <><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6z" /><path d="m9.5 12 1.5 1.5 3.5-4" /></>,
  computer: <><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M8 20h8m-4-4v4" /></>,
  component: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1v3m6-3v3M9 20v3m6-3v3M1 9h3m-3 6h3m16-6h3m-3 6h3M10 10h4v4h-4z" /></>,
  storage: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6m-16 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  memory: <><rect x="3" y="7" width="18" height="10" rx="1" /><path d="M7 10h2v4H7zm4 0h2v4h-2zm4 0h2v4h-2zM6 17v3m4-3v3m4-3v3m4-3v3" /></>,
  monitor: <><rect x="3" y="3" width="18" height="13" rx="1" /><path d="M8 21h8m-4-5v5" /></>,
  audio: <><path d="M5 10v4h4l5 4V6l-5 4zM18 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12" /></>,
  peripheral: <><rect x="7" y="3" width="10" height="18" rx="5" /><path d="M12 3v6m-5 2h10" /></>,
  graphics: <><rect x="3" y="6" width="18" height="12" rx="1" /><circle cx="11" cy="12" r="4" /><path d="M21 10h2m-2 4h2M6 18v3m4-3v3m4-3v3" /></>,
  processor: <><rect x="7" y="7" width="10" height="10" rx="1" /><path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" /></>,
  accessory: <><path d="M8 7h8a5 5 0 0 1 5 5v4a3 3 0 0 1-5.3 1.9L14 16h-4l-1.7 1.9A3 3 0 0 1 3 16v-4a5 5 0 0 1 5-5z" /><path d="M7 12h4m-2-2v4m7-2h.01" /></>,
  product: <><path d="m4 7 8-4 8 4-8 4z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
};

export function StoreIcon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">{paths[name]}</svg>;
}

export function categoryIcon(slug: string): IconName {
  if (slug.includes('almacen')) return 'storage';
  if (slug.includes('memoria')) return 'memory';
  if (slug.includes('monitor')) return 'monitor';
  if (slug.includes('audio')) return 'audio';
  if (slug.includes('perifer')) return 'peripheral';
  if (slug.includes('graf')) return 'graphics';
  if (slug.includes('proces')) return 'processor';
  if (slug.includes('component')) return 'component';
  if (slug.includes('comput')) return 'computer';
  if (slug.includes('acces')) return 'accessory';
  return 'product';
}
