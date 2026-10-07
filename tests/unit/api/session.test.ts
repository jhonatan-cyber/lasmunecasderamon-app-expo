import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { apiClient } from '@/api/request';
import { getTokenInMemory, setTokenInMemory, setUnauthorizedHandler, setSessionConfirmedHandler, refreshAccessToken } from '@/api/token';
import { InvalidResponseError, NetworkError, TimeoutError, UnauthorizedError, httpDetailsOf } from '@/api/errors';
import { TokenStorage } from '@/utils/tokenStorage';

vi.mock('@/api/base-url', () => ({ API_URL: 'http://dashboard.test/api' }));
vi.mock('@/api/retry', async importOriginal => ({
  ...await importOriginal<typeof import('@/api/retry')>(),
  delay: vi.fn(() => Promise.resolve()),
}));


const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const unauthorized = vi.fn();
const confirmed = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  setTokenInMemory('viejo');
  setUnauthorizedHandler(unauthorized);
  setSessionConfirmedHandler(confirmed);
  vi.mocked(TokenStorage.getRefreshToken).mockResolvedValue('refresh');
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('peticiones con renovación de sesión', () => {
  it('reenvía con retries 0, conservando body y clave de idempotencia', async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
      calls.push({ url, options: { ...options, headers: new Headers(options.headers) } });
      return calls.length === 1 ? json({}, 401) : calls.length === 2
        ? json({ success: true, token: 'nuevo', refreshToken: 'rotado' }) : json({ success: true, data: { id: 'pedido' } });
    }));
    const result = await apiClient('/orders', { method: 'POST', retries: 0, headers: { 'x-idempotency-key': 'intencion-1' }, body: JSON.stringify({ total: 100 }) });
    expect(result).toEqual({ success: true, data: { id: 'pedido' } });
    expect(calls.map(c => c.url)).toEqual(['http://dashboard.test/api/orders', 'http://dashboard.test/api/auth/refresh', 'http://dashboard.test/api/orders']);
    expect(new Headers(calls[0].options.headers).get('Authorization')).toBe('Bearer viejo');
    expect(new Headers(calls[2].options.headers).get('Authorization')).toBe('Bearer nuevo');
    expect(new Headers(calls[2].options.headers).get('x-idempotency-key')).toBe('intencion-1');
    expect(calls[2].options.body).toBe(calls[0].options.body);
    expect(TokenStorage.saveRefreshToken).toHaveBeenCalledWith('rotado');
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('limita la renovación a una cuando la petición vuelve a responder 401', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ success: true, token: 'nuevo' })).mockResolvedValueOnce(json({}, 401));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiClient('/orders', { retries: 0 })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(unauthorized).toHaveBeenCalledOnce();
  });

  it('un refresh 503 conserva la sesión y no llama al cierre de sesión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({}, 503)));
    await expect(apiClient('/orders', { retries: 0 })).rejects.toBeInstanceOf(NetworkError);
    expect(TokenStorage.removeTokens).not.toHaveBeenCalled();
    expect(getTokenInMemory()).toBe('viejo');
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('puede renovar en otro intento tras un refresh temporalmente fallido', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({ success: true, token: 'nuevo' }))
      .mockResolvedValueOnce(json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiClient('/orders', { retries: 1 })).resolves.toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('no intenta renovar un login rechazado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 401));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiClient('/auth/login', { method: 'POST', retries: 0 })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rechaza HTML 200 sin confirmar la sesión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Error</html>')));
    await expect(apiClient('/sales', { retries: 0 })).rejects.toBeInstanceOf(InvalidResponseError);
    expect(confirmed).not.toHaveBeenCalled();
  });

  it('acepta respuestas 204 sin cuerpo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiClient('/orders', { retries: 0 })).resolves.toEqual({});
  });
});

describe('renovación y almacenamiento', () => {
  it.each([401, 403])('invalida tokens únicamente ante rechazo de sesión %s', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, status)));
    expect(await refreshAccessToken()).toBe(false);
    expect(TokenStorage.removeTokens).toHaveBeenCalledOnce();
    expect(getTokenInMemory()).toBeNull();
  });

  it.each([429, 500, 503])('conserva tokens ante HTTP %s', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, status)));
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(NetworkError);
    expect(TokenStorage.removeTokens).not.toHaveBeenCalled();
    expect(getTokenInMemory()).toBe('viejo');
  });

  it('conserva tokens ante una respuesta de renovación inválida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: true, token: 123 })));
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(InvalidResponseError);
    expect(TokenStorage.removeTokens).not.toHaveBeenCalled();
  });

  it('comparte una renovación entre llamadas concurrentes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true, token: 'nuevo', refreshToken: 'rotado' }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await Promise.all([refreshAccessToken(), refreshAccessToken()])).toEqual([true, true]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('limita el tiempo de renovación y conserva tokens al agotarlo', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Abortado', 'AbortError')), { once: true });
    })));
    const pending = expect(refreshAccessToken()).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(10000);
    await pending;
    expect(TokenStorage.removeTokens).not.toHaveBeenCalled();
  });
});

describe('respuesta 403 (autenticado pero sin permiso)', () => {
  it('no renueva token, no borra sesión y adjunta el status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: false, message: 'Sin permiso' }, 403));
    vi.stubGlobal('fetch', fetchMock);
    const error = await apiClient('/admin/panel', { retries: 0 }).catch(e => e);
    expect(httpDetailsOf(error)?.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(TokenStorage.removeTokens).not.toHaveBeenCalled();
    expect(getTokenInMemory()).toBe('viejo');
    expect(unauthorized).not.toHaveBeenCalled();
  });
});

describe('clave de idempotencia global', () => {
  it('envía x-idempotency-key estable entre reintentos', async () => {
    const seen: (string | null)[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
      seen.push(new Headers(options.headers).get('x-idempotency-key'));
      return seen.length === 1 ? json({}, 500) : json({ success: true });
    }));
    await expect(apiClient('/orders', {
      method: 'POST', retries: 1, body: JSON.stringify({ total: 100 }),
    })).resolves.toEqual({ success: true });
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBeTruthy();
    expect(seen[1]).toBe(seen[0]);
  });

  it('respeta una clave ya puesta (la del outbox manda)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    await apiClient('/orders', {
      method: 'POST', retries: 0,
      headers: { 'x-idempotency-key': 'intent-1' },
      body: JSON.stringify({ total: 100 }),
    });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('x-idempotency-key')).toBe('intent-1');
  });

  it('no la pone en GET', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    await apiClient('/orders', { retries: 0 });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('x-idempotency-key')).toBeNull();
  });
});
