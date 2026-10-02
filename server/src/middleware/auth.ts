import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma.ts';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      currentUser?: PublicUser;
    }
  }
}

function publicUser(user: { id: string; name: string; email: string; role: UserRole }): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = request.session.userId;
    if (!userId) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Inicia sesión para continuar.' } });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!user?.isActive) {
      request.session.destroy(() => undefined);
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Inicia sesión para continuar.' } });
      return;
    }

    request.currentUser = publicUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role: UserRole) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.currentUser) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Inicia sesión para continuar.' } });
      return;
    }
    if (request.currentUser.role !== role) {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para acceder.' } });
      return;
    }
    next();
  };
}
