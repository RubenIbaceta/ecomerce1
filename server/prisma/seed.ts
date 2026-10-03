import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password.ts';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const prisma = new PrismaClient();

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function productRows(prefix: string, categoryName: string, names: string[], firstPriceClp: number, priceStepClp: number, images: Array<string | null> = []) {
  return names.map((name, index) => ({
    sku: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    slug: `${slugify(prefix)}-${slugify(name)}`,
    name,
    description: `${name}, una alternativa de ${categoryName} para complementar tu configuración de trabajo, estudio o entretenimiento.`,
    priceClp: firstPriceClp + priceStepClp * index,
    stock: 8 + ((index * 3) % 22),
    imageUrl: images.length ? images[index % images.length] : null,
  }));
}

const catalog = [
  {
    name: 'Computación',
    slug: 'computacion',
    description: 'Equipos portátiles y de escritorio para trabajo, estudio y creación.',
    products: [
      { sku: 'COMP-NB-001', slug: 'notebook-zen-14', name: 'Notebook Zen 14', description: 'Notebook liviano de 14 pulgadas para trabajo y estudio.', priceClp: 699990, stock: 12, imageUrl: '/images/laptop.jpg' },
      ...productRows('COMP-ADD', 'computación', [
        'Notebook Air 14', 'Notebook Pro 15', 'Notebook Office 16', 'Notebook Travel 13', 'Notebook Creator 16',
        'PC Compact Office', 'PC Gamer Tower', 'Workstation Creator', 'Mini PC Office',
      ], 329990, 150000, ['/images/laptop.jpg', null]),
    ],
  },
  {
    name: 'Audio',
    slug: 'audio',
    description: 'Audífonos, parlantes y soluciones de sonido para cada espacio.',
    products: [
      { sku: 'AUD-AU-001', slug: 'audifonos-wave-pro', name: 'Audífonos Wave Pro', description: 'Audífonos inalámbricos con cancelación de ruido.', priceClp: 89990, stock: 24, imageUrl: '/images/audifonos.jpg' },
      { sku: 'AUD-PA-001', slug: 'parlante-pocket', name: 'Parlante Pocket', description: 'Parlante Bluetooth portátil y resistente a salpicaduras.', priceClp: 39990, stock: 18, imageUrl: '/images/bocina.jpg' },
      ...productRows('AUD-ADD', 'audio', [
        'Audífonos Studio Wireless', 'Audífonos Comfort ANC', 'Audífonos Urban', 'Headset Gamer Surround',
        'Parlante Bluetooth Compact', 'Parlante Home Stereo', 'Micrófono USB Creator', 'Barra de sonido Slim',
      ], 29990, 10000, ['/images/audifonos.jpg', '/images/bocina.jpg']),
    ],
  },
  {
    name: 'Accesorios',
    slug: 'accesorios',
    description: 'Complementos prácticos para tus dispositivos y tu escritorio.',
    products: [
      { sku: 'ACC-TE-001', slug: 'teclado-mecanico-key', name: 'Teclado mecánico Key', description: 'Teclado mecánico compacto con conexión USB-C.', priceClp: 64990, stock: 15, imageUrl: '/images/teclado.jpg' },
      { sku: 'ACC-MO-001', slug: 'mouse-precision', name: 'Mouse Precision', description: 'Mouse inalámbrico ergonómico con sensor de precisión.', priceClp: 24990, stock: 30, imageUrl: '/images/mouse.jpg' },
      ...productRows('ACC-ADD', 'accesorios', [
        'Base ajustable para notebook', 'Hub USB-C multipuerto', 'Funda acolchada 15 pulgadas', 'Soporte ergonómico aluminio',
        'Adaptador USB-C a HDMI', 'Cable USB-C reforzado', 'Alfombrilla de escritorio XL', 'Lector de tarjetas USB',
      ], 9990, 6000, ['/images/teclado.jpg', '/images/mouse.jpg', null]),
    ],
  },
  {
    name: 'Componentes',
    slug: 'componentes',
    description: 'Piezas y refrigeración para armar o actualizar tu computador.',
    products: productRows('CMP', 'componentes', [
      'Gabinete Mid Tower Airflow', 'Fuente de poder 650 W', 'Fuente de poder 850 W modular', 'Placa madre ATX',
      'Placa madre Micro ATX', 'Refrigeración líquida 240 mm', 'Cooler torre doble ventilador', 'Ventilador PWM 120 mm',
      'Pasta térmica de alto rendimiento', 'Kit de cables modulares',
    ], 12990, 25000),
  },
  {
    name: 'Tarjetas gráficas',
    slug: 'tarjetas-graficas',
    description: 'Rendimiento visual para juegos, diseño y creación de contenido.',
    products: productRows('GPU', 'tarjetas gráficas', [
      'Tarjeta gráfica Boreal 8 GB', 'Tarjeta gráfica Boreal 12 GB', 'Tarjeta gráfica Boreal 16 GB', 'Tarjeta gráfica Vector 8 GB',
      'Tarjeta gráfica Vector 12 GB', 'Tarjeta gráfica Vector 16 GB', 'Tarjeta gráfica Pulse 10 GB', 'Tarjeta gráfica Pulse 16 GB',
      'Tarjeta gráfica Creator 20 GB', 'Tarjeta gráfica Creator 24 GB',
    ], 219990, 150000),
  },
  {
    name: 'Procesadores',
    slug: 'procesadores',
    description: 'Potencia de procesamiento para cada tipo de configuración.',
    products: productRows('CPU', 'procesadores', [
      'Procesador Core 4 núcleos', 'Procesador Core 6 núcleos', 'Procesador Core 8 núcleos', 'Procesador Core 10 núcleos',
      'Procesador Nova 6 núcleos', 'Procesador Nova 8 núcleos', 'Procesador Nova 12 núcleos', 'Procesador Nova 16 núcleos',
      'Procesador Creator 12 núcleos', 'Procesador Creator 16 núcleos',
    ], 79990, 40000),
  },
  {
    name: 'Memorias',
    slug: 'memorias',
    description: 'Memorias para mejorar la respuesta y capacidad de tu equipo.',
    products: productRows('MEM', 'memorias', [
      'Memoria DDR4 8 GB', 'Memoria DDR4 16 GB', 'Kit DDR4 16 GB', 'Kit DDR4 32 GB', 'Memoria DDR5 8 GB',
      'Memoria DDR5 16 GB', 'Kit DDR5 16 GB', 'Kit DDR5 32 GB', 'Kit DDR5 64 GB', 'Memoria para notebook 16 GB',
    ], 24990, 12000),
  },
  {
    name: 'Almacenamiento',
    slug: 'almacenamiento',
    description: 'Unidades rápidas y espaciosas para tus aplicaciones y archivos.',
    products: productRows('STO', 'almacenamiento', [
      'SSD SATA 480 GB', 'SSD SATA 1 TB', 'SSD NVMe 500 GB', 'SSD NVMe 1 TB', 'SSD NVMe 2 TB',
      'SSD portátil 1 TB', 'Disco duro 1 TB', 'Disco duro 2 TB', 'Disco duro externo 2 TB', 'Memoria USB 128 GB',
    ], 24990, 18000),
  },
  {
    name: 'Periféricos',
    slug: 'perifericos',
    description: 'Controles y accesorios que completan tu estación de trabajo.',
    products: productRows('PER', 'periféricos', [
      'Teclado mecánico RGB', 'Teclado inalámbrico compacto', 'Mouse gamer ajustable', 'Mouse ergonómico inalámbrico',
      'Audífonos con micrófono', 'Webcam Full HD', 'Micrófono de escritorio USB', 'Control inalámbrico para PC',
      'Combo teclado y mouse', 'Parlantes estéreo para escritorio',
    ], 14990, 9000, ['/images/teclado.jpg', '/images/mouse.jpg', '/images/audifonos.jpg', '/images/bocina.jpg', null]),
  },
  {
    name: 'Monitores',
    slug: 'monitores',
    description: 'Pantallas para trabajar, estudiar, jugar y crear.',
    products: [
      { sku: 'COMP-MO-001', slug: 'monitor-view-27', name: 'Monitor View 27', description: 'Monitor IPS de 27 pulgadas con resolución QHD.', priceClp: 279990, stock: 8, imageUrl: '/images/monitor.jpg' },
      ...productRows('MON', 'monitores', [
        'Monitor Office 24 pulgadas', 'Monitor IPS 27 pulgadas', 'Monitor QHD 27 pulgadas', 'Monitor 4K 28 pulgadas',
        'Monitor Gamer 24 pulgadas', 'Monitor Gamer 27 pulgadas', 'Monitor Ultrawide 34 pulgadas', 'Monitor Creator 32 pulgadas',
        'Monitor portátil 16 pulgadas',
      ], 89990, 60000, ['/images/monitor.jpg']),
    ],
  },
];

async function main() {
  for (const categoryData of catalog) {
    const { products, ...category } = categoryData;
    const savedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
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
    console.log('Catálogo cargado y administrador configurado.');
    return;
  }

  console.log('Catálogo cargado. Define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador.');
}

main()
  .catch((error: unknown) => {
    console.error('No se pudo cargar el catálogo.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
