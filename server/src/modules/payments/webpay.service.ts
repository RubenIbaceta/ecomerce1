import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import transbankSdk from 'transbank-sdk';
import { prisma } from '../../config/prisma.ts';
import { OrderError } from '../orders/orders.service.ts';

const defaultReturnUrl = 'http://localhost:3001/api/v1/payments/webpay/return';
const defaultAppUrl = 'http://localhost:5173';
const placeholderPrefix = 'INIT-';
const { Environment, IntegrationApiKeys, IntegrationCommerceCodes, Options, WebpayPlus } = transbankSdk;

type ProviderResponse = Record<string, unknown>;

function providerError(message: string, status = 502, code = 'WEBPAY_UNAVAILABLE') {
  return new OrderError(message, status, code);
}

function integrationTransaction() {
  if ((process.env.WEBPAY_ENV ?? 'integration').toLowerCase() !== 'integration') {
    throw providerError('Webpay está habilitado solo en ambiente de integración.', 503, 'WEBPAY_TEST_ONLY');
  }
  const commerceCode = process.env.WEBPAY_COMMERCE_CODE?.trim() || IntegrationCommerceCodes.WEBPAY_PLUS;
  const apiKey = process.env.WEBPAY_API_KEY?.trim() || IntegrationApiKeys.WEBPAY;
  return new WebpayPlus.Transaction(new Options(commerceCode, apiKey, Environment.Integration));
}

function readField<T>(response: ProviderResponse, camel: string, snake: string): T | undefined {
  return (response[camel] ?? response[snake]) as T | undefined;
}

function frontendOrderUrl(orderId: string, result: 'paid' | 'failed' | 'review') {
  const base = (process.env.APP_BASE_URL ?? defaultAppUrl).replace(/\/$/, '');
  return `${base}/pedidos/${encodeURIComponent(orderId)}?webpay=${result}`;
}

function returnUrl() {
  return process.env.WEBPAY_RETURN_URL?.trim() || defaultReturnUrl;
}

async function serializable<T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)
        || (error.code !== 'P2034' && error.code !== 'P2002') || attempt === 2) throw error;
    }
  }
  throw new Error('No se pudo preparar el pago Webpay.');
}

export async function startWebpayPayment(userId: string, orderId: string) {
  const attempt = await serializable(async (transaction) => {
    const order = await transaction.order.findFirst({
      where: { id: orderId, userId },
      include: { payments: { where: { provider: 'WEBPAY' }, orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new OrderError('No encontramos ese pedido.', 404, 'ORDER_NOT_FOUND');
    if (order.status !== 'PENDING_PAYMENT') {
      throw new OrderError('Este pedido ya no está pendiente de pago.', 409, 'ORDER_NOT_PAYABLE');
    }
    if (order.reservationExpiresAt <= new Date()) {
      throw new OrderError('La reserva de stock venció. Crea un nuevo pedido desde tu carrito.', 409, 'RESERVATION_EXPIRED');
    }

    const pending = order.payments.find((payment) => payment.status === 'PENDING');
    if (pending) {
      if (pending.reference.startsWith(placeholderPrefix)) {
        throw new OrderError('Ya estamos iniciando el pago. Espera unos segundos y vuelve a intentarlo.', 409, 'WEBPAY_STARTING');
      }
      return { paymentId: pending.id, token: pending.reference, order, reuse: true as const };
    }

    const payment = await transaction.payment.create({
      data: {
        orderId,
        provider: 'WEBPAY',
        status: 'PENDING',
        reference: placeholderPrefix + randomBytes(16).toString('hex'),
        amountClp: order.totalClp,
      },
    });
    return { paymentId: payment.id, token: payment.reference, order, reuse: false as const };
  });

  if (attempt.reuse) {
    return { url: Environment.Integration + '/webpayserver/initTransaction', token: attempt.token };
  }

  try {
    const response = await integrationTransaction().create(
      attempt.order.orderNumber,
      randomBytes(16).toString('hex'),
      attempt.order.totalClp,
      returnUrl(),
    ) as ProviderResponse;
    const token = readField<string>(response, 'token', 'token');
    const url = readField<string>(response, 'url', 'url');
    if (!token || !url) throw new Error('La respuesta de Webpay no incluyó token y URL.');

    const linked = await prisma.payment.updateMany({
      where: { id: attempt.paymentId, status: 'PENDING', reference: attempt.token },
      data: { reference: token },
    });
    const latestOrder = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, reservationExpiresAt: true } });
    if (linked.count !== 1 || latestOrder?.status !== 'PENDING_PAYMENT' || latestOrder.reservationExpiresAt <= new Date()) {
      await prisma.payment.updateMany({ where: { id: attempt.paymentId, status: 'PENDING' }, data: { status: 'REJECTED', responseCode: 'ORDER_UNAVAILABLE' } });
      throw new OrderError('El pedido dejó de estar disponible mientras iniciábamos el pago.', 409, 'ORDER_NOT_PAYABLE');
    }
    return { url, token };
  } catch (error) {
    await prisma.payment.updateMany({
      where: { id: attempt.paymentId, status: 'PENDING', reference: attempt.token },
      data: { status: 'REJECTED', responseCode: 'CREATE_FAILED' },
    });
    if (error instanceof OrderError) throw error;
    console.error('No se pudo iniciar una transacción Webpay.');
    throw providerError('Webpay no pudo iniciar el pago. Intenta nuevamente.');
  }
}

export async function rejectPaymentAndRelease(paymentId: string, responseCode: string) {
  return serializable(async (transaction) => {
    const payment = await transaction.payment.findUnique({ where: { id: paymentId }, include: { order: { include: { items: true } } } });
    if (!payment) return null;
    if (payment.status === 'APPROVED') return payment.order.id;
    await transaction.payment.updateMany({ where: { id: paymentId, status: 'PENDING' }, data: { status: 'REJECTED', responseCode } });
    const cancelled = await transaction.order.updateMany({
      where: { id: payment.orderId, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (cancelled.count === 1) {
      for (const item of payment.order.items) {
        await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }
    return payment.order.id;
  });
}

async function markPaymentApproved(paymentId: string, response: ProviderResponse) {
  const now = new Date();
  const responseCode = readField<number>(response, 'responseCode', 'response_code');
  const amount = readField<number>(response, 'amount', 'amount');
  const buyOrder = readField<string>(response, 'buyOrder', 'buy_order');
  const status = readField<string>(response, 'status', 'status');
  const authorizationCode = readField<string>(response, 'authorizationCode', 'authorization_code');

  return serializable(async (transaction) => {
    const payment = await transaction.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment) return null;
    if (payment.status === 'APPROVED') return { orderId: payment.orderId, approved: true };
    const isAuthorized = status === 'AUTHORIZED' && responseCode === 0
      && amount === payment.amountClp && buyOrder === payment.order.orderNumber;
    if (!isAuthorized) return null;
    const paid = await transaction.order.updateMany({
      where: {
        id: payment.orderId,
        status: 'PENDING_PAYMENT',
        reservationExpiresAt: { gt: now },
        totalClp: payment.amountClp,
      },
      data: { status: 'PAID', paidAt: now },
    });
    if (paid.count !== 1) return { orderId: payment.orderId, approved: false };
    await transaction.payment.update({
      where: { id: paymentId },
      data: { status: 'APPROVED', authorizedAt: now, responseCode: authorizationCode ?? String(responseCode) },
    });
    return { orderId: payment.orderId, approved: true };
  });
}

export async function handleWebpayReturn(token: string | undefined, cancelledToken?: string) {
  const callbackToken = token || cancelledToken;
  if (!callbackToken) return { result: 'review' as const, redirectUrl: (process.env.APP_BASE_URL ?? defaultAppUrl) + '/pedidos?webpay=review' };

  const payment = await prisma.payment.findUnique({ where: { reference: callbackToken }, include: { order: true } });
  if (!payment || payment.provider !== 'WEBPAY') {
    return { result: 'review' as const, redirectUrl: (process.env.APP_BASE_URL ?? defaultAppUrl) + '/pedidos?webpay=review' };
  }
  if (payment.status === 'APPROVED' || payment.order.status === 'PAID') {
    return { result: 'paid' as const, redirectUrl: frontendOrderUrl(payment.orderId, 'paid') };
  }
  if (payment.status === 'REJECTED') {
    return { result: 'failed' as const, redirectUrl: frontendOrderUrl(payment.orderId, 'failed') };
  }

  if (cancelledToken) {
    const orderId = await rejectPaymentAndRelease(payment.id, 'CARDHOLDER_CANCELLED');
    return orderId
      ? { result: 'failed' as const, redirectUrl: frontendOrderUrl(orderId, 'failed') }
      : { result: 'review' as const, redirectUrl: frontendOrderUrl(payment.orderId, 'review') };
  }

  let confirmation: ProviderResponse;
  const transaction = integrationTransaction();
  try {
    confirmation = await transaction.commit(callbackToken) as ProviderResponse;
  } catch {
    try {
      confirmation = await transaction.status(callbackToken) as ProviderResponse;
    } catch (error) {
      console.error('No se pudo resolver el resultado de Webpay.');
      return { result: 'review' as const, redirectUrl: frontendOrderUrl(payment.orderId, 'review') };
    }
  }

  const status = readField<string>(confirmation, 'status', 'status');
  const responseCode = readField<number>(confirmation, 'responseCode', 'response_code');
  const amount = readField<number>(confirmation, 'amount', 'amount');
  const buyOrder = readField<string>(confirmation, 'buyOrder', 'buy_order');
  if (status === 'AUTHORIZED' && responseCode === 0) {
    const decision = await markPaymentApproved(payment.id, confirmation);
    if (decision?.approved) return { result: 'paid' as const, redirectUrl: frontendOrderUrl(decision.orderId, 'paid') };

    try {
      const refundAmount = typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0 ? amount : payment.amountClp;
      await transaction.refund(callbackToken, refundAmount);
      await rejectPaymentAndRelease(payment.id, 'ORDER_UNAVAILABLE_REFUNDED');
    } catch {
      console.error('Webpay autorizó un pedido no disponible y no se pudo completar la devolución.');
      await rejectPaymentAndRelease(payment.id, 'REFUND_REQUIRED');
    }
    return { result: 'failed' as const, redirectUrl: frontendOrderUrl(payment.orderId, 'failed') };
  }

  if (!['FAILED', 'REVERSED', 'NULLIFIED'].includes(String(status))) {
    return { result: 'review' as const, redirectUrl: frontendOrderUrl(payment.orderId, 'review') };
  }

  const orderId = await rejectPaymentAndRelease(payment.id, `DECLINED_${String(responseCode ?? status ?? 'UNKNOWN').slice(0, 40)}`);
  return orderId
    ? { result: 'failed' as const, redirectUrl: frontendOrderUrl(orderId, 'failed') }
    : { result: 'review' as const, redirectUrl: frontendOrderUrl(payment.orderId, 'review') };
}

export async function refundWebpayPayment(token: string, amountClp: number) {
  if (!Number.isSafeInteger(amountClp) || amountClp < 1) throw providerError('El monto de devolución no es válido.', 400, 'INVALID_REFUND_AMOUNT');
  try {
    const response = await integrationTransaction().refund(token, amountClp) as ProviderResponse;
    const type = readField<string>(response, 'type', 'type');
    const responseCode = readField<number>(response, 'responseCode', 'response_code');
    if (type !== 'REVERSED' && !(type === 'NULLIFIED' && responseCode === 0)) {
      throw providerError('Webpay no confirmó el reembolso. La solicitud quedó marcada para revisión manual.', 502, 'REFUND_REQUIRES_REVIEW');
    }
    return response;
  } catch {
    // Si la respuesta no fue concluyente, no se marca el reembolso como completado.
    console.error('Webpay no pudo resolver la solicitud de devolución.');
    throw providerError('Webpay no confirmó la devolución. La solicitud quedó marcada para revisión manual.', 502, 'REFUND_REQUIRES_REVIEW');
  }
}
