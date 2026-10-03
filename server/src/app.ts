import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { categoryRouter } from './modules/categories/category.routes.ts';
import { productRouter } from './modules/products/product.routes.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { cartRouter } from './modules/cart/cart.routes.ts';
import { ordersRouter } from './modules/orders/orders.routes.ts';
import { paymentsRouter } from './modules/payments/payments.routes.ts';
import { adminRouter } from './modules/admin/admin.routes.ts';
import { contactRouter } from './modules/contact/contact.routes.ts';
import { requireAuth, requireRole } from './middleware/auth.ts';
import { csrfProtection } from './middleware/csrf.ts';
import { uploadsDirectory } from './modules/admin/upload-storage.ts';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet({ frameguard: { action: 'deny' } }));
  app.use('/api/v1/admin/uploads', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }));
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb', parameterLimit: 100 }));
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
  app.use(csrfProtection);

  app.get('/api/v1/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'electronics-store-api',
    });
  });

  app.use('/api/v1/uploads', express.static(uploadsDirectory, {
    dotfiles: 'deny',
    index: false,
    immutable: true,
    maxAge: '1d',
  }));
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1', paymentsRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/contact', contactRouter);
  app.get('/api/v1/admin/access', requireAuth, requireRole('ADMIN'), (_request, response) => {
    response.json({ data: { access: 'admin' } });
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const errorType = typeof error === 'object' && error !== null && 'type' in error && typeof error.type === 'string'
      ? error.type
      : undefined;
    const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
      ? error.status
      : 500;
    let code = 'INTERNAL_ERROR';
    if (errorType === 'entity.too.large') code = 'PAYLOAD_TOO_LARGE';
    else if (errorType === 'entity.parse.failed') code = 'INVALID_JSON';
    else if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') code = error.code;
    const message = errorType === 'entity.too.large'
      ? 'La solicitud supera el tamaño máximo permitido.'
      : errorType === 'entity.parse.failed'
        ? 'El cuerpo de la solicitud no contiene JSON válido.'
        : status === 500
          ? 'Ocurrió un error inesperado.'
          : error instanceof Error ? error.message : 'Solicitud inválida.';

    if (status === 500) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Error interno de la API:', error instanceof Error ? error.name : 'UnknownError');
      } else {
        console.error(error);
      }
    }
    response.status(status).json({ error: { code, message } });
  });

  return app;
}
