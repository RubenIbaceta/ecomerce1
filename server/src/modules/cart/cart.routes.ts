import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.ts';
import { addCartItem, getCart, removeCartItem, updateCartItem } from './cart.service.ts';

export const cartRouter = Router();

const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

cartRouter.use(requireAuth);

cartRouter.get('/', async (request, response, next) => {
  try {
    response.json({ data: await getCart(request.currentUser!.id) });
  } catch (error) {
    next(error);
  }
});

cartRouter.post('/items', async (request, response, next) => {
  const parsed = addItemSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Indica un producto y una cantidad válida.' } });
    return;
  }
  try {
    response.status(201).json({ data: await addCartItem(request.currentUser!.id, parsed.data.productId, parsed.data.quantity) });
  } catch (error) {
    next(error);
  }
});

cartRouter.patch('/items/:itemId', async (request, response, next) => {
  const itemId = z.string().uuid().safeParse(request.params.itemId);
  const parsed = updateItemSchema.safeParse(request.body);
  if (!itemId.success || !parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Indica un artículo y una cantidad válida.' } });
    return;
  }
  try {
    response.json({ data: await updateCartItem(request.currentUser!.id, itemId.data, parsed.data.quantity) });
  } catch (error) {
    next(error);
  }
});

cartRouter.delete('/items/:itemId', async (request, response, next) => {
  const itemId = z.string().uuid().safeParse(request.params.itemId);
  if (!itemId.success) {
    response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'El artículo indicado no es válido.' } });
    return;
  }
  try {
    await removeCartItem(request.currentUser!.id, itemId.data);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});
