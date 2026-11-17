export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.error?.code ?? 'INTERNAL',
      result.error?.message ?? 'Le service est indisponible.',
    );
  return result.data as T;
}
