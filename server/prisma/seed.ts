import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password.ts';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const prisma = new PrismaClient();

const catalog = [
  {
    name: 'Computación',
    slug: 'computacion',
    products: [
      { sku: 'COMP-NB-001', slug: 'notebook-zen-14', name: 'Notebook Zen 14', description: 'Notebook liviano de 14 pulgadas para trabajo y estudio.', priceClp: 699990, stock: 12 },
      { sku: 'COMP-MO-001', slug: 'monitor-view-27', name: 'Monitor View 27', description: 'Monitor IPS de 27 pulgadas con resolución QHD.', priceClp: 279990, stock: 8 },
    ],
  },
  {
    name: 'Audio',
    slug: 'audio',
    products: [
      { sku: 'AUD-AU-001', slug: 'audifonos-wave-pro', name: 'Audífonos Wave Pro', description: 'Audífonos inalámbricos con cancelación de ruido.', priceClp: 89990, stock: 24 },
      { sku: 'AUD-PA-001', slug: 'parlante-pocket', name: 'Parlante Pocket', description: 'Parlante Bluetooth portátil y resistente a salpicaduras.', priceClp: 39990, stock: 18 },
    ],
  },
  {
    name: 'Accesorios',
    slug: 'accesorios',
    products: [
      { sku: 'ACC-TE-001', slug: 'teclado-mecanico-key', name: 'Teclado mecánico Key', description: 'Teclado mecánico compacto con conexión USB-C.', priceClp: 64990, stock: 15 },
      { sku: 'ACC-MO-001', slug: 'mouse-precision', name: 'Mouse Precision', description: 'Mouse inalámbrico ergonómico con sensor de precisión.', priceClp: 24990, stock: 30 },
    ],
  },
];

async function main() {
  for (const categoryData of catalog) {
    const { products, ...category } = categoryData;
    const savedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });

    for (const product of products) {
      await prisma.product.upsert({
        where: { sku: product.sku },
        update: { ...product, categoryId: savedCategory.id },
        create: { ...product, categoryId: savedCategory.id },
      });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error('Configura ADMIN_EMAIL y ADMIN_PASSWORD juntos para crear el usuario administrador.');
  }
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12 || adminPassword.length > 128) {
      throw new Error('ADMIN_PASSWORD debe tener entre 12 y 128 caracteres.');
    }
    const passwordHash = await hashPassword(adminPassword);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { name: process.env.ADMIN_NAME?.trim() || 'Administrador', role: 'ADMIN', isActive: true },
      create: {
        name: process.env.ADMIN_NAME?.trim() || 'Administrador',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log('Catálogo demo cargado y administrador configurado.');
    return;
  }

  console.log('Catálogo demo cargado. Define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador.');
}

main()
  .catch((error: unknown) => {
    console.error('No se pudo cargar el catálogo demo.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
