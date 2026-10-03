import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { sendSupportMessage } from '../auth/email.ts';

export const contactRouter = Router();
contactRouter.post('/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'CONTACT_RATE_LIMIT', message: 'Has enviado varias consultas. Intenta nuevamente más tarde.' } },
}), async (request, response, next) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    subject: z.string().trim().min(3).max(120),
    message: z.string().trim().min(10).max(3000),
  }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_CONTACT', message: 'Revisa el nombre, correo, asunto y mensaje.' } });
    return;
  }
  try {
    await sendSupportMessage(parsed.data);
    response.status(202).json({ data: { sent: true } });
  } catch (error) {
    if (error instanceof Error && error.message === 'SUPPORT_NOT_CONFIGURED') {
      response.status(503).json({ error: { code: 'SUPPORT_NOT_CONFIGURED', message: 'El formulario de contacto no está configurado. Configura SMTP y SUPPORT_EMAIL en el entorno local.' } });
      return;
    }
    next(error);
  }
});
