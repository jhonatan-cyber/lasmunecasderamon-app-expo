import type { EntradaCliente } from '@/services/entradas';

export interface ResumenEntradasTurno {
    total: number;
    cantidad: number;
}

/**
 * Entradas cobradas en el turno abierto.
 *
 * `/tickets` devuelve las entradas del día; se filtra por `caja_id` para que
 * todo el resumen de caja hable del mismo turno. Las anuladas a mano se
 * devolvieron, así que no cuentan. Las anuladas por cierre sí se postean en
 * caja, por eso se mantienen.
 */
export function resumenEntradasDelTurno(
    entradas: readonly EntradaCliente[] | null | undefined,
    idCaja: string | number | null | undefined
): ResumenEntradasTurno {
    if (!entradas || idCaja === null || idCaja === undefined || idCaja === '') {
        return { total: 0, cantidad: 0 };
    }

    const id = String(idCaja);
    const delTurno = entradas.filter(
        (entrada) =>
            entrada.caja_id === id &&
            !(entrada.cover_estado === 'anulada' && entrada.anulacion_origen === 'manual')
    );

    return {
        total: delTurno.reduce((suma, entrada) => suma + Number(entrada.monto_entrada || 0), 0),
        cantidad: delTurno.length,
    };
}
