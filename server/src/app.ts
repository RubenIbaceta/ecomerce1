import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { categoryRouter } from './modules/categories/category.routes.ts';
import { productRouter } from './modules/products/product.routes.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { cartRouter } from './modules/cart/cart.routes.ts';
import { requireAuth, requireRole } from './middleware/auth.ts';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(express.json());
  const sessionSecret = process.env.SESSION_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  if (!sessionSecret || sessionSecret.length < 32 || !databaseUrl) {
    throw new Error('SESSION_SECRET (32 caracteres o más) y DATABASE_URL son obligatorios.');
  }
  const PgSession = connectPgSimple(session);
  app.use(session({
    name: 'electro.sid',
    store: new PgSession({
      conString: databaseUrl,
      tableName: 'user_sessions',
      createTableIfMissing: false,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    },
  }));

  app.get('/api/v1/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'electronics-store-api',
    });
  });

  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/cart', cartRouter);
  app.get('/api/v1/admin/access', requireAuth, requireRole('ADMIN'), (_request, response) => {
    response.json({ data: { access: 'admin' } });
  });

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
