const typeLabels: Record<string, string> = {
    comision: "Comisión",
    asistencia: "Asistencia",
    anticipo: "Anticipo",
    propina: "Propina",
    venta: "Venta",
    servicio: "Servicio",
    gratificacion: "Gratificación",
    hora_extra: "Hora Extra",
};

export const getEventLabel = (item: any) => {
    if (!item) return "";
    if (item.type === "comision") {
        if (item.subType === "venta") return "Comisión de Venta";
        if (item.subType === "servicio") return "Comisión de Servicio";
        return "Comisión";
    }
    if (item.type === "propina") {
        if (item.subType === "venta") return "Propina de Venta";
        return "Propina";
    }
    return typeLabels[item.type] || item.type.toUpperCase();
};

export const getEventStatusLabel = (item: any) => {
    if (typeof item === "string") return item;
    const status = typeof item === "object" ? Number(item?.estado) : Number(item);
    const type = typeof item === "object" ? item?.type : null;

    if (type === "anticipo") {
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
    return String(item ?? "");
};
