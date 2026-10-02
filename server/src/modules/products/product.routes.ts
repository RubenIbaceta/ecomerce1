import { Router } from 'express';
import { getProductBySlug, listProducts } from './product.service.ts';

export const productRouter = Router();

productRouter.get('/', async (request, response, next) => {
  try {
    response.json(await listProducts(request.query));
  } catch (error) {
    next(error);
  }
});

productRouter.get('/:slug', async (request, response, next) => {
  try {
    const product = await getProductBySlug(request.params.slug);
    if (!product) {
      response.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado.' } });
      return;
    }
    response.json({ data: product });
  } catch (error) {
    next(error);
  }
});
