import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DiagnosticoScreen from '@/app/(app)/diagnostico';

// El setup global mockea `react-native` sólo con lo que usan los hooks; esta
// pantalla necesita además Pressable y ScrollView, y como el mock local reemplaza
// al global, se re-declara lo demás. Los estilos no se verifican acá: se verifica
// qué se muestra y qué responde al toque.
vi.mock('react-native', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    View: ({ children, style }: any) => <div data-style={JSON.stringify(style)}>{children}</div>,
    Text: ({ children, selectable }: any) => <span data-selectable={String(Boolean(selectable))}>{children}</span>,
    Pressable: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
    ScrollView: ({ children }: any) => <div>{children}</div>,
    Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
    useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
    useColorScheme: () => 'dark',
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({
    default: ({ name }: any) => <span>{name}</span>,
}));

vi.mock('@/components/ui/PremiumHeader', () => ({
    PremiumHeader: ({ title, subtitle }: any) => (
        <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </div>
    ),
}));

vi.mock('@/hooks/useAccentColor', () => ({
    useAccentColor: () => ({
        accentColor: '#2563EB',
        bg: '#FFFFFF',
        cardBg: '#FFFFFF',
        borderColor: '#E5E7EB',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        isDark: false,
    }),
}));

vi.mock('@/hooks/useConnectivity', () => ({
    useConnectivity: () => ({ state: 'offline', isOffline: true, isOnline: false, isUnknown: false }),
}));

// El reporte fijo que la pantalla renderiza; el recolector con SQL real se prueba
// en tests/unit/services/diagnostics.test.ts.
vi.mock('@/services/diagnostics', () => ({
    PREVIEW_MAX_CHARS: 400,
    collectOfflineDiagnostics: () => ({
        collectedAt: 1_800_000_000_000,
        db: {
            name: 'mirror.db',
            available: true,
            error: null,
            appliedSchemaVersion: 2,
            expectedSchemaVersion: 2,
            tables: ['mirror_cache', 'outbox'],
        },
        mirror: {
            count: 1,
            rows: [
                {
                    key: 'cuentas.abiertas',
                    syncedAt: 1_799_999_820_000,
                    ageMs: 180_000,
                    source: '/cuentas',
                    bytes: 18,
                    preview: '[{"id":"c-1"}]',
                },
            ],
        },
        outbox: {
            total: 1,
            unresolved: 1,
            rows: [
                {
                    id: 'intencion-cajero-1',
                    type: 'sale.create',
                    label: 'Venta $100 · 1 ítem(s)',
                    status: 'pendiente',
                    attempts: 1,
                    createdAt: 1_799_999_700_000,
                    updatedAt: 1_799_999_700_000,
                    lastError: null,
                    deviceDate: '2026-09-28T22:10:00.000Z',
                    payloadPreview: '{"total":100,"metodo_pago":"efectivo"}',
                },
            ],
        },
    }),
}));

afterEach(() => {
    cleanup();
    (globalThis as Record<string, unknown>).__DEV__ = true;
});

describe('pantalla de diagnóstico offline', () => {
    it('muestra la base, el espejo y la cola leídos del dispositivo', () => {
        render(<DiagnosticoScreen />);

        expect(screen.getByText('Diagnóstico offline')).toBeDefined();

        // Base y tablas reales: es la prueba de que habla con SQLite.
        expect(screen.getByText(/tablas: mirror_cache, outbox/)).toBeDefined();
        expect(screen.getByText(/esquema aplicado/)).toBeDefined();

        // Filas del espejo con su antigüedad y origen.
        expect(screen.getByText('cuentas.abiertas')).toBeDefined();
        expect(screen.getByText(/hace 3 min/)).toBeDefined();
        expect(screen.getByText(/origen \/cuentas/)).toBeDefined();

        // Filas de la cola con su estado y cuántos intentos lleva.
        expect(screen.getByText('Venta $100 · 1 ítem(s)')).toBeDefined();
        expect(screen.getByText('PENDIENTE')).toBeDefined();
        expect(screen.getByText(/sale\.create.*1 intento\(s\)/)).toBeDefined();
        expect(screen.getByText('intencion-cajero-1')).toBeDefined();
    });

    it('oculta el payload hasta que se toca la fila', () => {
        render(<DiagnosticoScreen />);

        expect(screen.queryByText(/"metodo_pago"/)).toBeNull();

        fireEvent.click(screen.getByText('cuentas.abiertas'));

        expect(screen.getByText('[{"id":"c-1"}]')).toBeDefined();
    });

    it('no expone ningún dato fuera de desarrollo', () => {
        (globalThis as Record<string, unknown>).__DEV__ = false;

        render(<DiagnosticoScreen />);

        expect(screen.getByText('Diagnóstico no disponible')).toBeDefined();
        expect(screen.queryByText('cuentas.abiertas')).toBeNull();
        expect(screen.queryByText('intencion-cajero-1')).toBeNull();
    });
});
