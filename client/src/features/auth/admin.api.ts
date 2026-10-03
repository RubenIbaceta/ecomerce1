import type { Category } from '../catalog/catalog.api';

export type AdminProduct = {
  id: string;
  categoryId: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  priceClp: number;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  category: { name: string; isActive: boolean };
};

export type AdminOrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'PREPARING' | 'SHIPPED' | 'COMPLETED';
export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: AdminOrderStatus;
  subtotalClp: number;
  shippingClp: number;
  totalClp: number;
  recipientName: string;
  phone: string;
  address: string;
  commune: string;
  region: string;
  createdAt: string;
  paidAt: string | null;
  user: { name: string; email: string };
  items: Array<{ id: string; sku: string; productName: string; unitPriceClp: number; quantity: number }>;
  payments: Array<{ id: string; provider: 'DEMO' | 'WEBPAY'; status: 'PENDING' | 'APPROVED' | 'REJECTED'; amountClp: number; authorizedAt: string | null }>;
};

export type ProductInput = {
  categoryId: string;
  sku: string;
  name: string;
  description: string;
  priceClp: number;
  stock: number;
  imageUrl: string | null;
};

type ApiResponse<T> = { data?: T; error?: { message?: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api/v1/admin' + path, {
    ...init,
    credentials: 'same-origin',
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  const body = response.status === 204 ? null : await response.json() as ApiResponse<T>;
  if (!response.ok || !body?.data) {
    const message = body?.error?.message ?? (response.status === 403 ? 'Tu cuenta no tiene permisos de administración.' : 'No fue posible completar la operación.');
    throw new Error(message);
  }
  return body.data;
}

export function fetchAdminProducts(q = '') {
  const query = q.trim() ? '?q=' + encodeURIComponent(q.trim()) : '';
  return request<AdminProduct[]>('/products' + query);
}

export function createAdminProduct(input: ProductInput) {
  return request<AdminProduct>('/products', { method: 'POST', body: JSON.stringify(input) });
}

export function updateAdminProduct(id: string, input: Partial<ProductInput> & { isActive?: boolean }) {
  return request<AdminProduct>('/products/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(input) });
}

export async function uploadAdminImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Elige una imagen JPG, PNG o WebP.');
  }
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error('La imagen debe pesar menos de 5 MB.');
  }
  const response = await fetch('/api/v1/admin/uploads', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  const body = await response.json() as ApiResponse<{ imageUrl: string }>;
  if (!response.ok || !body.data) throw new Error(body.error?.message ?? 'No se pudo cargar la imagen.');
  return body.data.imageUrl;
}

export function fetchAdminOrders() {
  return request<AdminOrder[]>('/orders');
}

export function updateAdminOrderStatus(id: string, status: AdminOrderStatus) {
  return request<AdminOrder>('/orders/' + encodeURIComponent(id) + '/status', {
    method: 'PATCH', body: JSON.stringify({ status }),
  });
}

export async function fetchAdminCategories() {
  const response = await fetch('/api/v1/categories', { credentials: 'same-origin' });
  const body = await response.json() as ApiResponse<Category[]>;
  if (!response.ok || !body.data) throw new Error('No se pudieron cargar las categorías.');
  return body.data;
}

export function adminOrderStatusLabel(status: AdminOrderStatus) {
  return {
    PENDING_PAYMENT: 'Pendiente de pago',
    PAID: 'Pagado',
    CANCELLED: 'Cancelado',
    PREPARING: 'En preparación',
    SHIPPED: 'Enviado',
    COMPLETED: 'Completado',
  }[status];
}

export function nextAdminOrderStatuses(status: AdminOrderStatus): AdminOrderStatus[] {
  const transitions: Record<AdminOrderStatus, AdminOrderStatus[]> = {
    PENDING_PAYMENT: ['CANCELLED'],
    PAID: ['PREPARING'],
    PREPARING: ['SHIPPED'],
    SHIPPED: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
  };
  return transitions[status];
}
