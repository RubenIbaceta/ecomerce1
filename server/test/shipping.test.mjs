import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateDeliveryDate, getShippingQuote, shippingQuotes } from '../src/modules/orders/shipping.ts';

test('calcula opciones de despacho y limita la alternativa prioritaria a la Región Metropolitana', () => {
  assert.deepEqual(shippingQuotes('Región Metropolitana de Santiago').map(({ method, priceClp }) => [method, priceClp]), [
    ['STANDARD', 2990], ['EXPRESS', 4990],
  ]);
  assert.deepEqual(shippingQuotes('Región de Valparaíso').map(({ method, priceClp }) => [method, priceClp]), [
    ['STANDARD', 4990],
  ]);
  assert.equal(getShippingQuote('Región de Valparaíso', 'EXPRESS'), null);
  assert.equal(getShippingQuote('Región Metropolitana de Santiago', 'STANDARD')?.minDays, 2);
});

test('calcula la fecha estimada en días hábiles y omite fines de semana', () => {
  const friday = new Date('2026-10-02T12:00:00.000Z');
  assert.equal(estimateDeliveryDate(friday, 1).toISOString(), '2026-10-05T12:00:00.000Z');
  assert.equal(estimateDeliveryDate(friday, 3).toISOString(), '2026-10-07T12:00:00.000Z');
});
