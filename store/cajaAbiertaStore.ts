import { create } from 'zustand';
import { cajaService } from '@/services';
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS } from '@/services/mirror';
import logger from '@/utils/logger';

export interface CajaAbiertaInfo {
    id_caja?: string;
    [key: string]: unknown;
}

type EstadoCajaRes = {
    success?: boolean;
    data?: {
        hasOpenCaja?: boolean;
        cajaInfo?: CajaAbiertaInfo | null;
    } | null;
};

export interface CajaAbiertaState {
    cajaAbierta: boolean | null;
    cajaInfo: CajaAbiertaInfo | null;
    loading: boolean;
    updatedAt: number | null;
    setEstado: (abierta: boolean, info: CajaAbiertaInfo | null) => void;
    reset: () => void;
    refresh: () => Promise<boolean>;
}

let consultaEnCurso: Promise<boolean> | null = null;

export const useCajaAbiertaStore = create<CajaAbiertaState>((set) => ({
    cajaAbierta: null,
    cajaInfo: null,
    loading: false,
    updatedAt: null,

    setEstado: (abierta, info) =>
        set({
            cajaAbierta: abierta,
            cajaInfo: abierta ? info : null,
            updatedAt: Date.now(),
        }),

    reset: () => set({ cajaAbierta: null, cajaInfo: null, loading: false, updatedAt: null }),

    refresh: () => {
        if (consultaEnCurso) return consultaEnCurso;

        set({ loading: true });

        const consulta = (async () => {
            try {
                const result = await getMirror().readThroughDetailed<EstadoCajaRes>(
                    MIRROR_KEYS.cashregisterStatus,
                    () => cajaService.status() as unknown as Promise<EstadoCajaRes>,
                    { maxAgeMs: MIRROR_MAX_AGE_MS.dinero }
                );
                const payload = result.data?.data;
                const abierta = Boolean(result.data?.success && payload?.hasOpenCaja);

                set({
                    cajaAbierta: abierta,
                    cajaInfo: abierta ? (payload?.cajaInfo ?? null) : null,
                    loading: false,
                    updatedAt: Date.now(),
                });
                return abierta;
            } catch (error) {
                logger.warn('Caja: no se pudo leer el estado; se mantiene el último conocido', {
                    error,
                });
                set({ loading: false });
                return false;
            } finally {
                consultaEnCurso = null;
            }
        })();

        consultaEnCurso = consulta;
        return consulta;
    },
}));
