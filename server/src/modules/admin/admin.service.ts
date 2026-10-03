import { OrderStatus, Prisma, ReturnRequestStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma.ts';
import { canTransitionOrderStatus } from './order-status.ts';
import { refundWebpayPayment } from '../payments/webpay.service.ts';

export class AdminError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status = 400, code = 'INVALID_INPUT') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function listAdminUsers(search?: string, page = 1, pageSize = 10) {
  const q = search?.trim();
  const where = q ? { OR: [
    { name: { contains: q, mode: 'insensitive' as const } },
    { email: { contains: q, mode: 'insensitive' as const } },
  ] } : undefined;
  return prisma.$transaction(async (tx) => {
    const total = await tx.user.count({ where });
    const data = await tx.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    return { data, pagination: { page, limit: pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) } };
  });
}

function localDateParts(date: Date) {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string, number>>((parts, part) => {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
    return parts;
  }, {});
  return values as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

function localMidnightUtc(year: number, month: number, day: number) {
  const targetUtc = Date.UTC(year, month - 1, day);
  let guess = targetUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = localDateParts(new Date(guess));
    const representedLocalTime = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    guess = targetUtc - (representedLocalTime - guess);
  }
  return new Date(guess);
}

function startOfLocalPeriod(now: Date, period: 'today' | 'week' | 'month') {
  const { year, month, day } = localDateParts(now);
  if (period === 'month') return localMidnightUtc(year, month, 1);
  const date = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const daysBack = period === 'today' ? 0 : daysSinceMonday;
  date.setUTCDate(date.getUTCDate() - daysBack);
  return localMidnightUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export async function getAdminDashboard() {
  const now = new Date();
  const periods = {
    today: startOfLocalPeriod(now, 'today'),
    week: startOfLocalPeriod(now, 'week'),
    month: startOfLocalPeriod(now, 'month'),
  };
  const confirmedOrderWhere = (start: Date) => ({
    status: { in: ['PAID', 'PREPARING', 'SHIPPED', 'COMPLETED'] as const },
    paidAt: { gte: start, lte: now },
    payments: { some: { status: 'APPROVED' as const } },
    returnRequest: { isNot: { status: 'REFUNDED' as const } },
  });

  const [salesSummaries, pendingOrders, lowStockCount, lowStockProducts, topGroups] = await Promise.all([
    Promise.all([periods.today, periods.week, periods.month].map((start) => prisma.order.aggregate({
      where: confirmedOrderWhere(start),
      _sum: { totalClp: true },
      _count: { _all: true },
    }))),
    prisma.order.count({ where: { status: { in: ['PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED'] } } }),
    prisma.product.count({ where: { isActive: true, stock: { lte: 5 } } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: 5 } },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }], take: 8,
      select: { id: true, sku: true, name: true, stock: true, category: { select: { name: true } } },
    }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { status: { in: ['PAID', 'PREPARING', 'SHIPPED', 'COMPLETED'] }, paidAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), lte: now }, payments: { some: { status: 'APPROVED' } }, returnRequest: { isNot: { status: 'REFUNDED' } } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  const topProducts = topGroups.length ? await prisma.product.findMany({
    where: { id: { in: topGroups.map((group) => group.productId) } },
    select: { id: true, sku: true, name: true, stock: true },
  }) : [];
  const topById = new Map(topProducts.map((product) => [product.id, product]));
  const salesSummary = (aggregate: (typeof salesSummaries)[number]) => ({
    revenueClp: aggregate._sum.totalClp ?? 0,
    orderCount: aggregate._count._all,
  });

  return {
    sales: { today: salesSummary(salesSummaries[0]!), week: salesSummary(salesSummaries[1]!), month: salesSummary(salesSummaries[2]!) },
    pendingOrderCount: pendingOrders,
    lowStockCount,
    lowStockProducts,
    topSellingProducts: topGroups.flatMap((group) => {
      const product = topById.get(group.productId);
      return product ? [{ ...product, unitsSold: group._sum.quantity ?? 0 }] : [];
    }),
  };
}

export async function updateAdminUser(userId: string, actingUserId: string, input: { name: string; role: UserRole; isActive: boolean }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
      if (!existing) throw new AdminError('No encontramos la cuenta solicitada.', 404, 'USER_NOT_FOUND');

      const changesOwnAccess = userId === actingUserId
        && (input.role !== existing.role || input.isActive !== existing.isActive);
      if (changesOwnAccess) throw new AdminError('No puedes cambiar tu propio rol ni desactivar tu cuenta.', 409, 'SELF_ACCESS_CHANGE');

      const removesLastAdmin = existing.role === 'ADMIN' && existing.isActive
        && (input.role !== 'ADMIN' || !input.isActive);
      if (removesLastAdmin) {
        const activeAdmins = await tx.user.count({ where: { role: 'ADMIN', isActive: true } });
        if (activeAdmins <= 1) throw new AdminError('Debe permanecer al menos un administrador activo.', 409, 'LAST_ACTIVE_ADMIN');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { name: input.name, role: input.role, isActive: input.isActive },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      });
      if (input.role !== existing.role || input.isActive !== existing.isActive) {
        await tx.$executeRaw`DELETE FROM "user_sessions" WHERE sess->>'userId' = ${userId}`;
      }
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof AdminError) throw error;
    translateDatabaseError(error);
  }
}

export function listAdminReturnRequests() {
  return prisma.returnRequest.findMany({
    orderBy: { requestedAt: 'desc' },
    include: {
      order: {
        include: {
          user: { select: { name: true, email: true } },
          payments: { where: { status: 'APPROVED' }, select: { id: true, provider: true, reference: true, amountClp: true } },
          items: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });
}

export async function updateAdminReturnRequest(returnId: string, status: Extract<ReturnRequestStatus, 'REFUNDED' | 'REJECTED' | 'REQUESTED'>, manualConfirmation = false) {
  const request = await prisma.returnRequest.findUnique({ where: { id: returnId }, include: { order: { include: { payments: { where: { status: 'APPROVED' } } } } } });
  if (!request) throw new AdminError('No encontramos la solicitud de devolución.', 404, 'RETURN_NOT_FOUND');
  if (request.status === 'PROCESSING' && status === 'REFUNDED' && manualConfirmation) {
    return prisma.returnRequest.update({
      where: { id: returnId },
      data: { status: 'REFUNDED', processedAt: new Date(), adminNote: 'Reembolso confirmado manualmente por administración tras revisar el proveedor.' },
      include: { order: { select: { orderNumber: true } } },
    });
  }
  if (request.status === 'PROCESSING' && status === 'REQUESTED' && manualConfirmation) {
    return prisma.returnRequest.update({
      where: { id: returnId },
      data: { status: 'REQUESTED', adminNote: 'Reintento autorizado manualmente después de confirmar que el proveedor no procesó el reembolso.' },
      include: { order: { select: { orderNumber: true } } },
    });
  }
  if (request.status !== 'REQUESTED') throw new AdminError('Esta solicitud ya fue procesada o requiere revisión manual.', 409, 'RETURN_ALREADY_PROCESSED');

  if (status === 'REJECTED') {
    const updated = await prisma.returnRequest.updateMany({
      where: { id: returnId, status: 'REQUESTED' },
      data: { status: 'REJECTED', processedAt: new Date() },
    });
    if (updated.count !== 1) throw new AdminError('La solicitud cambió mientras la procesabas. Actualiza la página.', 409, 'RETURN_STATE_CHANGED');
    return prisma.returnRequest.findUniqueOrThrow({ where: { id: returnId }, include: { order: { select: { orderNumber: true } } } });
  }

  const payment = request.order.payments[0];
  if (!payment || payment.amountClp !== request.amountClp) throw new AdminError('No se encontró un pago aprobado por el monto completo del pedido.', 409, 'APPROVED_PAYMENT_NOT_FOUND');
  const claimed = await prisma.returnRequest.updateMany({ where: { id: returnId, status: 'REQUESTED' }, data: { status: 'PROCESSING' } });
  if (claimed.count !== 1) throw new AdminError('La solicitud cambió mientras la procesabas. Actualiza la página.', 409, 'RETURN_STATE_CHANGED');

  try {
    if (payment.provider === 'WEBPAY') await refundWebpayPayment(payment.reference, request.amountClp);
    return await prisma.returnRequest.update({
      where: { id: returnId },
      data: { status: 'REFUNDED', processedAt: new Date(), adminNote: payment.provider === 'DEMO' ? 'Devolución simulada para el proyecto.' : 'Webpay confirmó la solicitud de devolución.' },
      include: { order: { select: { orderNumber: true } } },
    });
  } catch (error) {
    await prisma.returnRequest.update({ where: { id: returnId }, data: { adminNote: 'Resultado del proveedor no confirmado; revisar en el portal de Webpay antes de reintentar.' } });
    throw error;
  }
}

type ProductInput = {
  categoryId?: string;
  sku?: string;
  name?: string;
  description?: string;
  features?: string[];
  specifications?: string;
  condition?: string;
  priceClp?: number;
  transferPriceClp?: number | null;
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
  features: true,
  specifications: true,
  condition: true,
  priceClp: true,
  transferPriceClp: true,
  stock: true,
  imageUrl: true,
  isActive: true,
  categoryId: true,
  category: { select: { name: true, isActive: true } },
  updatedAt: true,
};

export async function listAdminProducts(search?: string, page = 1, pageSize = 10) {
  const q = search?.trim();
  const where = q ? { OR: [
    { name: { contains: q, mode: 'insensitive' as const } },
    { sku: { contains: q, mode: 'insensitive' as const } },
  ] } : undefined;
  const [total, data] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: productAdminSelect,
    }),
  ]);
  return { data, pagination: { page, limit: pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) } };
}

export async function createAdminProduct(input: Required<Pick<ProductInput, 'categoryId' | 'sku' | 'name' | 'description' | 'priceClp' | 'stock'>> & Pick<ProductInput, 'features' | 'specifications' | 'condition' | 'transferPriceClp' | 'imageUrl'>) {
  await assertActiveCategory(input.categoryId);
  try {
    return await prisma.product.create({
      data: {
        categoryId: input.categoryId,
        sku: input.sku,
        slug: productSlug(input.name, input.sku),
        name: input.name,
        description: input.description,
        features: input.features ?? [],
        specifications: input.specifications ?? '',
        condition: input.condition ?? 'Nuevo',
        priceClp: input.priceClp,
        transferPriceClp: input.transferPriceClp ?? null,
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
      returnRequest: true,
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
