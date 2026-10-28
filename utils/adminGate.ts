/**
 * Rutas de la app reservadas a administradores.
 *
 * Un usuario sin rol admin que llegue por navegación manual (deep link,
 * historial, URL) es redirigido al inicio del cajero desde `cajero/_layout.tsx`.
 * La pantalla, además, vuelve a comprobar el rol al montarse: la ruta no se
 * limita a ocultar la entrada en la interfaz.
 */
export const RUTAS_SOLO_ADMIN = new Set(['configuracion-asistencia']);

export function rutaExigeAdmin(segmentos: readonly string[]): boolean {
  const ultimo = segmentos[segmentos.length - 1];
  return ultimo !== undefined && RUTAS_SOLO_ADMIN.has(ultimo);
}
