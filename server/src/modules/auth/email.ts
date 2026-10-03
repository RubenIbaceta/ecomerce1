import nodemailer from 'nodemailer';

function mailConfiguration() {
  const host = process.env.SMTP_HOST;
  const from = process.env.MAIL_FROM;
  if (!host || !from) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  return {
    host, port, from,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  };
}

export function isEmailDeliveryConfigured() {
  return mailConfiguration() !== null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export async function sendAccountLink(email: string, name: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD', token: string) {
  const config = mailConfiguration();
  if (!config) throw new Error('MAIL_NOT_CONFIGURED');
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';
  const route = purpose === 'VERIFY_EMAIL' ? '/verificar-correo' : '/restablecer-clave';
  const link = `${baseUrl.replace(/\/$/, '')}${route}?token=${encodeURIComponent(token)}`;
  const isVerification = purpose === 'VERIFY_EMAIL';
  const title = isVerification ? 'Confirma tu correo' : 'Restablece tu contraseña';
  const action = isVerification ? 'Verificar correo' : 'Crear nueva contraseña';
  const expires = isVerification ? '24 horas' : '30 minutos';
  const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: config.auth });
  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: `${title} · ElectroStore`,
    text: `Hola ${name},\n\n${title}: ${link}\n\nEl enlace vence en ${expires}. Si no solicitaste esto, puedes ignorar este mensaje.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h1>${title}</h1><p>Hola ${escapeHtml(name)},</p><p>Usa este enlace para ${isVerification ? 'confirmar que puedes recibir correo en esta dirección' : 'elegir una contraseña nueva'}.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#155eef;color:white;border-radius:8px;text-decoration:none">${action}</a></p><p>El enlace vence en ${expires}. Si no solicitaste esto, puedes ignorar este mensaje.</p></div>`,
  });
}

export async function sendSupportMessage(input: { name: string; email: string; subject: string; message: string }) {
  const config = mailConfiguration();
  const recipient = process.env.SUPPORT_EMAIL?.trim();
  if (!config || !recipient) throw new Error('SUPPORT_NOT_CONFIGURED');
  const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: config.auth });
  await transporter.sendMail({
    from: config.from,
    to: recipient,
    replyTo: input.email,
    subject: `Consulta ElectroStore: ${input.subject}`,
    text: `Nombre: ${input.name}\nCorreo: ${input.email}\n\n${input.message}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033"><h1>Consulta desde ElectroStore</h1><p><strong>Nombre:</strong> ${escapeHtml(input.name)}</p><p><strong>Correo:</strong> ${escapeHtml(input.email)}</p><p><strong>Asunto:</strong> ${escapeHtml(input.subject)}</p><p style="white-space:pre-wrap">${escapeHtml(input.message)}</p></div>`,
  });
}
