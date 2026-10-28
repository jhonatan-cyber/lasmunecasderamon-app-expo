const TYPE_LABELS: Record<string, string> = {
  comision: "Comisión",
  asistencia: "Asistencia",
  anticipo: "Anticipo",
  propina: "Propina",
  venta: "Venta",
  servicio: "Servicio",
  gratificacion: "Gratificación",
  hora_extra: "Hora Extra",
};

export function getEventLabel(item: any): string {
  if (!item) return "";
  if (item.type === "comision")
    return item.subType === "venta"
      ? "Comisión de Venta"
      : "Comisión de Servicio";
  if (item.type === "propina")
    return item.subType === "venta" ? "Propina de Venta" : "Propina";
  return TYPE_LABELS[item.type] || item.type.toUpperCase();
}

export function getStatusLabel(item: any): string {
  const status = Number(item?.estado);
  if (item?.type === "servicio")
    return (
      (
        {
          0: "Anulado",
          1: "Finalizado",
          2: "En proceso",
          3: "Pausado",
          4: "Solicitud anulación",
        } as Record<number, string>
      )[status] || "Desconocido"
    );
  if (item?.type === "comision")
    return status === 0 ? "Anulado" : status === 2 ? "Pagado" : "Por cobrar";
  if (item?.type === "anticipo") {
    if (status === 0) return "Pagado";
    if (status === 1) return "Confirmado";
    if (status === 2) return "Pendiente";
    if (status === 3) return "Rechazado";
  }
  if (status === 0) return "Pagado";
  if (status === 1) return "Por cobrar";
  if (status === 2) return "Confirmado";
  if (status === 3) return "Rechazado";
  if (status === 4) return "Completado";
  return String(item?.estado ?? "");
}

export function filterEventsByDates(events: any[], selectedDates: string[]) {
  if (selectedDates.length === 0) return [];
  return events
    .filter((e: any) => {
      const d = new Date(e.date);
      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      return selectedDates.includes(dateStr);
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}
