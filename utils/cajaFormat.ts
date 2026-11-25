import { formatCurrency } from '@/utils/format';

/** Monto para mostrar en pantalla, siempre con el formato `es-CL` del local. */
export const formatearMonto = (valor: number | string | null | undefined): string =>
    formatCurrency(valor ?? 0);

/** Quita los separadores de miles del input y devuelve un número. */
export const parseMonto = (montoFormateado: string): number => {
    const limpio = montoFormateado.replace(/\./g, '');
    return limpio === '' ? 0 : Number(limpio);
};

/** Deja solo dígitos y agrupa de miles mientras el cajero escribe. */
export const formatearInputMonto = (texto: string): string => {
    const limpio = texto.replace(/\D/g, '').slice(0, 12);
    return limpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const fechaValida = (valor?: string | null): Date | null => {
    if (!valor) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
};

/**
 * Hora de apertura en la zona horaria del dispositivo.
 *
 * Antes se forzaba `timeZone: 'UTC'`, que mostraba una hora distinta de la
 * local en Chile (el local opera en `America/Santiago`).
 */
export const formatearHoraApertura = (valor?: string | null): string => {
    const fecha = fechaValida(valor);
    return fecha
        ? fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
        : '—';
};

export const formatearFechaApertura = (valor?: string | null): string => {
    const fecha = fechaValida(valor);
    return fecha
        ? fecha.toLocaleString('es-CL', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '—';
};
