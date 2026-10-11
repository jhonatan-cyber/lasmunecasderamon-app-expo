import { apiClientSafe } from '@/api/client';
import { httpDetailsOf } from '@/api/errors';
import type { Reconciliation } from './service';
import type { OutboxIntent } from './types';

/** Consulta de lectura: nunca repite una operación cuyo resultado sea incierto. */
export async function reconcileIntent(intent: OutboxIntent): Promise<Reconciliation> {
    try {
        const result = await apiClientSafe(`/sync-operations?id=${encodeURIComponent(intent.id)}`, { retries: 0 });
        if (!result?.success || !result.data) throw new Error('No se pudo consultar el estado de la operación.');
        const data = result.data as Reconciliation;
        if (!['not_found', 'aplicada', 'pendiente', 'rechazada', 'fallida'].includes(data.state)) {
            throw new Error('El servidor devolvió un estado de sincronización desconocido.');
        }
        return data;
    } catch (error) {
        // Compatibilidad mientras se publica el backend nuevo: reenviar conserva
        // siempre la misma clave y el servidor existente deduplica la escritura.
        if (httpDetailsOf(error)?.status === 404) return { state: 'not_found' };
        throw error;
    }
}
