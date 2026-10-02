import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.ts';
import { startWebpayPayment, handleWebpayReturn } from './webpay.service.ts';

export const paymentsRouter = Router();

const orderIdSchema = z.string().uuid();
const tokenSchema = z.string().trim().min(1).max(128);

paymentsRouter.post('/orders/:orderId/payments/webpay', requireAuth, async (request, response, next) => {
  const orderId = orderIdSchema.safeParse(request.params.orderId);
  if (!orderId.success) {
    response.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'El número de pedido no es válido.' } });
    return;
  }
  try {
    response.json({ data: await startWebpayPayment(request.currentUser!.id, orderId.data) });
  } catch (error) {
    next(error);
  }
});

async function returnFromWebpay(tokenValue: unknown, cancelledValue: unknown, response: Parameters<Parameters<typeof paymentsRouter.get>[1]>[1]) {
  const token = tokenSchema.safeParse(tokenValue);
  const cancelledToken = tokenSchema.safeParse(cancelledValue);
  try {
    const result = await handleWebpayReturn(token.success ? token.data : undefined, cancelledToken.success ? cancelledToken.data : undefined);
    response.redirect(303, result.redirectUrl);
  } catch {
    nextRedirect(response);
    console.error('No se pudo procesar el retorno de Webpay.');
  }
}

function nextRedirect(response: Parameters<Parameters<typeof paymentsRouter.get>[1]>[1]) {
  const base = (process.env.APP_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  response.redirect(303, base + '/pedidos?webpay=review');
}

paymentsRouter.get('/payments/webpay/return', async (request, response) => {
  await returnFromWebpay(request.query.token_ws, request.query.TBK_TOKEN, response);
});

paymentsRouter.post('/payments/webpay/return', async (request, response) => {
  await returnFromWebpay(request.body?.token_ws, request.body?.TBK_TOKEN, response);
});
