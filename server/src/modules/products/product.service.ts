import type { ParsedQs } from 'qs';
import { prisma } from '../../config/prisma.ts';

const maximumPageSize = 50;

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function queryNumber(value: unknown, label: string): number | undefined {
  const text = queryString(value);
  if (text === undefined) return undefined;
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw Object.assign(new Error(`${label} debe ser un entero mayor o igual a cero.`), { status: 400, code: 'INVALID_QUERY' });
  }
  return number;
}

export async function listProducts(query: ParsedQs) {
  const search = queryString(query.q);
  const categorySlug = queryString(query.category);
  const minPrice = queryNumber(query.minPrice, 'minPrice');
  const maxPrice = queryNumber(query.maxPrice, 'maxPrice');
  const page = queryNumber(query.page, 'page') ?? 1;
  const requestedLimit = queryNumber(query.limit, 'limit') ?? 12;
  const limit = Math.min(Math.max(requestedLimit, 1), maximumPageSize);
  const sort = queryString(query.sort) ?? 'newest';

  if (page < 1) {
    throw Object.assign(new Error('page debe ser mayor o igual a uno.'), { status: 400, code: 'INVALID_QUERY' });
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw Object.assign(new Error('minPrice no puede superar maxPrice.'), { status: 400, code: 'INVALID_QUERY' });
  }

  const orderBy = {
    newest: { createdAt: 'desc' as const },
    price_asc: { priceClp: 'asc' as const },
    price_desc: { priceClp: 'desc' as const },
    name_asc: { name: 'asc' as const },
  }[sort];

  if (!orderBy) {
    throw Object.assign(new Error('sort no es una opción válida.'), { status: 400, code: 'INVALID_QUERY' });
  }

  const where = {
    isActive: true,
    ...(search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { description: { contains: search, mode: 'insensitive' as const } }] }
      : {}),
    ...(categorySlug ? { category: { slug: categorySlug, isActive: true } } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? { priceClp: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
      : {}),
  };

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
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
        category: { select: { name: true, slug: true } },
      },
    }),
  ]);

  return { data: products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true, category: { isActive: true } },
    select: {
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
      category: { select: { name: true, slug: true } },
    },
  });
}
