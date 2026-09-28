/**
 * Payload de `POST /cuentas/:id/cobrar-con-venta` armado de forma pura.
 *
 * Vive fuera del hook porque el cobro, igual que la venta y los consumos, tiene
 * dos caminos: el que se manda en el momento y el que se encola sin red. El
 * cuerpo es chico a propósito —sólo lo que el cajero eligió en el modal— porque
 * el servidor arma la venta con las mismas filas que cierra: no viaja el carrito
 * guardado en el dispositivo, así que lo facturado siempre coincide con lo
 * cobrado.
 */
export interface CheckoutPayloadInput {
    cuentaId: string | number;
    metodoPago: string;
    /** Total de la cuenta sin propina (es lo que se le cobra a la cuenta). */
    subtotal: number;
    propina: number;
    habitacionId?: string | number | null;
}

export interface AccountCheckoutPayload {
    id_cuenta: string;
    metodo_pago: string;
    total_cobrado: number;
    propina: number;
    habitacion_id: string | null;
}

export function buildCheckoutPayload(input: CheckoutPayloadInput): AccountCheckoutPayload {
    return {
        id_cuenta: String(input.cuentaId),
        metodo_pago: input.metodoPago,
        total_cobrado: Number(input.subtotal || 0),
        propina: Number(input.propina || 0),
        habitacion_id: input.habitacionId != null ? String(input.habitacionId) : null,
    };
}

/**
 * Etiqueta corta para la pantalla de pendientes: el cajero tiene que reconocer
 * el cobro de un vistazo, por su código y por lo que pagó el cliente.
 */
export function describeCheckout(label: {
    codigo?: string | null;
    /** Total cobrado más propina. */
    total?: number;
}): string {
    const partes = [`Cobro $${Number(label.total ?? 0).toLocaleString('es-CL')}`];
    if (label.codigo) partes.push(String(label.codigo));
    return partes.join(' · ');
}
