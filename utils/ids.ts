/**
 * Id local para trabajo encolado en el dispositivo (cola de sincronización y
 * cola de intenciones). Vive aparte de `services/offlineSync` para que quien
 * solo necesita generar un id no arrastre la conectividad.
 *
 * Antes era `Math.random().toString(36).substr(2, 9)` (con `substr`, deprecado)
 * y podía repetirse: el id viaja al servidor como clave de idempotencia, así
 * que tiene que ser único.
 */
export function createQueueId(random: () => number = Math.random): string {
    return `${Date.now().toString(36)}-${Math.floor(random() * 0xffffffff).toString(36)}`;
}
