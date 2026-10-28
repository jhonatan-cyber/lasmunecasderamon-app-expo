import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCajaAbiertaStore } from '@/store/cajaAbiertaStore';
import { eventBus } from '@/utils/eventBus';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';

/**
 * Estado compartido de "hay caja abierta".
 *
 * Se lee al entrar a la app y se vuelve a leer cuando la caja cambia:
 *
 * - abrir, retirar o cerrar caja emite `refresh_requests` (lo hace `useCaja` en
 *   cualquier pantalla de la app);
 * - el dashboard avisa el cierre por SSE (`cash_register_closed`).
 *
 * Mientras el estado es desconocido (`null`) no se bloquea nada: si el arranque
 * es sin red y sin espejo, bloquear dejando fuera a todo el personal sería peor
 * que no bloquear.
 */
export function useCajaAbierta() {
    const cajaAbierta = useCajaAbiertaStore((state) => state.cajaAbierta);
    const cajaInfo = useCajaAbiertaStore((state) => state.cajaInfo);
    const loading = useCajaAbiertaStore((state) => state.loading);
    const refresh = useCajaAbiertaStore((state) => state.refresh);
    const reset = useCajaAbiertaStore((state) => state.reset);
    const userId = useAuthStore((state) => state.user?.id ?? null);
    const usuarioAnterior = useRef<string | number | null>(null);

    // Primera lectura. Al cambiar de usuario se descarta lo leído: la caja que
    // estaba abierta pertenecía al turno de la sesión anterior.
    useEffect(() => {
        if (userId === null || usuarioAnterior.current === userId) return;
        usuarioAnterior.current = userId;
        reset();
        void refresh();
    }, [userId, refresh, reset]);

    // Cambios de caja mientras la app está abierta.
    useEffect(() => {
        const suscripciones = [
            eventBus.addListener(REALTIME_EVENT_NAMES.refreshRequests, () => {
                void refresh();
            }),
            eventBus.addListener(
                REALTIME_EVENT_NAMES.sseEvent,
                (payload: { type?: string } | undefined) => {
                    const tipo = payload?.type;
                    if (tipo === 'cash_register_closed' || tipo === 'cash_register_opened') {
                        void refresh();
                    }
                }
            ),
        ];

        return () => {
            suscripciones.forEach((suscripcion) => suscripcion.remove());
        };
    }, [refresh]);

    return {
        cajaAbierta,
        cajaInfo,
        loading,
        /** `true` solo cuando el servidor confirmó que NO hay caja abierta. */
        bloqueado: cajaAbierta === false,
        refresh,
    };
}
