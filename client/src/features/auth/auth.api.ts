export type User = {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
};

type ApiResponse<T> = {
  data?: T;
  error?: { message?: string };
};

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as ApiResponse<T>;
  if (!response.ok || body.data === undefined) {
    throw new Error(body.error?.message ?? 'No fue posible completar la solicitud.');
  }
  return body.data;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  return readResponse<T>(response);
}

export async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch('/api/v1/auth/me', { credentials: 'same-origin' });
  if (response.status === 401) return null;
  return readResponse<User>(response);
}

export async function signInRequest(email: string, password: string) {
  return post<User>('/api/v1/auth/login', { email, password });
}

export async function registerRequest(name: string, email: string, password: string) {
  return post<User>('/api/v1/auth/register', { name, email, password });
}

export async function signOutRequest() {
  await post<void>('/api/v1/auth/logout');
}
