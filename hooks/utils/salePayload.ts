/**
 * Payload de `POST /sales` armado de forma pura.
 *
 * Vive fuera del hook porque ahora hay dos caminos que lo necesitan: la venta
 * que se manda en el momento y la que se encola sin red. Tenerlo en un solo
 * lugar evita que el offline y el online se desincronicen (paridad con el
 * payload del dashboard: consume stock en el bar, vende por botella por
 * defecto como `mapForSaleToCartItem` y marca `tipo_venta`/`shot_anfitriona`
 * en los detalles, que es como `SaleService` guarda cómo se vendió).
 */
export interface SalePayloadInput {
    cart: any[];
    selectedCliente: any;
    selectedHabitacion: any;
    metodoPago: string;
    pagosMixtos: unknown[];
    totals: { subtotal: number; tip: number; total: number };
    selectedTime: number;
    hasCommissionItem: boolean;
}

export interface SaleCreatePayload {
    detalles: {
        producto_id: string | number;
        presentacion_id: string | number | null;
        tipo_venta?: 'botella' | 'shot';
        /** Solo en líneas de shot: true cuando se cobró al precio de anfitriona. */
        shot_anfitriona?: boolean;
        cantidad: number;
        precio: number;
        sub_total: number;
        comision: number;
        hostesses: (string | number)[];
    }[];
    cliente_id: string | null;
    habitacion_id: string | number | null;
    metodo_pago: string;
    pagos_mixtos?: unknown[];
    propina: number;
    sub_total: number;
    total: number;
    tiempo: number;
    usuarios: (string | number)[];
}

const idDe = (valor: any): string | number | null =>
    valor?.id_usuario ?? valor?.id ?? valor?.id_cliente ?? null;

export function buildSalePayload(input: SalePayloadInput): SaleCreatePayload {
    const {
        cart,
        selectedCliente,
        selectedHabitacion,
        metodoPago,
        pagosMixtos,
        totals,
        selectedTime,
        hasCommissionItem,
    } = input;

    return {
        detalles: cart.map(item => {
            const cantidad = item.quantity || item.cantidad || 1;
            // Cómo se vendió queda en el detalle (espejo del dashboard): un shot
            // puede ser a precio de cliente o de anfitriona y no se deduce después.
            const esShot = item.tipo_venta === 'shot';

            return {
                producto_id: item.producto_id || item.id_producto || item.id,
                presentacion_id: item.presentacion_id || null,
                tipo_venta: esShot
                    ? ('shot' as const)
                    : item.presentacion_id
                      ? ('botella' as const)
                      : undefined,
                shot_anfitriona: esShot ? Boolean(item.shot_anfitriona) : undefined,
                cantidad,
                precio: item.precio || item.price || 0,
                sub_total: (item.precio || item.price || 0) * cantidad,
                comision: Number(item.comision || item.commission || 0) * cantidad,
                hostesses: (item.anfitrionas || [])
                    .map((a: any) => (typeof a === 'object' ? idDe(a) : a))
                    .filter((id: string | number | null): id is string | number => id !== null),
            };
        }),
        cliente_id: (selectedCliente?.id?.toString() ||
            selectedCliente?.id_cliente?.toString() ||
            null) as string | null,
        habitacion_id: hasCommissionItem
            ? selectedHabitacion?.id || selectedHabitacion?.id_habitacion || null
            : null,
        metodo_pago: metodoPago,
        pagos_mixtos: metodoPago === 'mixto' ? pagosMixtos : undefined,
        propina: totals.tip,
        sub_total: totals.subtotal,
        total: totals.total,
        tiempo: selectedHabitacion ? selectedTime : 0,
        usuarios: cart
            .flatMap(item =>
                (item.anfitrionas || []).map((a: any) => (typeof a === 'object' ? idDe(a) : a))
            )
            .filter((id: string | number | null): id is string | number => id !== null),
    };
}

/**
 * Etiqueta corta para la pantalla de pendientes: el cajero tiene que reconocer
 * la operación de un vistazo, así que lleva el total y los ítems.
 */
export function describeSale(label: {
    total?: number;
    items?: number;
    tipo?: 'venta' | 'consumo';
}): string {
    const prefijo = label.tipo === 'consumo' ? 'Consumos' : 'Venta';
    const partes = [`${prefijo} $${Number(label.total ?? 0).toLocaleString('es-CL')}`];
    if (label.items) partes.push(`${label.items} ítem(s)`);
    return partes.join(' · ');
}
