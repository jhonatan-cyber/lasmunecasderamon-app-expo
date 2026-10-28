import { describe, expect, it } from 'vitest';

import {
    UMBRAL_FRONTAL,
    UMBRAL_PERFIL,
    giroSuficiente,
    progresoGiro,
} from '@/components/shared/biometric/deteccionGiro';

// La detección se mide con `headEulerAngleY` de ML Kit. El signo no se exige
// porque el espejado de la cámara frontal cambia entre equipos; lo que importa
// es que la cara esté de frente o girada de verdad.
describe('giroSuficiente', () => {
    it('acepta mirar de frente dentro del margen', () => {
        expect(giroSuficiente('front', 0)).toBe(true);
        expect(giroSuficiente('front', UMBRAL_FRONTAL)).toBe(true);
        expect(giroSuficiente('front', -UMBRAL_FRONTAL)).toBe(true);
    });

    it('rechaza el paso frontal cuando la cara ya está girada', () => {
        expect(giroSuficiente('front', UMBRAL_FRONTAL + 3)).toBe(false);
        expect(giroSuficiente('front', -40)).toBe(false);
    });

    it('exige un giro claro en los perfiles, sin importar el lado', () => {
        expect(giroSuficiente('turn-left', UMBRAL_PERFIL)).toBe(true);
        expect(giroSuficiente('turn-left', -UMBRAL_PERFIL)).toBe(true);
        expect(giroSuficiente('turn-left', UMBRAL_PERFIL - 1)).toBe(false);
        expect(giroSuficiente('turn-right', 30)).toBe(true);
        expect(giroSuficiente('turn-right', 10)).toBe(false);
    });

    it('no acepta una medición ausente', () => {
        expect(giroSuficiente('front', null)).toBe(false);
        expect(giroSuficiente('turn-left', null)).toBe(false);
    });
});

describe('progresoGiro', () => {
    it('llena el anillo al mirar de frente', () => {
        expect(progresoGiro('front', 0)).toBe(1);
        expect(progresoGiro('front', UMBRAL_FRONTAL)).toBe(0);
        expect(progresoGiro('front', 30)).toBe(0);
    });

    it('llena el anillo a medida que gira el perfil', () => {
        expect(progresoGiro('turn-left', 0)).toBe(0);
        expect(progresoGiro('turn-left', UMBRAL_PERFIL / 2)).toBeCloseTo(0.5);
        expect(progresoGiro('turn-left', UMBRAL_PERFIL * 2)).toBe(1);
    });

    it('sin medición no hay progreso', () => {
        expect(progresoGiro('turn-right', null)).toBe(0);
    });
});
