/**
 * Tipos del módulo de caja.
 *
 * El servidor manda campos adicionales según el turno (corte, prepago, etc.),
 * por eso se conserva un índice abierto: el código puede leer los campos
 * conocidos con tipos seguros sin perder los nuevos.
 */
export interface CajaInfo {
    id_caja?: string | number;
    fecha_apertura?: string;
    monto_apertura?: number;
    usuario_id_apertura?: string | number;
    [key: string]: unknown;
}

export interface CajaStats {
    balance_total?: number;
    total_ventas?: number;
    cantidad_ventas?: number;
    total_servicios?: number;
    cantidad_servicios?: number;
    /** Cargas de saldo prepago hechas durante el turno. */
    prepago_cargado?: number;
    prepago?: number;
    saldo_clientes_pendiente?: number;
    total_efectivo?: number;
    efectivo_en_caja?: number;
    total_tarjeta?: number;
    total_transferencia?: number;
    total_iva?: number;
    total_comisiones?: number;
    total_propina?: number;
    total_anticipo?: number;
    total_devoluciones?: number;
    monto_apertura?: number;
    /** Monto con que se cerraría descontando saldos prepago de clientes. */
    monto_cierre_previsto?: number;
    prepago_pendiente_clientes?: number;
    cierre_pendiente?: boolean;
    cierre_estancado?: boolean;
    [key: string]: unknown;
}

export interface CajaStatusData {
    hasOpenCaja: boolean;
    cajaInfo: CajaInfo | null;
}
