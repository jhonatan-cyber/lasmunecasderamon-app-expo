import { calculateRemainingTime, parseDateSafe } from "@/utils/timeUtils";

export interface TiempoServicio {
  /** Segundos que faltan, nunca negativos. */
  restante: number;
  /** Segundos transcurridos, acotados a la duración total. */
  transcurrido: number;
  totalSegundos: number;
  /** Avance del servicio entre 0 y 1. */
  progreso: number;
  /** Segundos pasados de la duración contratada (0 si no hay exceso). */
  excedidoSegundos: number;
  estaExcedido: boolean;
  estaCritico: boolean;
  estaPausado: boolean;
}

/**
 * `calculateRemainingTime` recorta en 0, así que por sí solo no permite saber
 * cuánto se pasó el servicio. Este helper conserva ese excedente y el avance
 * para la barra de progreso de la tarjeta.
 */
export function tiempoServicio(
  timer: { startTime: Date | string; duration: number; isPaused: boolean; remainingTime: number },
  serverOffset = 0,
): TiempoServicio {
  const totalSegundos = Math.max(0, Math.round(Number(timer.duration) || 0) * 60);
  const restante = calculateRemainingTime(timer, serverOffset);
  const estaPausado = Boolean(timer.isPaused);

  let transcurrido = Math.max(0, totalSegundos - restante);
  let excedidoSegundos = 0;

  if (!estaPausado) {
    const start = typeof timer.startTime === "string" ? parseDateSafe(timer.startTime) : timer.startTime;
    const transcurridoReal = Math.floor((Date.now() + serverOffset - start.getTime()) / 1000);
    transcurrido = Math.min(totalSegundos, Math.max(0, transcurridoReal));
    excedidoSegundos = Math.max(0, transcurridoReal - totalSegundos);
  }

  return {
    restante,
    transcurrido,
    totalSegundos,
    progreso: totalSegundos > 0 ? transcurrido / totalSegundos : 0,
    excedidoSegundos,
    estaExcedido: excedidoSegundos > 0,
    estaCritico: restante > 0 && restante < 60,
    estaPausado,
  };
}
