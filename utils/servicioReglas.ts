/** Habitaciones con comisión: máximo 3 anfitrionas y 4 personas (anfitrionas + clientes). */
export const MAX_ANFITRIONAS_CON_COMISION = 3;
export const MAX_PERSONAS_SERVICIO = 4;

/** Límite de anfitrionas cuando la habitación cobra comisión. */
export function maxAnfitrionasConComision(cantidadClientes: number): number {
  return Math.min(
    MAX_ANFITRIONAS_CON_COMISION,
    MAX_PERSONAS_SERVICIO - Math.max(0, cantidadClientes),
  );
}

/**
 * Límite de clientes cuando la habitación cobra comisión. Reserva al menos un
 * cupo para la anfitriona: sin ella el servicio no se puede crear.
 */
export function maxClientesConComision(cantidadAnfitrionas: number): number {
  return MAX_PERSONAS_SERVICIO - Math.max(1, cantidadAnfitrionas);
}
