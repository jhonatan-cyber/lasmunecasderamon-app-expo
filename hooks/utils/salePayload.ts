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
        isChampagne: boolean;
        cantidad: number;
        precio: number;
        sub_total: number;
        comision: number;
        hostess_id?: string;
        hostesses?: string[];
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

            const hasCommission = Number(item.comision || item.commission || 0) > 0;
            const hostesses: string[] = (hasCommission ? item.anfitrionas || [] : [])
                .map((a: any) => (typeof a === 'object' ? idDe(a) : a))
                .filter((id: string | number | null): id is string | number => id !== null)
                .map(String);
            const categoria = String(item.categoria || item.category_name || item.category || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            const isChampagne = Boolean(item.isChampagne) ||
                categoria.includes('champagne') || categoria.includes('champana') || categoria.includes('shampana');
            const detalle = {
                producto_id: String(item.producto_id || item.id_producto || item.id),
                presentacion_id: item.presentacion_id ? String(item.presentacion_id) : null,
                tipo_venta: esShot
                    ? ('shot' as const)
                    : item.presentacion_id
                      ? ('botella' as const)
                      : undefined,
                shot_anfitriona: esShot ? Boolean(item.shot_anfitriona) : undefined,
                isChampagne,
                cantidad,
                precio: item.precio || item.price || 0,
                sub_total: (item.precio || item.price || 0) * cantidad,
                comision: hostesses.length > 0 ? Number(item.comision || item.commission || 0) * cantidad : 0,
            };
            if (hostesses.length === 0) return detalle;
            if (isChampagne || hostesses.length > 1) return { ...detalle, hostesses };
            return { ...detalle, hostess_id: hostesses[0] };
        }),
        cliente_id: (selectedCliente?.id?.toString() ||
            selectedCliente?.id_cliente?.toString() ||
            null) as string | null,
        habitacion_id: hasCommissionItem
            ? String(selectedHabitacion?.id ?? selectedHabitacion?.id_habitacion ?? '') || null
            : null,
        metodo_pago: metodoPago,
        pagos_mixtos: metodoPago === 'mixto' ? pagosMixtos : undefined,
        propina: totals.tip,
        sub_total: totals.subtotal,
        total: totals.total,
        tiempo: selectedHabitacion ? selectedTime : 0,
        usuarios: Array.from(new Set(cart
            .filter(item => Number(item.comision || item.commission || 0) > 0)
            .flatMap(item =>
                (item.anfitrionas || []).map((a: any) => (typeof a === 'object' ? idDe(a) : a))
            )
            .filter((id: string | number | null): id is string | number => id !== null)
            .map(String))),
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
