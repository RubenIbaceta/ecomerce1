export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'PREPARING' | 'SHIPPED' | 'COMPLETED';

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotalClp: number;
  shippingClp: number;
  totalClp: number;
  recipientName: string;
  phone: string;
  address: string;
  commune: string;
  region: string;
  reservationExpiresAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    sku: string;
    productName: string;
    unitPriceClp: number;
    quantity: number;
  }>;
  payments: Array<{
    id: string;
    provider: 'DEMO' | 'WEBPAY';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    amountClp: number;
    authorizedAt: string | null;
  }>;
};

type ApiBody<T> = {
  data?: T;
  error?: { message?: string };
};

async function readOrderResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as ApiBody<T>;
  if (!response.ok || body.data === undefined) {
    throw new Error(body.error?.message ?? 'No fue posible completar la operación.');
  }
  return body.data;
}

export async function createOrder(input: {
  recipientName: string;
  phone: string;
  address: string;
  commune: string;
  region: string;
}) {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readOrderResponse<Order>(response);
}

export async function fetchOrders() {
  const response = await fetch('/api/v1/orders', { credentials: 'same-origin' });
  return readOrderResponse<Order[]>(response);
}

export async function fetchOrder(orderId: string) {
  const response = await fetch('/api/v1/orders/' + encodeURIComponent(orderId), { credentials: 'same-origin' });
  return readOrderResponse<Order>(response);
}

export async function payDemoOrder(orderId: string) {
  const response = await fetch('/api/v1/orders/' + encodeURIComponent(orderId) + '/payments/demo', {
    method: 'POST',
    credentials: 'same-origin',
  });
  return readOrderResponse<Order>(response);
}

export async function startWebpayPayment(orderId: string) {
  const response = await fetch('/api/v1/orders/' + encodeURIComponent(orderId) + '/payments/webpay', {
    method: 'POST',
    credentials: 'same-origin',
  });
  return readOrderResponse<{ url: string; token: string }>(response);
}

export async function cancelOrder(orderId: string) {
  const response = await fetch('/api/v1/orders/' + encodeURIComponent(orderId) + '/cancel', {
    method: 'POST',
    credentials: 'same-origin',
  });
  return readOrderResponse<Order>(response);
}

export function orderStatusLabel(status: OrderStatus) {
  return {
    PENDING_PAYMENT: 'Pendiente de pago',
    PAID: 'Pagado',
    CANCELLED: 'Cancelado',
    PREPARING: 'En preparación',
    SHIPPED: 'Enviado',
    COMPLETED: 'Completado',
  }[status];
}
