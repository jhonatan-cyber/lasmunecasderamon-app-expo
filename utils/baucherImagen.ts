import { API_URL } from '@/api/base-url';
import { ensureTokenInMemory, refreshAccessToken } from '@/api/token';

/**
 * Descarga la foto del baucher desde una ruta autenticada del dashboard.
 *
 * Las rutas `/orders/:id/baucher`, `/sales/:id/baucher` y `/tickets/:id/baucher`
 * exigen sesión, así que un `<Image src>` directo no sirve: el token viaja en el
 * header. El servidor devuelve el archivo, no JSON, por eso no se usa
 * `apiClient`; se pide con `fetch`, se renueva el token una vez si venció y se
 * entrega un data URL que `<Image>` puede mostrar igual en nativo y en web.
 */

/** La fila apunta a una foto que ya no está en el servidor. */
export class BaucherNoDisponibleError extends Error {
  constructor() {
    super('El baucher ya no está disponible');
    this.name = 'BaucherNoDisponibleError';
  }
}

/** La foto existe pero no se pudo traer (red, permisos, formato). */
export class BaucherNoCargableError extends Error {
  constructor(message = 'No se pudo cargar el baucher') {
    super(message);
    this.name = 'BaucherNoCargableError';
  }
}

async function pedirFoto(endpoint: string): Promise<Response> {
  const token = await ensureTokenInMemory();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(`${API_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function leerComoDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new BaucherNoCargableError());
    reader.readAsDataURL(blob);
  });
}

export async function cargarImagenBaucher(endpoint: string): Promise<string> {
  let res = await pedirFoto(endpoint);

  // Mismo criterio que `apiClient`: un 401 se reintenta una vez con el token
  // renovado antes de dar la foto por perdida.
  if (res.status === 401) {
    const renovado = await refreshAccessToken().catch(() => false);
    if (renovado) res = await pedirFoto(endpoint);
  }

  if (res.status === 404) throw new BaucherNoDisponibleError();
  if (!res.ok) throw new BaucherNoCargableError(`HTTP ${res.status}`);

  return leerComoDataUrl(await res.blob());
}
