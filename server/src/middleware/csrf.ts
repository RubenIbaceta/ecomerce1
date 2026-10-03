import type { NextFunction, Request, Response } from 'express';

const webpayReturnPath = '/api/v1/payments/webpay/return';
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isAllowedOrigin(originValue: string | undefined, appBaseUrl = process.env.APP_BASE_URL) {
  if (!originValue || !appBaseUrl) return false;
  try {
    return new URL(originValue).origin === new URL(appBaseUrl).origin;
  } catch {
    return false;
  }
}

export function csrfProtection(request: Request, response: Response, next: NextFunction) {
  if (safeMethods.has(request.method) || (request.method === 'POST' && request.path === webpayReturnPath)) {
    next();
    return;
  }

  if (!isAllowedOrigin(request.get('origin'))) {
    response.status(403).json({ error: { code: 'CSRF_ORIGIN_MISMATCH', message: 'No se pudo verificar el origen de la solicitud.' } });
    return;
  }

  next();
}
