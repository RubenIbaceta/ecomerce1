export type ShippingMethod = 'STANDARD' | 'EXPRESS';

export type ShippingQuote = {
  method: ShippingMethod;
  label: string;
  priceClp: number;
  minDays: number;
  maxDays: number;
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function shippingQuotes(region: string): ShippingQuote[] {
  const normalized = normalize(region);
  const isMetropolitan = normalized === 'rm' || normalized.includes('metropolitana') || normalized.includes('santiago');
  const isCentral = isMetropolitan || ['valparaiso', 'ohiggins', 'libertador', 'maule'].some((name) => normalized.includes(name));
  const standard = isMetropolitan
    ? { method: 'STANDARD' as const, label: 'Despacho estándar', priceClp: 2990, minDays: 2, maxDays: 3 }
    : isCentral
      ? { method: 'STANDARD' as const, label: 'Despacho estándar', priceClp: 4990, minDays: 3, maxDays: 5 }
      : { method: 'STANDARD' as const, label: 'Despacho estándar', priceClp: 6990, minDays: 5, maxDays: 8 };
  return isMetropolitan
    ? [standard, { method: 'EXPRESS', label: 'Despacho prioritario', priceClp: 4990, minDays: 1, maxDays: 2 }]
    : [standard];
}

export function getShippingQuote(region: string, method: ShippingMethod) {
  const quote = shippingQuotes(region).find((option) => option.method === method);
  if (!quote) return null;
  return quote;
}

export function estimateDeliveryDate(now: Date, maxDays: number) {
  const estimated = new Date(now);
  let added = 0;
  while (added < maxDays) {
    estimated.setUTCDate(estimated.getUTCDate() + 1);
    const weekday = estimated.getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return estimated;
}
