/**
 * Reglas de configuración de habitaciones, espejo de
 * `lasmunecasderamon-dashboard/lib/business/habitaciones.ts`.
 *
 * La API del dashboard entrega `name`/`price`/`time` y la base de datos
 * `nombre`/`precio`/`tiempo`; se aceptan ambas formas.
 */

export interface HabitacionConfigurable {
  precio?: unknown;
  price?: unknown;
  comision_anfitriona?: unknown;
  tiempo?: unknown;
  time?: unknown;
}

const numero = (valor: unknown): number => Number(valor ?? 0);

/**
 * "Solo ventas": sin precio, sin comisión y sin duración. No puede abrir un
 * privado/servicio y nunca queda ocupada.
 */
export const esHabitacionSoloVentas = (
  habitacion: HabitacionConfigurable | null | undefined,
): boolean => {
  if (!habitacion) return false;
  return (
    numero(habitacion.precio ?? habitacion.price) <= 0 &&
    numero(habitacion.comision_anfitriona) <= 0 &&
    numero(habitacion.tiempo ?? habitacion.time) <= 0
  );
};

/**
 * Habitaciones que sí pueden abrir un servicio. Incluye ocupadas e inactivas:
 * el selector las muestra deshabilitadas en vez de esconderlas.
 */
export const habitacionesParaServicio = <T extends HabitacionConfigurable>(
  habitaciones: T[],
): T[] =>
  (Array.isArray(habitaciones) ? habitaciones : []).filter(
    (habitacion) => !esHabitacionSoloVentas(habitacion),
  );