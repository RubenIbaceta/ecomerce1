import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { isAllowedOrigin } from '../src/middleware/csrf.ts';
import { hashPassword, verifyPassword } from '../src/modules/auth/password.ts';
import { canTransitionOrderStatus } from '../src/modules/admin/order-status.ts';
import { getValidatedImageType } from '../src/modules/admin/image-upload.ts';
import { rm, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { uploadsDirectory, storeUploadedImage } from '../src/modules/admin/upload-storage.ts';

process.env.SESSION_SECRET = 'phase-nine-test-secret-long-enough-for-sessions';
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@127.0.0.1:5433/electronics_store';
process.env.APP_BASE_URL = 'http://127.0.0.1:5173';

let server;
let baseUrl;

before(async () => {
  const { createApp } = await import('../src/app.ts');
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('permite solo el origen configurado y rechaza valores ausentes o malformados', () => {
  assert.equal(isAllowedOrigin('http://127.0.0.1:5173', 'http://127.0.0.1:5173/'), true);
  assert.equal(isAllowedOrigin('https://malicioso.example', 'http://127.0.0.1:5173'), false);
  assert.equal(isAllowedOrigin(undefined, 'http://127.0.0.1:5173'), false);
  assert.equal(isAllowedOrigin('no-es-un-origen', 'http://127.0.0.1:5173'), false);
});

test('guarda contraseñas con scrypt y verifica la contraseña correcta', async () => {
  const password = 'una-clave-de-prueba-segura';
  const storedHash = await hashPassword(password);
  assert.notEqual(storedHash, password);
  assert.equal(await verifyPassword(password, storedHash), true);
  assert.equal(await verifyPassword('otra-clave-distinta', storedHash), false);
  assert.equal(await verifyPassword(password, 'hash-invalido'), false);
});

test('permite solo las transiciones de estado previstas para pedidos', () => {
  assert.equal(canTransitionOrderStatus('PENDING_PAYMENT', 'CANCELLED'), true);
  assert.equal(canTransitionOrderStatus('PAID', 'PREPARING'), true);
  assert.equal(canTransitionOrderStatus('PREPARING', 'SHIPPED'), true);
  assert.equal(canTransitionOrderStatus('SHIPPED', 'COMPLETED'), true);
  assert.equal(canTransitionOrderStatus('PENDING_PAYMENT', 'PAID'), false);
  assert.equal(canTransitionOrderStatus('CANCELLED', 'PAID'), false);
  assert.equal(canTransitionOrderStatus('COMPLETED', 'PREPARING'), false);
});

test('acepta tipos de imagen permitidos solo cuando coincide su firma', () => {
  assert.equal(getValidatedImageType('image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00]))?.extension, 'jpg');
  assert.equal(getValidatedImageType('image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.extension, 'png');
  assert.equal(getValidatedImageType('image/webp', Buffer.from('RIFFxxxxWEBP'))?.extension, 'webp');
  assert.equal(getValidatedImageType('image/png', Buffer.from('texto')), null);
  assert.equal(getValidatedImageType('image/svg+xml', Buffer.from('<svg/>')), null);
});

test('guarda las imágenes con nombres generados y las sirve desde la ruta pública', async () => {
  const image = Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02]);
  const imageUrl = await storeUploadedImage(image, 'jpg');
  const filePath = join(uploadsDirectory, basename(imageUrl));
  try {
    assert.match(imageUrl, /^\/api\/v1\/uploads\/[0-9a-f-]{36}\.jpg$/i);
    assert.deepEqual(await readFile(filePath), image);
    const response = await fetch(`${baseUrl}${imageUrl}`);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
  } finally {
    await rm(filePath, { force: true });
  }
});

test('rechaza operaciones de escritura sin el origen de la tienda', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'CSRF_ORIGIN_MISMATCH');
});

test('rechaza operaciones de escritura con un origen externo', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://malicioso.example' },
    body: '{}',
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'CSRF_ORIGIN_MISMATCH');
});

test('limita los intentos consecutivos de inicio de sesión', async () => {
  const statuses = [];
  for (let attempt = 0; attempt < 11; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173' },
      body: '{}',
    });
    statuses.push(response.status);
  }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(400));
  assert.equal(statuses[10], 429);
});

test('acepta el origen configurado y valida el contenido de la petición', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173' },
    body: '{}',
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'INVALID_INPUT');
});

test('aplica cabeceras de seguridad y limita el tamaño del JSON', async () => {
  const headersResponse = await fetch(`${baseUrl}/api/v1/health`);
  assert.equal(headersResponse.status, 200);
  assert.equal(headersResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headersResponse.headers.get('x-frame-options'), 'DENY');
  assert.match(headersResponse.headers.get('content-security-policy') ?? '', /default-src 'self'/);

  const oversizedResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173' },
    body: JSON.stringify({ padding: 'x'.repeat(17_000) }),
  });
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await oversizedResponse.json()).error.code, 'PAYLOAD_TOO_LARGE');

  const malformedJsonResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173' },
    body: '{malformado',
  });
  assert.equal(malformedJsonResponse.status, 400);
  assert.equal((await malformedJsonResponse.json()).error.code, 'INVALID_JSON');
});

test('mantiene protegidos pedidos y administración sin sesión', async () => {
  const [ordersResponse, adminResponse] = await Promise.all([
    fetch(`${baseUrl}/api/v1/orders`),
    fetch(`${baseUrl}/api/v1/admin/access`),
  ]);
  assert.equal(ordersResponse.status, 401);
  assert.equal(adminResponse.status, 401);
});

test('protege la ruta de carga de imágenes detrás de una sesión de administrador', async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', Origin: 'http://127.0.0.1:5173' },
    body: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  });
  assert.equal(response.status, 401);
});

test('mantiene disponible el retorno de formulario de Webpay sin Origin', async () => {
  const response = await fetch(`${baseUrl}/api/v1/payments/webpay/return`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: '',
  });
  assert.equal(response.status, 303);
  assert.match(response.headers.get('location') ?? '', /webpay=review/);
});
