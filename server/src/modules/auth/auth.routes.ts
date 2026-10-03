import { Router, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.ts';
import { prisma } from '../../config/prisma.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { consumeEmailVerification, consumePasswordReset, issueAccountToken } from './account-tokens.ts';
import { isEmailDeliveryConfigured, sendAccountLink } from './email.ts';
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
const accountEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Has solicitado varios correos. Espera unos minutos e intenta nuevamente.' } },
});

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});

const registrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
});
const profileSchema = z.object({ name: z.string().trim().min(2).max(80) });
const addressSchema = z.object({
  label: z.string().trim().min(2).max(40),
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(20).regex(/^[+0-9 ()-]+$/),
  address: z.string().trim().min(5).max(200),
  commune: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  isDefault: z.boolean().default(false),
});
const addressIdSchema = z.string().uuid();

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
    const emailDeliveryConfigured = isEmailDeliveryConfigured();
    if (!emailDeliveryConfigured && process.env.NODE_ENV === 'production') {
      response.status(503).json({ error: { code: 'MAIL_NOT_CONFIGURED', message: 'El correo de verificación aún no está configurado en el servidor.' } });
      return;
    }
    const user = await register(parsed.data);
    if (!emailDeliveryConfigured) {
      const verifiedUser = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
        select: { id: true, name: true, email: true, role: true },
      });
      await regenerateSession(request, user.id);
      response.status(201).json({ data: { email: user.email, verificationRequired: false, user: toPublicUser(verifiedUser) } });
      return;
    }
    const token = await issueAccountToken(user.id, 'VERIFY_EMAIL');
    try {
      await sendAccountLink(user.email, user.name, 'VERIFY_EMAIL', token);
    } catch {
      console.error('No se pudo enviar el correo de verificación.');
      response.status(503).json({ error: { code: 'MAIL_SEND_FAILED', message: 'La cuenta se creó, pero no pudimos enviar el correo. Intenta solicitar otro enlace más tarde.' } });
      return;
    }
    response.status(201).json({ data: { email: user.email, verificationRequired: true } });
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
    if (error instanceof Error && error.message === 'EMAIL_NOT_VERIFIED') {
      response.status(403).json({ error: { code: 'EMAIL_NOT_VERIFIED', message: 'Confirma tu correo desde el enlace que te enviamos antes de ingresar.' } });
      return;
    }
    next(error);
  }
});

authRouter.post('/email/verify', async (request, response) => {
  const parsed = z.object({ token: z.string().min(20).max(200) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json(invalidBody('El enlace de verificación no es válido o venció.')); return; }
  const verified = await consumeEmailVerification(parsed.data.token);
  if (!verified) { response.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'El enlace de verificación no es válido o venció.' } }); return; }
  response.json({ data: { verified: true } });
});

authRouter.post('/email/resend', accountEmailLimiter, async (request, response, next) => {
  const parsed = z.object({ email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json(invalidBody('Ingresa un correo válido.')); return; }
  if (!isEmailDeliveryConfigured()) { response.status(503).json({ error: { code: 'MAIL_NOT_CONFIGURED', message: 'El correo aún no está configurado en el servidor.' } }); return; }
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, name: true, emailVerifiedAt: true } });
    if (user && !user.emailVerifiedAt) {
      const token = await issueAccountToken(user.id, 'VERIFY_EMAIL');
      try { await sendAccountLink(user.email, user.name, 'VERIFY_EMAIL', token); }
      catch { console.error('No se pudo reenviar el enlace de verificación.'); }
    }
    response.json({ data: { message: 'Si la cuenta necesita verificación, enviaremos un enlace al correo indicado.' } });
  } catch (error) { next(error); }
});

authRouter.post('/password/forgot', accountEmailLimiter, async (request, response, next) => {
  const parsed = z.object({ email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json(invalidBody('Ingresa un correo válido.')); return; }
  if (!isEmailDeliveryConfigured()) { response.status(503).json({ error: { code: 'MAIL_NOT_CONFIGURED', message: 'La recuperación por correo aún no está configurada en el servidor.' } }); return; }
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, name: true, isActive: true } });
    if (user?.isActive) {
      const token = await issueAccountToken(user.id, 'RESET_PASSWORD');
      try { await sendAccountLink(user.email, user.name, 'RESET_PASSWORD', token); }
      catch { console.error('No se pudo enviar el enlace de recuperación.'); }
    }
    response.json({ data: { message: 'Si existe una cuenta activa con ese correo, enviaremos un enlace para restablecer la contraseña.' } });
  } catch (error) { next(error); }
});

authRouter.post('/password/reset', accountEmailLimiter, async (request, response) => {
  const parsed = z.object({ token: z.string().min(20).max(200), password: z.string().min(12).max(128) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json(invalidBody('El enlace debe estar vigente y la contraseña debe tener al menos 12 caracteres.')); return; }
  const passwordHash = await hashPassword(parsed.data.password);
  const changed = await consumePasswordReset(parsed.data.token, passwordHash);
  if (!changed) { response.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'El enlace para cambiar la contraseña no es válido o venció.' } }); return; }
  response.json({ data: { changed: true } });
});

authRouter.post('/password/change', requireAuth, async (request, response) => {
  const parsed = z.object({ currentPassword: z.string().min(1).max(128), password: z.string().min(12).max(128) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json(invalidBody('La contraseña nueva debe tener al menos 12 caracteres.')); return; }
  const user = await prisma.user.findUnique({ where: { id: request.currentUser!.id }, select: { passwordHash: true } });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    response.status(400).json({ error: { code: 'CURRENT_PASSWORD_INVALID', message: 'La contraseña actual no coincide.' } });
    return;
  }
  await prisma.user.update({ where: { id: request.currentUser!.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await prisma.emailActionToken.deleteMany({ where: { userId: request.currentUser!.id, purpose: 'RESET_PASSWORD' } });
  await prisma.$executeRaw`DELETE FROM "user_sessions" WHERE sess->>'userId' = ${request.currentUser!.id} AND sid <> ${request.sessionID}`;
  await regenerateSession(request, request.currentUser!.id);
  response.json({ data: { changed: true } });
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
  const [user, addresses] = await Promise.all([
    prisma.user.findUnique({ where: { id: request.currentUser!.id }, select: { id: true, name: true, email: true, role: true } }),
    prisma.userAddress.findMany({ where: { userId: request.currentUser!.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }),
  ]);
  response.json({ data: { ...user, addresses } });
});

authRouter.patch('/me', requireAuth, async (request, response) => {
  const parsed = profileSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json(invalidBody('Ingresa un nombre válido.'));
    return;
  }
  const user = await prisma.user.update({ where: { id: request.currentUser!.id }, data: parsed.data, select: { id: true, name: true, email: true, role: true } });
  response.json({ data: user });
});

authRouter.get('/me/addresses', requireAuth, async (request, response) => {
  const addresses = await prisma.userAddress.findMany({ where: { userId: request.currentUser!.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  response.json({ data: addresses });
});

authRouter.post('/me/addresses', requireAuth, async (request, response, next) => {
  const parsed = addressSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json(invalidBody('Revisa los datos de la dirección.'));
    return;
  }
  try {
    const userId = request.currentUser!.id;
    const existingCount = await prisma.userAddress.count({ where: { userId } });
    const isDefault = parsed.data.isDefault || existingCount === 0;
    const address = await prisma.$transaction(async (tx) => {
      if (isDefault) await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.userAddress.create({ data: { ...parsed.data, isDefault, userId } });
    });
    response.status(201).json({ data: address });
  } catch (error) { next(error); }
});

authRouter.patch('/me/addresses/:addressId', requireAuth, async (request, response, next) => {
  const id = addressIdSchema.safeParse(request.params.addressId);
  const parsed = addressSchema.safeParse(request.body);
  if (!id.success || !parsed.success) {
    response.status(400).json(invalidBody('Revisa los datos de la dirección.'));
    return;
  }
  try {
    const userId = request.currentUser!.id;
    const belongsToUser = await prisma.userAddress.findFirst({ where: { id: id.data, userId }, select: { id: true } });
    if (!belongsToUser) { response.status(404).json({ error: { code: 'ADDRESS_NOT_FOUND', message: 'No encontramos esa dirección.' } }); return; }
    const address = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.userAddress.update({ where: { id: id.data }, data: parsed.data });
    });
    response.json({ data: address });
  } catch (error) { next(error); }
});

authRouter.delete('/me/addresses/:addressId', requireAuth, async (request, response, next) => {
  const id = addressIdSchema.safeParse(request.params.addressId);
  if (!id.success) { response.status(400).json(invalidBody('Dirección inválida.')); return; }
  try {
    const userId = request.currentUser!.id;
    const address = await prisma.userAddress.findFirst({ where: { id: id.data, userId }, select: { id: true, isDefault: true } });
    if (!address) { response.status(404).json({ error: { code: 'ADDRESS_NOT_FOUND', message: 'No encontramos esa dirección.' } }); return; }
    await prisma.$transaction(async (tx) => {
      await tx.userAddress.delete({ where: { id: id.data } });
      if (address.isDefault) {
        const nextDefault = await tx.userAddress.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
        if (nextDefault) await tx.userAddress.update({ where: { id: nextDefault.id }, data: { isDefault: true } });
      }
    });
    response.status(204).end();
  } catch (error) { next(error); }
});
