import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url) });
const { prisma } = await import('../src/config/prisma.ts');
const { createOrder, cancelOrder, payDemoOrder, releaseExpiredReservations, requestOrderReturn } = await import('../src/modules/orders/orders.service.ts');
const { updateAdminReturnRequest } = await import('../src/modules/admin/admin.service.ts');
const { rejectPaymentAndRelease } = await import('../src/modules/payments/webpay.service.ts');

test('completa reserva, cancelación, vencimiento, pago confirmado y devolución simulada', { timeout: 30_000 }, async () => {
  const suffix = randomUUID();
  let userId;
  let categoryId;
  let productId;
  try {
    const user = await prisma.user.create({ data: { name: 'Comprador de prueba', email: `order-${suffix}@example.test`, passwordHash: 'test-only-hash' } });
    userId = user.id;
    const category = await prisma.category.create({ data: { name: `Prueba ${suffix}`, slug: `prueba-${suffix}` } });
    categoryId = category.id;
    const product = await prisma.product.create({
      data: { categoryId, sku: `TEST-${suffix}`, slug: `test-${suffix}`, name: 'Producto de integración', description: 'Producto utilizado solo por la prueba de integración.', priceClp: 10000, stock: 5 },
    });
    productId = product.id;
    const cart = await prisma.cart.create({ data: { userId } });

    const shipping = { recipientName: 'Comprador de prueba', phone: '+56912345678', address: 'Calle de prueba 123', commune: 'Santiago', region: 'Región Metropolitana de Santiago', shippingMethod: 'STANDARD' };
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: 2 } });
    const cancellable = await createOrder(userId, shipping);
    assert.equal(cancellable.totalClp, 22990);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock, 3);
    await cancelOrder(userId, cancellable.id);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock, 5);

    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: 2 } });
    const declined = await createOrder(userId, shipping);
    const declinedPayment = await prisma.payment.create({ data: { orderId: declined.id, provider: 'WEBPAY', status: 'PENDING', reference: `declined-${suffix}`, amountClp: declined.totalClp } });
    await rejectPaymentAndRelease(declinedPayment.id, 'DECLINED_TEST');
    const declinedResult = await prisma.order.findUniqueOrThrow({ where: { id: declined.id }, include: { payments: true } });
    assert.equal(declinedResult.status, 'CANCELLED');
    assert.equal(declinedResult.payments[0].status, 'REJECTED');
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock, 5);

    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: 1 } });
    const expiring = await createOrder(userId, shipping);
    await prisma.order.update({ where: { id: expiring.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    assert.equal(await releaseExpiredReservations(), 1);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock, 5);

    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: 1 } });
    const payable = await createOrder(userId, shipping);
    const paid = await payDemoOrder(userId, payable.id);
    assert.equal(paid.status, 'PAID');
    assert.equal(paid.shippingClp, 2990);
    assert.equal(paid.totalClp, 12990);
    assert.equal(paid.payments.some((payment) => payment.status === 'APPROVED'), true);
    const returnRequest = await requestOrderReturn(userId, payable.id, 'Quiero devolver el producto de la prueba.');
    const refunded = await updateAdminReturnRequest(returnRequest.id, 'REFUNDED');
    assert.equal(refunded.status, 'REFUNDED');
    assert.match(refunded.adminNote, /simulada/i);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock, 4);
  } finally {
    if (userId) {
      await prisma.order.deleteMany({ where: { userId } });
      await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
      await prisma.cart.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
  }
});
