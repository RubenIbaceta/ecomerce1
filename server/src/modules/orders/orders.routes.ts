import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.ts';
import { cancelOrder, createOrder, getOrder, listOrders, payDemoOrder, requestOrderReturn } from './orders.service.ts';
import { shippingQuotes } from './shipping.ts';

export const ordersRouter = Router();
const orderActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_ACTIONS', message: 'Has realizado muchas acciones de pedido. Intenta más tarde.' } },
});

const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(20).regex(/^[+0-9 ()-]+$/),
  address: z.string().trim().min(5).max(200),
  commune: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  shippingMethod: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
});

ordersRouter.use(requireAuth);

ordersRouter.get('/shipping-quote', async (request, response) => {
  const parsed = z.string().trim().min(2).max(80).safeParse(request.query.region);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_REGION', message: 'Indica una región válida para calcular el despacho.' } });
    return;
  }
  response.json({ data: shippingQuotes(parsed.data) });
});

function orderIdFromRequest(value: unknown) {
  return z.string().uuid().safeParse(value);
}

ordersRouter.post('/', orderActionLimiter, async (request, response, next) => {
  const parsed = checkoutSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: 'INVALID_CHECKOUT',
        message: 'Revisa el nombre, teléfono y dirección de entrega.',
      },
    });
    return;
  }
  try {
    response.status(201).json({ data: await createOrder(request.currentUser!.id, parsed.data) });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get('/', async (request, response, next) => {
  try {
    response.json({ data: await listOrders(request.currentUser!.id) });
  } catch (error) {
    next(error);
  }
});

if (process.env.NODE_ENV !== 'production') {
  ordersRouter.post('/:orderId/payments/demo', orderActionLimiter, async (request, response, next) => {
    const parsedId = orderIdFromRequest(request.params.orderId);
    if (!parsedId.success) {
      response.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'El número de pedido no es válido.' } });
      return;
    }
    try {
      response.json({ data: await payDemoOrder(request.currentUser!.id, parsedId.data) });
    } catch (error) {
      next(error);
    }
  });
}

ordersRouter.post('/:orderId/cancel', orderActionLimiter, async (request, response, next) => {
  const parsedId = orderIdFromRequest(request.params.orderId);
  if (!parsedId.success) {
    response.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'El número de pedido no es válido.' } });
    return;
  }
  try {
    response.json({ data: await cancelOrder(request.currentUser!.id, parsedId.data) });
  } catch (error) {
    next(error);
  }
});

ordersRouter.post('/:orderId/returns', orderActionLimiter, async (request, response, next) => {
  const parsedId = orderIdFromRequest(request.params.orderId);
  const parsed = z.object({ reason: z.string().trim().min(10).max(1000) }).safeParse(request.body);
  if (!parsedId.success || !parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_RETURN_REQUEST', message: 'Describe brevemente el motivo (entre 10 y 1000 caracteres).' } });
    return;
  }
  try {
    response.status(201).json({ data: await requestOrderReturn(request.currentUser!.id, parsedId.data, parsed.data.reason) });
  } catch (error) { next(error); }
});

ordersRouter.get('/:orderId', async (request, response, next) => {
  const parsedId = orderIdFromRequest(request.params.orderId);
  if (!parsedId.success) {
    response.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'El número de pedido no es válido.' } });
    return;
  }
  try {
    const order = await getOrder(request.currentUser!.id, parsedId.data);
    if (!order) {
      response.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'No encontramos ese pedido.' } });
      return;
    }
    response.json({ data: order });
  } catch (error) {
    next(error);
  }
});
