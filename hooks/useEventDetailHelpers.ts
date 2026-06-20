const formatAmount = (value: any) =>
    Number(value || 0).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function useEventDetailHelpers() {
    const getAccionLabel = (accion: string) => {
        const labels: Record<string, string> = {
            solicitud: 'Solicitado',
            aprobado: 'Aprobado por admin',
            rechazado: 'Rechazado',
            entregado: 'Entregado',
            anulado: 'Anulado',
            pendiente: 'Pendiente',
            actualizado: 'Actualizado',
        };
        return labels[accion] || accion;
    };

    const getIconName = (type: string) => {
        switch (type) {
            case 'venta': return 'cart';
            case 'propina': return 'heart';
            case 'comision': return 'star';
            case 'asistencia': return 'calendar';
            case 'servicio': return 'time';
            default: return 'cash';
        }
    };

    return { formatAmount, getAccionLabel, getIconName };
}
