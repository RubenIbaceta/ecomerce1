import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.ts';
import { estimateDeliveryDate, getShippingQuote, type ShippingMethod } from './shipping.ts';

type ShippingInput = {
  recipientName: string;
  phone: string;
  address: string;
  commune: string;
  region: string;
  shippingMethod: ShippingMethod;
};

export class OrderError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2034' || error.code === 'P2002');
}

async function inSerializableTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === 2) throw error;
    }
  }
  throw new Error('No se pudo completar la operación del pedido.');
}

function reservationMinutes() {
  const configured = Number(process.env.PAYMENT_RESERVATION_MINUTES ?? 15);
  return Number.isSafeInteger(configured) && configured >= 1 && configured <= 1440 ? configured : 15;
}

function newOrderNumber() {
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return 'ED-' + day + '-' + randomBytes(5).toString('hex').toUpperCase();
}

const orderInclude = {
  items: { orderBy: { createdAt: 'asc' as const } },
  payments: {
    orderBy: { createdAt: 'desc' as const },
    select: { id: true, provider: true, status: true, amountClp: true, authorizedAt: true, createdAt: true },
  },
  returnRequest: true,
};

export async function createOrder(userId: string, shipping: ShippingInput) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + reservationMinutes() * 60 * 1000);
  const shippingQuote = getShippingQuote(shipping.region, shipping.shippingMethod);
  if (!shippingQuote) throw new OrderError('El despacho prioritario solo está disponible en la Región Metropolitana.', 400, 'INVALID_SHIPPING_METHOD');

  return inSerializableTransaction(async (transaction) => {
    const cart = await transaction.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                priceClp: true,
                stock: true,
                isActive: true,
                category: { select: { isActive: true } },
              },
            },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) {
      throw new OrderError('Tu carrito está vacío.', 400, 'EMPTY_CART');
    }

    let subtotalClp = 0;
    for (const item of cart.items) {
      const product = item.product;
      if (!product.isActive || !product.category.isActive) {
        throw new OrderError('Uno de los productos ya no está disponible.', 409, 'PRODUCT_UNAVAILABLE');
      }
      if (product.stock < item.quantity) {
        throw new OrderError('El stock cambió. Ajusta las cantidades de tu carrito.', 409, 'INSUFFICIENT_STOCK');
      }
      subtotalClp += product.priceClp * item.quantity;
      if (!Number.isSafeInteger(subtotalClp) || subtotalClp > 2_147_483_647) {
        throw new OrderError('El total del pedido supera el monto permitido.', 400, 'ORDER_TOTAL_TOO_HIGH');
      }
    }
    if (!Number.isSafeInteger(subtotalClp + shippingQuote.priceClp) || subtotalClp + shippingQuote.priceClp > 2_147_483_647) {
      throw new OrderError('El total del pedido supera el monto permitido.', 400, 'ORDER_TOTAL_TOO_HIGH');
    }

    for (const item of cart.items) {
      const reserved = await transaction.product.updateMany({
        where: {
          id: item.productId,
          isActive: true,
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });
      if (reserved.count !== 1) {
        throw new OrderError('El stock cambió. Ajusta las cantidades de tu carrito.', 409, 'INSUFFICIENT_STOCK');
      }
    }

    const order = await transaction.order.create({
      data: {
        orderNumber: newOrderNumber(),
        userId,
        status: 'PENDING_PAYMENT',
        subtotalClp,
        shippingClp: shippingQuote.priceClp,
        shippingMethod: shippingQuote.method,
        estimatedDeliveryAt: estimateDeliveryDate(now, shippingQuote.maxDays),
        totalClp: subtotalClp + shippingQuote.priceClp,
        recipientName: shipping.recipientName,
        phone: shipping.phone,
        address: shipping.address,
        commune: shipping.commune,
        region: shipping.region,
        reservationExpiresAt: expiresAt,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            sku: item.product.sku,
            productName: item.product.name,
            unitPriceClp: item.product.priceClp,
            quantity: item.quantity,
          })),
        },
      },
      include: orderInclude,
    });

    await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
    await transaction.cart.update({ where: { id: cart.id }, data: { updatedAt: now } });
    return order;
  });
}

export function listOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: orderInclude,
  });
}

export function getOrder(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });
}

export async function requestOrderReturn(userId: string, orderId: string, reason: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { payments: { where: { status: 'APPROVED' }, take: 1 }, returnRequest: true },
  });
  if (!order) throw new OrderError('No encontramos ese pedido.', 404, 'ORDER_NOT_FOUND');
  if (!['PAID', 'PREPARING', 'SHIPPED', 'COMPLETED'].includes(order.status) || !order.paidAt || order.payments.length === 0) {
    throw new OrderError('Solo puedes solicitar devolución de una compra pagada y confirmada.', 409, 'ORDER_NOT_RETURNABLE');
  }
  const daysSincePayment = (Date.now() - order.paidAt.getTime()) / (24 * 60 * 60 * 1000);
  if (daysSincePayment > 30) throw new OrderError('El plazo de solicitud de devolución es de 30 días desde el pago.', 409, 'RETURN_WINDOW_EXPIRED');
  if (order.returnRequest) throw new OrderError('Este pedido ya tiene una solicitud de devolución.', 409, 'RETURN_ALREADY_REQUESTED');
  try {
    return await prisma.returnRequest.create({
      data: { orderId, amountClp: order.totalClp, reason },
      include: { order: { select: { orderNumber: true } } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new OrderError('Este pedido ya tiene una solicitud de devolución.', 409, 'RETURN_ALREADY_REQUESTED');
    }
    throw error;
  }
}

export async function payDemoOrder(userId: string, orderId: string) {
  const now = new Date();
  await inSerializableTransaction(async (transaction) => {
    const order = await transaction.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new OrderError('No encontramos ese pedido.', 404, 'ORDER_NOT_FOUND');
    if (order.status === 'PAID') return;
    if (order.status !== 'PENDING_PAYMENT') {
      throw new OrderError('Este pedido ya no está pendiente de pago.', 409, 'ORDER_NOT_PAYABLE');
    }
    if (order.reservationExpiresAt <= now) {
      throw new OrderError('La reserva de stock venció. Crea un nuevo pedido desde tu carrito.', 409, 'RESERVATION_EXPIRED');
    }

    await transaction.payment.create({
      data: {
        orderId,
        provider: 'DEMO',
        status: 'APPROVED',
        reference: 'DEMO-' + order.orderNumber,
        amountClp: order.totalClp,
        responseCode: 'SIMULATED_APPROVAL',
        authorizedAt: now,
      },
    });
    const updated = await transaction.order.updateMany({
      where: {
        id: orderId,
        userId,
        status: 'PENDING_PAYMENT',
        reservationExpiresAt: { gt: now },
      },
      data: { status: 'PAID', paidAt: now },
    });
    if (updated.count !== 1) {
      throw new OrderError('La reserva de stock venció. Crea un nuevo pedido desde tu carrito.', 409, 'RESERVATION_EXPIRED');
    }
  });
  return getOrder(userId, orderId);
}

export async function cancelOrder(userId: string, orderId: string) {
  const now = new Date();
  await inSerializableTransaction(async (transaction) => {
    const order = await transaction.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new OrderError('No encontramos ese pedido.', 404, 'ORDER_NOT_FOUND');
    if (order.status !== 'PENDING_PAYMENT') {
      throw new OrderError('Solo puedes cancelar pedidos pendientes de pago.', 409, 'ORDER_NOT_CANCELLABLE');
    }

    const changed = await transaction.order.updateMany({
      where: { id: orderId, userId, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
    if (changed.count !== 1) {
      throw new OrderError('El estado del pedido cambió. Actualiza la página.', 409, 'ORDER_STATE_CHANGED');
    }
    for (const item of order.items) {
      await transaction.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  });
  return getOrder(userId, orderId);
}

export async function releaseExpiredReservations(now = new Date()) {
  const expired = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', reservationExpiresAt: { lte: now } },
    select: { id: true },
    take: 100,
    orderBy: { reservationExpiresAt: 'asc' },
  });

  let released = 0;
  for (const candidate of expired) {
    const changed = await inSerializableTransaction(async (transaction) => {
      const order = await transaction.order.findUnique({
        where: { id: candidate.id },
        include: { items: true },
      });
      if (!order || order.status !== 'PENDING_PAYMENT' || order.reservationExpiresAt > now) return false;

      const cancelled = await transaction.order.updateMany({
        where: {
          id: order.id,
          status: 'PENDING_PAYMENT',
          reservationExpiresAt: { lte: now },
        },
        data: { status: 'CANCELLED', cancelledAt: now },
      });
      if (cancelled.count !== 1) return false;

      for (const item of order.items) {
        await transaction.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      return true;
    });
    if (changed) released += 1;
  }
  return released;
}
