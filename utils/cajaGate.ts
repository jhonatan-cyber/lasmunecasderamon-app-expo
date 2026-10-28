export const RUTAS_QUE_REQUIEREN_CAJA = new Set([
    'pedidos',
    'productos',
    'solicitudes',
    'servicios',
    'entradas',
    'cortesias',
]);

export function rutaRequiereCajaAbierta(segmentos: readonly string[]): boolean {
    const ultimo = segmentos[segmentos.length - 1];
    return ultimo !== undefined && RUTAS_QUE_REQUIEREN_CAJA.has(ultimo);
}

export function rutaExigeCajaAbierta(ruta: string): boolean {
    return rutaRequiereCajaAbierta(ruta.split('/').filter(Boolean));
}
