import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.ts';

const maximumQuantity = 99;

export class CartError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(
    message: string,
    status: number,
    code: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2034' || error.code === 'P2002');
}

async function inSerializableTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === 2) throw error;
    }
  }
  throw new Error('No se pudo completar la operación del carrito.');
}

function cartView(cart: {
  id: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: {
      sku: string;
      slug: string;
      name: string;
      priceClp: number;
      stock: number;
      imageUrl: string | null;
      isActive: boolean;
      category: { name: string; isActive: boolean };
    };
  }>;
}) {
  const items = cart.items.map((item) => {
    const available = item.product.isActive && item.product.category.isActive && item.product.stock >= item.quantity;
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      stock: item.product.stock,
      available,
      lineSubtotalClp: item.product.priceClp * item.quantity,
      product: {
        sku: item.product.sku,
        slug: item.product.slug,
        name: item.product.name,
        priceClp: item.product.priceClp,
        imageUrl: item.product.imageUrl,
        categoryName: item.product.category.name,
      },
    };
  });

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotalClp: items.reduce((subtotal, item) => subtotal + item.lineSubtotalClp, 0),
  };
}

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            select: {
              sku: true,
              slug: true,
              name: true,
              priceClp: true,
              stock: true,
              imageUrl: true,
              isActive: true,
              category: { select: { name: true, isActive: true } },
            },
          },
        },
      },
    },
  });
}

export async function getCart(userId: string) {
  return cartView(await getOrCreateCart(userId));
}

export async function addCartItem(userId: string, productId: string, quantity: number) {
  if (quantity > maximumQuantity) {
    throw new CartError('La cantidad máxima por producto es 99.', 400, 'INVALID_QUANTITY');
  }

  await inSerializableTransaction(async (transaction) => {
    const cart = await transaction.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });
    const product = await transaction.product.findFirst({
      where: { id: productId, isActive: true, category: { isActive: true } },
      select: { id: true, stock: true },
    });
    if (!product) throw new CartError('El producto no está disponible.', 404, 'PRODUCT_NOT_FOUND');

    const existing = await transaction.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
      select: { id: true, quantity: true },
    });
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > product.stock) {
      throw new CartError('No hay stock suficiente para esa cantidad.', 409, 'INSUFFICIENT_STOCK');
    }
    if (existing) {
      await transaction.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
    } else {
      await transaction.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
    }
    await transaction.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  });

  return getCart(userId);
}

export async function updateCartItem(userId: string, itemId: string, quantity: number) {
  if (quantity > maximumQuantity) {
    throw new CartError('La cantidad máxima por producto es 99.', 400, 'INVALID_QUANTITY');
  }

  await inSerializableTransaction(async (transaction) => {
    const item = await transaction.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      select: { id: true, cartId: true, productId: true },
    });
    if (!item) throw new CartError('El artículo no existe en tu carrito.', 404, 'CART_ITEM_NOT_FOUND');

    const product = await transaction.product.findFirst({
      where: { id: item.productId, isActive: true, category: { isActive: true } },
      select: { stock: true },
    });
    if (!product) throw new CartError('El producto ya no está disponible.', 409, 'PRODUCT_UNAVAILABLE');
    if (quantity > product.stock) {
      throw new CartError('No hay stock suficiente para esa cantidad.', 409, 'INSUFFICIENT_STOCK');
    }

    await transaction.cartItem.update({ where: { id: item.id }, data: { quantity } });
    await transaction.cart.update({ where: { id: item.cartId }, data: { updatedAt: new Date() } });
  });

  return getCart(userId);
}

export async function removeCartItem(userId: string, itemId: string) {
  const result = await prisma.cartItem.deleteMany({
    where: { id: itemId, cart: { userId } },
  });
  if (result.count === 0) {
    throw new CartError('El artículo no existe en tu carrito.', 404, 'CART_ITEM_NOT_FOUND');
  }
}
