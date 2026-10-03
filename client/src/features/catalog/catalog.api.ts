export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count: { products: number };
};

export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  features: string[];
  specifications: string;
  condition: 'Nuevo' | 'Reacondicionado' | 'Usado';
  priceClp: number;
  transferPriceClp: number | null;
  stock: number;
  imageUrl: string | null;
  category: { name: string; slug: string };
};

type ProductListResponse = {
  data: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

function errorMessage(status: number) {
  if (status === 404) return 'No encontramos ese producto.';
  if (status >= 500) return 'El servicio no está disponible por ahora. Intenta nuevamente.';
  return 'No fue posible completar la solicitud.';
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(errorMessage(response.status));
  return response.json() as Promise<T>;
}

export async function fetchCategories(signal?: AbortSignal) {
  const response = await fetch('/api/v1/categories', { signal });
  const result = await readJson<{ data: Category[] }>(response);
  return result.data;
}

export async function fetchProducts(params: URLSearchParams, signal?: AbortSignal) {
  const response = await fetch(`/api/v1/products?${params.toString()}`, { signal });
  return readJson<ProductListResponse>(response);
}

export async function fetchProduct(slug: string, signal?: AbortSignal) {
  const response = await fetch(`/api/v1/products/${encodeURIComponent(slug)}`, { signal });
  const result = await readJson<{ data: Product }>(response);
  return result.data;
}

export function formatPrice(priceClp: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(priceClp);
}
