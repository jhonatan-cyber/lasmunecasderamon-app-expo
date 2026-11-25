import { describe, expect, it } from 'vitest';
import {
    formatearFechaApertura,
    formatearHoraApertura,
    formatearInputMonto,
    formatearMonto,
    parseMonto
} from '@/utils/cajaFormat';

describe('utilidades de formato de caja', () => {
    it('convierte el monto formateado del input a número', () => {
        expect(parseMonto('1.234.567')).toBe(1234567);
        expect(parseMonto('0')).toBe(0);
        expect(parseMonto('')).toBe(0);
    });

    it('deja solo dígitos y agrupa de miles al escribir', () => {
        expect(formatearInputMonto('abc1234')).toBe('1.234');
        expect(formatearInputMonto('12.345')).toBe('12.345');
        expect(formatearInputMonto('123456789012345')).toBe('123.456.789.012');
    });

    it('muestra montos con el formato es-CL del local', () => {
        expect(formatearMonto(1234)).toBe('$1.234');
        expect(formatearMonto(undefined)).toBe('$0');
    });

    it('no muestra fechas inválidas', () => {
        expect(formatearHoraApertura(null)).toBe('—');
        expect(formatearFechaApertura('no-es-fecha')).toBe('—');
    });

    it('usa la hora local del dispositivo, sin forzar UTC', () => {
        const fecha = new Date('2026-11-24T10:30:00-03:00');
        const esperado = fecha.toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
        });
        expect(formatearHoraApertura(fecha.toISOString())).toBe(esperado);
    });
});
