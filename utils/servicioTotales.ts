import type { MetodoPago } from "@lasmunecasderamon/types";

/** El cobro con tarjeta sube el total al múltiplo de 5000 y registra la diferencia como IVA. */
export const REDONDEO_TARJETA = 5000;

/** Las habitaciones de 60 minutos cobran el doble de la tarifa base en el cobro directo. */
export const TIEMPO_HABITACION_DOBLE = 60;

/**
 * Los dos flujos de creación difieren a propósito y hoy el negocio no ha
 * confirmado cuál es la regla correcta:
 * - `directo` (caja): habitación de 60 min ×2 y tarjeta siempre redondea.
 * - `solicitud` (garzón/barman): sin ×2 de tiempo y tarjeta redondea solo sin comisión.
 * Cambiar la regla de un flujo es cambiar `politica` en un solo lugar.
 */
export type PoliticaCobro = "directo" | "solicitud";

export interface TotalesServicioInput {
  precioServicioUnidad: number;
  precioHabitacion: number;
  tiempoHabitacion: number;
  cantidadAnfitrionas: number;
  cantidadClientes: number;
  comisionHabitacion: number;
  metodoPago: MetodoPago;
  ivaDecimal: number;
  politica?: PoliticaCobro;
}

export interface TotalesServicio {
  precioServicio: number;
  precioHabitacion: number;
  iva: number;
  total: number;
  comisionPorAnfitriona: number;
}

const numeroSeguro = (valor: unknown) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const conteo = (valor: unknown) =>
  Math.max(1, Math.floor(numeroSeguro(valor)));

export function calcularTotalesServicio(
  input: TotalesServicioInput,
): TotalesServicio {
  const politica: PoliticaCobro = input.politica ?? "directo";
  const comisionHabitacion = Math.max(0, numeroSeguro(input.comisionHabitacion));
  const tieneComisionHabitacion = comisionHabitacion > 0;
  const anfitrionas = conteo(input.cantidadAnfitrionas);
  const clientes = conteo(input.cantidadClientes);

  const factorTiempo =
    politica === "directo" &&
    numeroSeguro(input.tiempoHabitacion) === TIEMPO_HABITACION_DOBLE
      ? 2
      : 1;

  // En la solicitud sin comisión el servicio se cobra por persona atendida
  // (el mayor entre anfitrionas y clientes), igual que la habitación.
  const multiplicadorServicio =
    politica === "solicitud" && !tieneComisionHabitacion
      ? Math.max(anfitrionas, clientes)
      : anfitrionas * factorTiempo;
  const multiplicadorHabitacion =
    (tieneComisionHabitacion ? 1 : Math.max(anfitrionas, clientes)) * factorTiempo;

  const precioServicio =
    numeroSeguro(input.precioServicioUnidad) * multiplicadorServicio;
  const precioHabitacion =
    numeroSeguro(input.precioHabitacion) * multiplicadorHabitacion;

  const esTarjeta = input.metodoPago === "tarjeta";
  let iva = esTarjeta
    ? Math.floor(precioServicio * numeroSeguro(input.ivaDecimal))
    : 0;

  let total = precioServicio + precioHabitacion + iva;
  const debeRedondear =
    esTarjeta && (politica === "directo" || !tieneComisionHabitacion);

  if (debeRedondear) {
    const totalRedondeado = Math.ceil(total / REDONDEO_TARJETA) * REDONDEO_TARJETA;
    iva += totalRedondeado - total;
    total = totalRedondeado;
  }

  const anfitrionasSeleccionadas = Math.floor(numeroSeguro(input.cantidadAnfitrionas));
  const comisionPorAnfitriona = tieneComisionHabitacion
    ? anfitrionasSeleccionadas > 0
      ? Math.floor(comisionHabitacion / anfitrionasSeleccionadas)
      : comisionHabitacion
    : comisionHabitacion;

  return {
    precioServicio,
    precioHabitacion,
    iva,
    total,
    comisionPorAnfitriona,
  };
}

export interface ComisionServicioInput {
  habitacionComision: number;
  /** Valor que ya entrega el servidor; sin él se usa el precio de servicio unitario. */
  comisionIndividual?: number | null;
  precioServicioUnidad: number;
  totalUsuarios: number;
}

export interface ComisionServicio {
  comisionIndividual: number;
  totalComision: number;
}

export function calcularComisionServicio(
  input: ComisionServicioInput,
): ComisionServicio {
  const usuarios = conteo(input.totalUsuarios);
  const habitacionComision = Math.max(0, numeroSeguro(input.habitacionComision));

  if (habitacionComision > 0) {
    return {
      comisionIndividual: Math.floor(habitacionComision / usuarios),
      totalComision: habitacionComision,
    };
  }

  const comisionIndividual =
    input.comisionIndividual != null
      ? numeroSeguro(input.comisionIndividual)
      : numeroSeguro(input.precioServicioUnidad);

  return {
    comisionIndividual,
    totalComision: comisionIndividual * usuarios,
  };
}

export function contarUsuariosServicio(partes: {
  totalUsuarios?: unknown;
  anfitrionasIds?: unknown[] | null;
  anfitrionasNombres?: unknown[] | null;
}): number {
  return Math.max(
    1,
    Math.floor(numeroSeguro(partes.totalUsuarios)),
    partes.anfitrionasIds?.length ?? 0,
    partes.anfitrionasNombres?.length ?? 0,
  );
}
