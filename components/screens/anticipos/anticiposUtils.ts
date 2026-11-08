import type { Anticipo } from "@/hooks/useAnticipos";

export type FiltroAnticipos = "todos" | "pendiente" | "aprobado" | "rechazado" | "recibido";
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
  filter,
  solicitudes,
  pagos,
}: {
  viewMode?: VistaAnticipos;
  filter: FiltroAnticipos;
  solicitudes: Anticipo[];
  pagos: Anticipo[];
}): any[] {
  // Unifica ambas listas; los pagos (estado 0) no aparecen en solicitudes
  const todos = [
    ...solicitudes,
    // evitar duplicados: pagos que ya estén en solicitudes por id
    ...pagos.filter(
      (p) =>
        !solicitudes.some(
          (s) =>
            String((s as any).id_anticipo || s.id_solicitud) ===
            String((p as any).id_anticipo || p.id_solicitud),
        ),
    ),
  ];

  if (filter === "pendiente")
    return todos.filter((a) => normalizeEstado(a.estado) === "pendiente");
  if (filter === "aprobado")
    return todos.filter((a) => normalizeEstado(a.estado) === "confirmada");
  if (filter === "rechazado")
    return todos.filter((a) => normalizeEstado(a.estado) === "rechazada");
  if (filter === "recibido")
    return todos.filter((a) => normalizeEstado(a.estado) === "pagada");
  return todos;
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
