import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.ts';
import { hashPassword, verifyPassword } from './password.ts';

export type RegisterInput = { name: string; email: string; password: string };

export async function register(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }
    throw error;
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, isActive: true, passwordHash: true, emailVerifiedAt: true },
  });
  if (!user?.isActive || !(await verifyPassword(password, user.passwordHash))) return null;
  if (!user.emailVerifiedAt) throw new Error('EMAIL_NOT_VERIFIED');
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function toPublicUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
