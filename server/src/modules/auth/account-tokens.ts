import { createHash, randomBytes } from 'node:crypto';
import type { EmailActionPurpose } from '@prisma/client';
import { prisma } from '../../config/prisma.ts';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueAccountToken(userId: string, purpose: EmailActionPurpose) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (purpose === 'VERIFY_EMAIL' ? 24 * 60 : 30) * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.emailActionToken.deleteMany({ where: { userId, purpose, usedAt: null } });
    await tx.emailActionToken.create({ data: { userId, purpose, tokenHash: hashToken(token), expiresAt } });
  });
  return token;
}

export async function consumeEmailVerification(token: string) {
  const hash = hashToken(token);
  return prisma.$transaction(async (tx) => {
    const match = await tx.emailActionToken.findFirst({ where: { tokenHash: hash, purpose: 'VERIFY_EMAIL', usedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, userId: true } });
    if (!match) return false;
    const consumed = await tx.emailActionToken.updateMany({ where: { id: match.id, usedAt: null }, data: { usedAt: new Date() } });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: match.userId }, data: { emailVerifiedAt: new Date() } });
    return true;
  });
}

export async function consumePasswordReset(token: string, passwordHash: string) {
  const hash = hashToken(token);
  return prisma.$transaction(async (tx) => {
    const match = await tx.emailActionToken.findFirst({ where: { tokenHash: hash, purpose: 'RESET_PASSWORD', usedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, userId: true } });
    if (!match) return false;
    const consumed = await tx.emailActionToken.updateMany({ where: { id: match.id, usedAt: null }, data: { usedAt: new Date() } });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: match.userId }, data: { passwordHash } });
    await tx.$executeRaw`DELETE FROM "user_sessions" WHERE sess->>'userId' = ${match.userId}`;
    return true;
  });
}
