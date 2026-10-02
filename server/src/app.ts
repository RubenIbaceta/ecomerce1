import express from 'express';
import { categoryRouter } from './modules/categories/category.routes.ts';
import { productRouter } from './modules/products/product.routes.ts';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/api/v1/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'electronics-store-api',
    });
  });

  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/categories', categoryRouter);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
      ? error.status
      : 500;
    const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'INTERNAL_ERROR';
    const message = status === 500
      ? 'Ocurrió un error inesperado.'
      : error instanceof Error ? error.message : 'Solicitud inválida.';

    if (status === 500) console.error(error);
    response.status(status).json({ error: { code, message } });
  });

  return app;
}
