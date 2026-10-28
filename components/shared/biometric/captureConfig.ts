import type { FaseCaptura } from '@/components/shared/biometric/deteccionGiro';

export type Phase = 'intro' | FaseCaptura | 'processing' | 'error';
export type EstadoDeteccion = 'buscando' | 'girando' | 'ok' | 'temporizado';
export type TipoError = 'deteccion' | 'captura' | 'enrolamiento';

export const PASOS: Record<FaseCaptura, { numero: number; titulo: string; ayuda: string }> = {
    front: {
        numero: 1,
        titulo: 'Mirá de frente',
        ayuda: 'Poné la cara dentro del círculo y mirá a la cámara.',
    },
    'turn-left': {
        numero: 2,
        titulo: 'Girá a la izquierda',
        ayuda: 'Girá la cabeza hacia tu izquierda y sostené la pose.',
    },
    'turn-right': {
        numero: 3,
        titulo: 'Girá a la derecha',
        ayuda: 'Girá la cabeza hacia tu derecha y sostené la pose.',
    },
};

export const ORDEN_PASOS: FaseCaptura[] = ['front', 'turn-left', 'turn-right'];

export const esFaseCaptura = (fase: Phase): fase is FaseCaptura =>
    ORDEN_PASOS.includes(fase as FaseCaptura);
