import { apiClient } from './request';
import type { ApiRes } from '@/types/api';

/**
 * Safe wrapper around `apiClient` that always returns `ApiRes<T>`.
 *
 * Instead of writing:
 *   apiClient<ApiRes<unknown>>('/path')       → res.data is unknown
 *   apiClient('/path')                        → res is ApiRes<unknown> (default generic)
 *
 * Write:
 *   apiClientSafe<MyType[]>('/path')            → res.data is MyType[]
 *   apiClientSafe('/path')                      → res.data is unknown (explicit default)
 *
 * This eliminates the need for `(res as any).data` or `res.data as MyType[]` casts.
 *
 * @example
 * const res = await apiClientSafe<CuentaDetalle[]>('/cuentas');
 * if (res.success) {
 *   const cuentas = res.data; // typed as CuentaDetalle[]
 * }
 */
export async function apiClientSafe<TData = unknown>(
  endpoint: string,
  options?: RequestInit & { timeout?: number; retries?: number },
): Promise<ApiRes<TData>> {
  return apiClient<ApiRes<TData>>(endpoint, options);
}
