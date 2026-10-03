import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url) });
const { prisma } = await import('../src/config/prisma.ts');
const { register, login } = await import('../src/modules/auth/auth.service.ts');
const { consumeEmailVerification, consumePasswordReset, issueAccountToken } = await import('../src/modules/auth/account-tokens.ts');
const { hashPassword } = await import('../src/modules/auth/password.ts');

test('completa registro, verificación de cuenta, inicio de sesión y recuperación de contraseña', { timeout: 30_000 }, async () => {
  const suffix = randomUUID();
  const email = `account-${suffix}@example.test`;
  const originalPassword = 'clave-original-segura-123';
  const replacementPassword = 'clave-nueva-segura-456';
  let userId;
  try {
    const created = await register({ name: 'Cuenta de integración', email, password: originalPassword });
    userId = created.id;
    await assert.rejects(login(email, originalPassword), /EMAIL_NOT_VERIFIED/);

    const verification = await issueAccountToken(userId, 'VERIFY_EMAIL');
    assert.equal(await consumeEmailVerification(verification), true);
    assert.equal(await consumeEmailVerification(verification), false);
    assert.equal((await login(email, originalPassword)).id, userId);

    const reset = await issueAccountToken(userId, 'RESET_PASSWORD');
    assert.equal(await consumePasswordReset(reset, await hashPassword(replacementPassword)), true);
    assert.equal(await consumePasswordReset(reset, await hashPassword('otra-clave-segura-789')), false);
    assert.equal(await login(email, originalPassword), null);
    assert.equal((await login(email, replacementPassword)).id, userId);
  } finally {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});
