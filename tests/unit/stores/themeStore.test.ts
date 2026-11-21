import { DEFAULT_ACCENT_COLOR, useThemeStore } from '@/store/themeStore';
import { beforeEach, describe, expect, it } from 'vitest';

describe('themeStore', () => {
    beforeEach(() => {
        useThemeStore.setState({ userColors: {} });
    });

    describe('getColor', () => {
        it('debe retornar color default si userId es undefined', () => {
            expect(useThemeStore.getState().getColor(undefined)).toBe(DEFAULT_ACCENT_COLOR);
        });

        it('debe retornar color default si userId es null', () => {
            expect(useThemeStore.getState().getColor(null as any)).toBe(DEFAULT_ACCENT_COLOR);
        });

        it('debe retornar color default si no hay color guardado', () => {
            expect(useThemeStore.getState().getColor('999')).toBe(DEFAULT_ACCENT_COLOR);
        });

        it('debe retornar el color guardado para un userId', () => {
            useThemeStore.setState({ userColors: { '1': '#C13BFF' } });
            expect(useThemeStore.getState().getColor('1')).toBe('#C13BFF');
        });

        it('debe aceptar userId como número', () => {
            useThemeStore.setState({ userColors: { '5': '#0095FF' } });
            expect(useThemeStore.getState().getColor(5)).toBe('#0095FF');
        });

        it('debe retornar default si userId es string vacío', () => {
            expect(useThemeStore.getState().getColor('')).toBe(DEFAULT_ACCENT_COLOR);
        });

        it('traduce un color de la paleta anterior a su versión neón', () => {
            useThemeStore.setState({ userColors: { '1': '#FF2D55' } });
            expect(useThemeStore.getState().getColor('1')).toBe('#FF1B3D');
        });

        it('traduce un color de la paleta original de Tailwind', () => {
            useThemeStore.setState({ userColors: { '1': '#7C3AED' } });
            expect(useThemeStore.getState().getColor('1')).toBe('#C13BFF');
        });
    });

    describe('setAccentColor', () => {
        it('debe guardar el color para un userId', () => {
            useThemeStore.getState().setAccentColor('1', '#00FFA6');
            expect(useThemeStore.getState().userColors['1']).toBe('#00FFA6');
        });

        it('no debe hacer nada si userId es undefined', () => {
            useThemeStore.getState().setAccentColor(undefined as any, '#00FFA6');
            expect(useThemeStore.getState().userColors).toEqual({});
        });

        it('no debe hacer nada si userId es null', () => {
            useThemeStore.getState().setAccentColor(null as any, '#00FFA6');
            expect(useThemeStore.getState().userColors).toEqual({});
        });

        it('debe permitir cambiar el color de un usuario existente', () => {
            useThemeStore.setState({ userColors: { '1': '#FF1B3D' } });
            useThemeStore.getState().setAccentColor('1', '#0095FF');
            expect(useThemeStore.getState().userColors['1']).toBe('#0095FF');
        });

        it('debe preservar colores de otros usuarios al agregar uno nuevo', () => {
            useThemeStore.setState({ userColors: { '1': '#FF1B3D' } });
            useThemeStore.getState().setAccentColor('2', '#C13BFF');
            expect(useThemeStore.getState().userColors['1']).toBe('#FF1B3D');
            expect(useThemeStore.getState().userColors['2']).toBe('#C13BFF');
        });
    });
});
