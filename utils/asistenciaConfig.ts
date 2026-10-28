/**
 * Helpers puros de la ventana de asistencia (sección "Ventana de asistencia").
 *
 * Las claves son las mismas que usa el dashboard (`SettingsAttendanceTab`), así
 * que el valor guardado desde la app es idéntico al del módulo de configuraciones.
 */

export interface VentanaAsistencia {
  asistencia_hora_inicio: number;
  asistencia_minuto_inicio: number;
  asistencia_hora_fin: number;
  asistencia_minuto_fin: number;
}

export const VENTANA_ASISTENCIA_DEFECTO: VentanaAsistencia = {
  asistencia_hora_inicio: 21,
  asistencia_minuto_inicio: 0,
  asistencia_hora_fin: 23,
  asistencia_minuto_fin: 0,
};

export const padHora = (valor: number) => String(valor).padStart(2, '0');

export const aMinutos = (hora: number, minuto: number) => hora * 60 + minuto;

export const formatearHora = (hora: number, minuto: number) =>
  `${padHora(hora)}:${padHora(minuto)}`;

/** "HH:MM" → partes numéricas, o `null` si el formato no es válido. */
export const leerHora = (valor: string): { hora: number; minuto: number } | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(valor.trim());
  if (!match) return null;

  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  if (hora > 23 || minuto > 59) return null;

  return { hora, minuto };
};

/**
 * El servidor acepta la ventana semiabierta (`hora >= inicio && hora < fin`):
 * con `inicio >= fin` no entraría nunca ninguna marca, así que se corta antes
 * de guardar.
 */
export const ventanaValida = (ventana: VentanaAsistencia): boolean => {
  const inicio = aMinutos(ventana.asistencia_hora_inicio, ventana.asistencia_minuto_inicio);
  const fin = aMinutos(ventana.asistencia_hora_fin, ventana.asistencia_minuto_fin);
  return inicio >= 0 && fin <= 1439 && inicio < fin;
};

/** Duración de la ventana en minutos (0 si la ventana es inválida). */
export const duracionVentana = (ventana: VentanaAsistencia): number => {
  if (!ventanaValida(ventana)) return 0;
  return (
    aMinutos(ventana.asistencia_hora_fin, ventana.asistencia_minuto_fin) -
    aMinutos(ventana.asistencia_hora_inicio, ventana.asistencia_minuto_inicio)
  );
};

/** Normaliza lo que llega del servidor, cayendo a los valores por defecto. */
export const normalizarVentana = (
  raw: Partial<Record<keyof VentanaAsistencia, unknown>> | null | undefined,
): VentanaAsistencia => {
  const entero = (valor: unknown, porDefecto: number) => {
    const numero = Number(valor);
    return Number.isInteger(numero) ? numero : porDefecto;
  };

  return {
    asistencia_hora_inicio: entero(
      raw?.asistencia_hora_inicio,
      VENTANA_ASISTENCIA_DEFECTO.asistencia_hora_inicio,
    ),
    asistencia_minuto_inicio: entero(
      raw?.asistencia_minuto_inicio,
      VENTANA_ASISTENCIA_DEFECTO.asistencia_minuto_inicio,
    ),
    asistencia_hora_fin: entero(
      raw?.asistencia_hora_fin,
      VENTANA_ASISTENCIA_DEFECTO.asistencia_hora_fin,
    ),
    asistencia_minuto_fin: entero(
      raw?.asistencia_minuto_fin,
      VENTANA_ASISTENCIA_DEFECTO.asistencia_minuto_fin,
    ),
  };
};
