import type { OrderStatus } from '@prisma/client';

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: ['PREPARING'],
  PREPARING: ['SHIPPED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus) {
  return allowedTransitions[current].includes(next);
}
