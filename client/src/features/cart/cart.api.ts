export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  stock: number;
  available: boolean;
  lineSubtotalClp: number;
  product: {
    sku: string;
    slug: string;
    name: string;
    priceClp: number;
    imageUrl: string | null;
    categoryName: string;
  };
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotalClp: number;
};

type ApiBody<T> = {
  data?: T;
  error?: { message?: string };
};

async function readCartResponse(response: Response): Promise<Cart> {
  const body = await response.json() as ApiBody<Cart>;
  if (!response.ok || !body.data) {
    throw new Error(body.error?.message ?? 'No fue posible actualizar el carrito.');
  }
  return body.data;
}

export async function fetchCart() {
  const response = await fetch('/api/v1/cart', { credentials: 'same-origin' });
  return readCartResponse(response);
}

export async function addCartProduct(productId: string, quantity = 1) {
  const response = await fetch('/api/v1/cart/items', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
  return readCartResponse(response);
}

export async function setCartItemQuantity(itemId: string, quantity: number) {
  const response = await fetch('/api/v1/cart/items/' + encodeURIComponent(itemId), {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  return readCartResponse(response);
}

export async function deleteCartItem(itemId: string) {
  const response = await fetch('/api/v1/cart/items/' + encodeURIComponent(itemId), {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!response.ok) {
    const body = await response.json() as ApiBody<never>;
    throw new Error(body.error?.message ?? 'No fue posible quitar el producto.');
  }
  return fetchCart();
}
