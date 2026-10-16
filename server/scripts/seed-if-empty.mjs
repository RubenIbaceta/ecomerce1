import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
try {
  const [categories, products, users] = await Promise.all([
    prisma.category.count(), prisma.product.count(), prisma.user.count(),
  ]);
  // El seed actual actualiza stock y precios: solo se permite sobre una base nueva.
  if (categories === 0 && products === 0 && users === 0) {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error('Configura ADMIN_EMAIL y ADMIN_PASSWORD antes del primer despliegue.');
    }
    await prisma.$disconnect();
    const result = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('../prisma/seed.ts', import.meta.url))], {
      stdio: 'inherit', env: process.env,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('No se pudo inicializar el catálogo.');
  } else {
    console.log('La base ya contiene datos. Se conserva el catálogo, stock y cuentas existentes.');
  }
} finally {
  await prisma.$disconnect();
}
