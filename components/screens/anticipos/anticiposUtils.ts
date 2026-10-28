import type { Anticipo } from "@/hooks/useAnticipos";

export type FiltroAnticipos = "todos" | "pendiente" | "aprobado" | "rechazado";
export type VistaAnticipos = "solicitudes" | "anticipos";

export const normalizeEstado = (
  estado: Anticipo["estado"] | number | string,
) => {
  if (estado === 2 || estado === "2" || estado === "pendiente")
    return "pendiente";
  if (
    estado === 1 ||
    estado === "1" ||
    estado === "confirmada" ||
    estado === "aprobado" ||
    estado === "aprobada"
  )
    return "confirmada";
  if (
    estado === 0 ||
    estado === "0" ||
    estado === "pagada" ||
    estado === "pagado" ||
    estado === "entregada" ||
    estado === "entregado"
  )
    return "pagada";
  if (
    estado === 3 ||
    estado === "3" ||
    estado === "rechazada" ||
    estado === "rechazado"
  )
    return "rechazada";
  return String(estado ?? "");
};

export const formatCurrency = (amount: any) =>
  (Number(amount) || 0).toLocaleString("de-DE");

export function filtrarAnticipos({
  viewMode,
  filter,
  solicitudes,
  pagos,
}: {
  viewMode: VistaAnticipos;
  filter: FiltroAnticipos;
  solicitudes: Anticipo[];
  pagos: Anticipo[];
}): any[] {
  if (viewMode === "solicitudes") {
    return solicitudes.filter((s) => {
      const estado = normalizeEstado(s.estado);
      if (filter === "pendiente") return estado === "pendiente";
      if (filter === "aprobado") return estado === "confirmada";
      if (filter === "rechazado") return estado === "rechazada";
      return true;
    });
  }
  return pagos.filter(
    (p) => normalizeEstado((p as any).estado) === "pagada",
  );
}

export function calcularTotales(
  solicitudes: Anticipo[],
  pagos: Anticipo[],
) {
  const totalPendiente = solicitudes
    .filter((a) => normalizeEstado(a.estado) === "pendiente")
    .reduce((sum, a) => sum + Number(a.monto), 0);
  const totalEnCaja = solicitudes
    .filter((a) => normalizeEstado(a.estado) === "confirmada")
    .reduce((sum, a) => sum + Number(a.monto), 0);
  const totalPagado = pagos
    .filter((p) => normalizeEstado((p as any).estado) === "pagada")
    .reduce((sum, a) => sum + Number(a.monto), 0);
  return { totalPendiente, totalEnCaja, totalPagado };
}
