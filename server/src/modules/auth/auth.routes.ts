import { Router, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.ts';
import { login, register, toPublicUser } from './auth.service.ts';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' } },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados registros desde esta conexión. Intenta más tarde.' } },
});

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});

const registrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
});

function invalidBody(message: string) {
  return { error: { code: 'INVALID_INPUT', message } };
}

function regenerateSession(request: Request, userId: string) {
  return new Promise<void>((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }
      request.session.userId = userId;
      request.session.save((saveError) => saveError ? reject(saveError) : resolve());
    });
  });
}

authRouter.post('/register', registerLimiter, async (request, response, next) => {
  const parsed = registrationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json(invalidBody('Ingresa tu nombre, un correo válido y una contraseña de al menos 12 caracteres.'));
    return;
  }

  try {
    const user = await register(parsed.data);
    await regenerateSession(request, user.id);
    response.status(201).json({ data: toPublicUser(user) });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
      response.status(409).json({ error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Ya existe una cuenta con ese correo.' } });
      return;
    }
    next(error);
  }
});

authRouter.post('/login', loginLimiter, async (request, response, next) => {
  const parsed = credentialsSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json(invalidBody('Revisa el correo y la contraseña ingresados.'));
    return;
  }

  try {
    const user = await login(parsed.data.email, parsed.data.password);
    if (!user) {
      response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' } });
      return;
    }
    await regenerateSession(request, user.id);
    response.json({ data: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (request, response, next) => {
  request.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }
    response.clearCookie('electro.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    response.status(204).end();
  });
});

authRouter.get('/me', requireAuth, async (request, response) => {
  response.json({ data: request.currentUser });
});
