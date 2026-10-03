import { OrderStatus, UserRole } from '@prisma/client';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.ts';
import { getValidatedImageType } from './image-upload.ts';
import { createAdminProduct, getAdminDashboard, listAdminOrders, listAdminProducts, listAdminReturnRequests, listAdminUsers, updateAdminOrderStatus, updateAdminProduct, updateAdminReturnRequest, updateAdminUser } from './admin.service.ts';
import { storeUploadedImage } from './upload-storage.ts';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

const imageUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_UPLOADS', message: 'Has cargado muchas imágenes. Intenta más tarde.' } },
});

const uploadedImagePath = z.string().regex(/^\/api\/v1\/uploads\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i);
const imageUrlSchema = z.union([z.string().trim().url().max(2048), uploadedImagePath, z.literal(''), z.null()]).optional();

const productFields = {
  categoryId: z.string().uuid(),
  sku: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(5).max(2000),
  features: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  specifications: z.string().trim().max(4000).default(''),
  condition: z.enum(['Nuevo', 'Reacondicionado', 'Usado']).default('Nuevo'),
  priceClp: z.number().int().min(1).max(2_147_483_647),
  transferPriceClp: z.number().int().min(1).max(2_147_483_647).nullable().optional(),
  stock: z.number().int().min(0).max(2_147_483_647),
  imageUrl: imageUrlSchema,
};

const createProductSchema = z.object(productFields);
const updateProductSchema = z.object({
  ...productFields,
  categoryId: productFields.categoryId.optional(),
  sku: productFields.sku.optional(),
  name: productFields.name.optional(),
  description: productFields.description.optional(),
  features: productFields.features.optional(),
  specifications: productFields.specifications.optional(),
  condition: productFields.condition.optional(),
  priceClp: productFields.priceClp.optional(),
  transferPriceClp: productFields.transferPriceClp,
  stock: productFields.stock.optional(),
  imageUrl: productFields.imageUrl,
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Indica al menos un campo para actualizar.');

const uuidSchema = z.string().uuid();
const orderStatusSchema = z.nativeEnum(OrderStatus);
const userRoleSchema = z.nativeEnum(UserRole);

adminRouter.get('/dashboard', async (_request, response, next) => {
  try { response.json({ data: await getAdminDashboard() }); } catch (error) { next(error); }
});

adminRouter.post('/uploads', imageUploadLimiter, async (request, response, next) => {
  const contentType = request.is(['image/jpeg', 'image/png', 'image/webp']);
  const file = request.body;
  const uploadType = getValidatedImageType(contentType, file);
  if (!uploadType || !Buffer.isBuffer(file)) {
    response.status(400).json({ error: { code: 'INVALID_IMAGE', message: 'Sube una imagen JPG, PNG o WebP válida.' } });
    return;
  }

  try {
    const imageUrl = await storeUploadedImage(file, uploadType.extension);
    response.status(201).json({ data: { imageUrl } });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/products', async (request, response, next) => {
  try {
    const q = typeof request.query.q === 'string' ? request.query.q.slice(0, 100) : undefined;
    const page = Number(request.query.page ?? 1);
    const limit = Number(request.query.limit ?? 10);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      response.status(400).json({ error: { code: 'INVALID_PAGINATION', message: 'La página o el tamaño solicitado no es válido.' } });
      return;
    }
    response.json({ data: await listAdminProducts(q, page, limit) });
  } catch (error) { next(error); }
});

adminRouter.get('/users', async (request, response, next) => {
  try {
    const q = typeof request.query.q === 'string' ? request.query.q.slice(0, 100) : undefined;
    const page = Number(request.query.page ?? 1);
    const limit = Number(request.query.limit ?? 10);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      response.status(400).json({ error: { code: 'INVALID_PAGINATION', message: 'La página o el tamaño solicitado no es válido.' } });
      return;
    }
    response.json({ data: await listAdminUsers(q, page, limit) });
  } catch (error) { next(error); }
});

adminRouter.patch('/users/:userId', async (request, response, next) => {
  const id = uuidSchema.safeParse(request.params.userId);
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    role: userRoleSchema,
    isActive: z.boolean(),
  }).safeParse(request.body);
  if (!id.success || !parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_USER', message: 'Revisa los datos de la cuenta.' } });
    return;
  }
  try {
    response.json({ data: await updateAdminUser(id.data, request.currentUser!.id, parsed.data) });
  } catch (error) { next(error); }
});

adminRouter.post('/products', async (request, response, next) => {
  const parsed = createProductSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_PRODUCT', message: 'Revisa los datos del producto y vuelve a intentar.' } });
    return;
  }
  try {
    response.status(201).json({ data: await createAdminProduct({ ...parsed.data, imageUrl: parsed.data.imageUrl || null }) });
  } catch (error) { next(error); }
});

adminRouter.patch('/products/:productId', async (request, response, next) => {
  const id = uuidSchema.safeParse(request.params.productId);
  const parsed = updateProductSchema.safeParse(request.body);
  if (!id.success || !parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_PRODUCT', message: 'Revisa los datos del producto y vuelve a intentar.' } });
    return;
  }
  try {
    response.json({ data: await updateAdminProduct(id.data, { ...parsed.data, ...(parsed.data.imageUrl === '' ? { imageUrl: null } : {}) }) });
  } catch (error) { next(error); }
});

adminRouter.get('/orders', async (_request, response, next) => {
  try { response.json({ data: await listAdminOrders() }); } catch (error) { next(error); }
});

adminRouter.get('/returns', async (_request, response, next) => {
  try { response.json({ data: await listAdminReturnRequests() }); } catch (error) { next(error); }
});

adminRouter.patch('/returns/:returnId', async (request, response, next) => {
  const id = uuidSchema.safeParse(request.params.returnId);
  const parsed = z.object({ status: z.enum(['REQUESTED', 'REFUNDED', 'REJECTED']), manualConfirmation: z.boolean().default(false) }).safeParse(request.body);
  if (!id.success || !parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_RETURN_STATUS', message: 'La decisión indicada no es válida.' } });
    return;
  }
  try { response.json({ data: await updateAdminReturnRequest(id.data, parsed.data.status, parsed.data.manualConfirmation) }); } catch (error) { next(error); }
});

adminRouter.patch('/orders/:orderId/status', async (request, response, next) => {
  const id = uuidSchema.safeParse(request.params.orderId);
  const parsed = z.object({ status: orderStatusSchema }).safeParse(request.body);
  if (!id.success || !parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_ORDER_STATUS', message: 'El estado indicado no es válido.' } });
    return;
  }
  try {
    response.json({ data: await updateAdminOrderStatus(id.data, parsed.data.status) });
  } catch (error) { next(error); }
});
