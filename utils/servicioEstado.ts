/**
 * Estados de `servicios.estado` con su etiqueta y color semántico compartidos.
 * Las tarjetas y modales solo aportan variantes de fondo por tema.
 */
export type EstadoServicioKey =
  | "anulado"
  | "finalizado"
  | "en_proceso"
  | "pausado"
  | "solicitud_anulada"
  | "desconocido";

export interface EstadoServicioInfo {
  key: EstadoServicioKey;
  label: string;
  color: string;
}

const ESTADOS: Record<number, EstadoServicioInfo> = {
  0: { key: "anulado", label: "Anulado", color: "#EF4444" },
  1: { key: "finalizado", label: "Finalizado", color: "#10B981" },
  2: { key: "en_proceso", label: "En Proceso", color: "#3B82F6" },
  3: { key: "pausado", label: "Pausado", color: "#F59E0B" },
  4: { key: "solicitud_anulada", label: "Solicitud Anul.", color: "#F97316" },
};

const DESCONOCIDO: EstadoServicioInfo = {
  key: "desconocido",
  label: "Desconocido",
  color: "#6B7280",
};

export function estadoServicio(estado: unknown): EstadoServicioInfo {
  // Sin dato no es lo mismo que "0": un `null` no debe mostrarse como Anulado.
  if (estado === null || estado === undefined || estado === "") {
    return DESCONOCIDO;
  }
  return ESTADOS[Number(estado)] ?? DESCONOCIDO;
}

export const esServicioPendiente = (estado: unknown) => Number(estado) === 2;
export const esServicioFinalizado = (estado: unknown) => Number(estado) === 1;
export const esServicioAnulado = (estado: unknown) =>
  Number(estado) === 0 || Number(estado) === 4;

/** Estado que pinta la tarjeta: el dominio más el avance del temporizador. */
export type EstadoVisual =
  | "en_proceso"
  | "critico"
  | "excedido"
  | "pausado"
  | "anulado"
  | "finalizado"
  | "desconocido";

export interface BadgeColors {
  background: string;
  foreground: string;
}

/**
 * El estado del servicio manda sobre el temporizador: un servicio anulado o
 * pausado no debe verse como "excedido" porque el reloj siga corriendo.
 */
export function estadoVisualServicio(
  estado: unknown,
  opciones: { excedido: boolean; critico: boolean },
): EstadoVisual {
  switch (estadoServicio(estado).key) {
    case "anulado":
    case "solicitud_anulada":
      return "anulado";
    case "pausado":
      return "pausado";
    case "finalizado":
      return "finalizado";
    case "desconocido":
      return "desconocido";
    default:
      if (opciones.excedido) return "excedido";
      if (opciones.critico) return "critico";
      return "en_proceso";
  }
}

// Pares fondo/texto con contraste AA (>= 4.5:1) para las píldoras de estado.
const BADGES: Record<EstadoVisual, { light: BadgeColors; dark: BadgeColors }> = {
  en_proceso: {
    light: { background: "#DBEAFE", foreground: "#1E40AF" },
    dark: { background: "#1E3A8A", foreground: "#BFDBFE" },
  },
  critico: {
    light: { background: "#FEF3C7", foreground: "#92400E" },
    dark: { background: "#78350F", foreground: "#FDE68A" },
  },
  excedido: {
    light: { background: "#FEE2E2", foreground: "#991B1B" },
    dark: { background: "#7F1D1D", foreground: "#FECACA" },
  },
  pausado: {
    light: { background: "#E5E7EB", foreground: "#374151" },
    dark: { background: "#374151", foreground: "#D1D5DB" },
  },
  anulado: {
    light: { background: "#FEE2E2", foreground: "#991B1B" },
    dark: { background: "#7F1D1D", foreground: "#FECACA" },
  },
  finalizado: {
    light: { background: "#D1FAE5", foreground: "#065F46" },
    dark: { background: "#064E3B", foreground: "#A7F3D0" },
  },
  desconocido: {
    light: { background: "#E5E7EB", foreground: "#374151" },
    dark: { background: "#374151", foreground: "#D1D5DB" },
  },
};

export function coloresBadgeEstado(visual: EstadoVisual, isDark: boolean): BadgeColors {
  return isDark ? BADGES[visual].dark : BADGES[visual].light;
}
