export type User = {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
};
export type Address = {
  id: string; label: string; recipientName: string; phone: string;
  address: string; commune: string; region: string; isDefault: boolean;
};

type ApiResponse<T> = {
  data?: T;
  error?: { message?: string };
};

async function readResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error('El servidor respondió sin contenido. Revisa el registro de la API e intenta nuevamente.');
  }

  let body: ApiResponse<T>;
  try {
    body = JSON.parse(responseText) as ApiResponse<T>;
  } catch {
    throw new Error('El servidor devolvió una respuesta que la aplicación no pudo leer. Revisa el registro de la API.');
  }

  if (!response.ok || body.data === undefined) {
    throw new Error(body.error?.message ?? 'No fue posible completar la solicitud.');
  }
  return body.data;
}

async function post<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(path, {
    method,
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
  return post<{ email: string; verificationRequired: boolean; user?: User }>('/api/v1/auth/register', { name, email, password });
}

export async function signOutRequest() {
  await post<void>('/api/v1/auth/logout');
}

export async function updateProfileRequest(name: string) {
  return post<User>('/api/v1/auth/me', { name }, 'PATCH');
}

export async function fetchAddressesRequest(): Promise<Address[]> {
  const response = await fetch('/api/v1/auth/me/addresses', { credentials: 'same-origin' });
  return readResponse<Address[]>(response);
}

export async function saveAddressRequest(address: Omit<Address, 'id'> & { id?: string }) {
  const { id, ...body } = address;
  const response = await fetch(id ? `/api/v1/auth/me/addresses/${id}` : '/api/v1/auth/me/addresses', {
    method: id ? 'PATCH' : 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return readResponse<Address>(response);
}

export async function deleteAddressRequest(id: string) {
  const response = await fetch(`/api/v1/auth/me/addresses/${id}`, { method: 'DELETE', credentials: 'same-origin' });
  if (response.status !== 204) await readResponse<never>(response);
}

export async function requestPasswordReset(email: string) {
  return post<{ message: string }>('/api/v1/auth/password/forgot', { email });
}

export async function resendVerification(email: string) {
  return post<{ message: string }>('/api/v1/auth/email/resend', { email });
}

export async function verifyEmail(token: string) {
  return post<{ verified: boolean }>('/api/v1/auth/email/verify', { token });
}

export async function resetPassword(token: string, password: string) {
  return post<{ changed: boolean }>('/api/v1/auth/password/reset', { token, password });
}

export async function changePassword(currentPassword: string, password: string) {
  return post<{ changed: boolean }>('/api/v1/auth/password/change', { currentPassword, password });
}
