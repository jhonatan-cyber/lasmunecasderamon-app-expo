import { describe, expect, it } from 'vitest';

import { computeResponsiveMetrics, isTabletSize, TABLET_MIN_WIDTH } from '@/utils/responsive';

describe('isTabletSize', () => {
    it('es la regla única: se decide por el lado corto', () => {
        expect(isTabletSize(375, 812)).toBe(false);
        // Móvil en horizontal: ancho > 768 pero lado corto < 768.
        expect(isTabletSize(844, 390)).toBe(false);
        expect(isTabletSize(TABLET_MIN_WIDTH, 1024)).toBe(true);
        // Tablet girada: conserva la clasificación.
        expect(isTabletSize(1024, TABLET_MIN_WIDTH)).toBe(true);
    });
});

describe('computeResponsiveMetrics', () => {
    it('usa la escala base en un móvil de 375 px', () => {
        const metrics = computeResponsiveMetrics(375, 812);

        expect(metrics.isTablet).toBe(false);
        expect(metrics.isPhone).toBe(true);
        expect(metrics.isLandscape).toBe(false);
        expect(metrics.spacing.md).toBe(16);
        expect(metrics.fontSize.sm).toBe(14);
    });

    it('activa el modo tablet desde 768 px', () => {
        const metrics = computeResponsiveMetrics(768, 1024);

        expect(metrics.isTablet).toBe(true);
        expect(metrics.isPhone).toBe(false);
        expect(metrics.spacing.md).toBe(18);
        expect(metrics.iconSize.md).toBeGreaterThan(computeResponsiveMetrics(375, 812).iconSize.md);
    });

    it('limita la escala en móviles muy angostos o muy anchos', () => {
        const narrow = computeResponsiveMetrics(320, 568);
        const wide = computeResponsiveMetrics(460, 932);

        // 320/375 = 0.85 se eleva al mínimo de 0.9 → 16 * 0.9 = 14.4 ≈ 14
        expect(narrow.spacing.md).toBe(14);
        // 460/375 = 1.23 se baja al máximo de 1.15 → 16 * 1.15 = 18.4 ≈ 18
        expect(wide.spacing.md).toBe(18);
    });

    it('detecta la orientación horizontal', () => {
        const landscapePhone = computeResponsiveMetrics(844, 390);

        expect(landscapePhone.isLandscape).toBe(true);
        // Un móvil girado no debe convertirse en tablet ni cambiar su densidad.
        expect(landscapePhone.isTablet).toBe(false);
        expect(landscapePhone.spacing.md).toBe(computeResponsiveMetrics(390, 844).spacing.md);
    });

    it('mantiene la densidad de tablet al girar', () => {
        const portrait = computeResponsiveMetrics(768, 1024);
        const landscape = computeResponsiveMetrics(1024, 768);

        expect(portrait.isTablet).toBe(true);
        expect(landscape.isTablet).toBe(true);
        expect(portrait.spacing.md).toBe(landscape.spacing.md);
    });
});
