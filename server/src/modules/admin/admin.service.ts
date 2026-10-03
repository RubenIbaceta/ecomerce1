import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.ts';
import { canTransitionOrderStatus } from './order-status.ts';

export class AdminError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status = 400, code = 'INVALID_INPUT') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ProductInput = {
  categoryId?: string;
  sku?: string;
  name?: string;
  description?: string;
  priceClp?: number;
  stock?: number;
  imageUrl?: string | null;
  isActive?: boolean;
};

function slugPart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

function productSlug(name: string, sku: string) {
  return `${slugPart(name) || 'producto'}-${slugPart(sku) || 'nuevo'}`;
}

function translateDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AdminError('El SKU o la dirección del producto ya está en uso.', 409, 'PRODUCT_CONFLICT');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    throw new AdminError('No encontramos el producto solicitado.', 404, 'PRODUCT_NOT_FOUND');
  }
  throw error;
}

async function assertActiveCategory(categoryId: string) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } });
  if (!category) throw new AdminError('Selecciona una categoría activa.', 400, 'INVALID_CATEGORY');
}

const productAdminSelect = {
  id: true,
  sku: true,
  slug: true,
  name: true,
  description: true,
  priceClp: true,
  stock: true,
  imageUrl: true,
  isActive: true,
  categoryId: true,
  category: { select: { name: true, isActive: true } },
  updatedAt: true,
};

export function listAdminProducts(search?: string) {
  const q = search?.trim();
  return prisma.product.findMany({
    where: q ? { OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ] } : undefined,
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    take: 200,
    select: productAdminSelect,
  });
}

export async function createAdminProduct(input: Required<Omit<ProductInput, 'isActive' | 'imageUrl'>> & Pick<ProductInput, 'imageUrl'>) {
  await assertActiveCategory(input.categoryId);
  try {
    return await prisma.product.create({
      data: {
        categoryId: input.categoryId,
        sku: input.sku,
        slug: productSlug(input.name, input.sku),
        name: input.name,
        description: input.description,
        priceClp: input.priceClp,
        stock: input.stock,
        imageUrl: input.imageUrl ?? null,
      },
      select: productAdminSelect,
    });
  } catch (error) {
    translateDatabaseError(error);
  }
}

export async function updateAdminProduct(productId: string, input: ProductInput) {
  if (input.categoryId) await assertActiveCategory(input.categoryId);
  try {
    const existing = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, sku: true } });
    if (!existing) throw new AdminError('No encontramos el producto solicitado.', 404, 'PRODUCT_NOT_FOUND');
    const name = input.name ?? existing.name;
    const sku = input.sku ?? existing.sku;
    return await prisma.product.update({
      where: { id: productId },
      data: {
        ...input,
        slug: input.name !== undefined || input.sku !== undefined ? productSlug(name, sku) : undefined,
      },
      select: productAdminSelect,
    });
  } catch (error) {
    translateDatabaseError(error);
  }
}

export function listAdminOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
      items: { orderBy: { createdAt: 'asc' } },
      payments: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, provider: true, status: true, amountClp: true, authorizedAt: true, createdAt: true },
      },
    },
  });
}

export async function updateAdminOrderStatus(orderId: string, nextStatus: OrderStatus) {
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new AdminError('No encontramos el pedido solicitado.', 404, 'ORDER_NOT_FOUND');
    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      throw new AdminError('Ese cambio de estado no está permitido.', 409, 'INVALID_ORDER_TRANSITION');
    }

    const now = new Date();
    const changed = await transaction.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: nextStatus,
        ...(nextStatus === 'CANCELLED' ? { cancelledAt: now } : {}),
      },
    });
    if (changed.count !== 1) throw new AdminError('El pedido cambió mientras lo actualizabas. Recarga e intenta de nuevo.', 409, 'ORDER_STATE_CHANGED');

    if (nextStatus === 'CANCELLED') {
      for (const item of order.items) {
        await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }

    return transaction.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        user: { select: { name: true, email: true } },
        items: { orderBy: { createdAt: 'asc' } },
        payments: { select: { id: true, provider: true, status: true, amountClp: true, authorizedAt: true, createdAt: true } },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
