import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore, THEME_OPTIONS } from '@/store/themeStore';

describe('themeStore', () => {
    beforeEach(() => {
        useThemeStore.setState({ userColors: {} });
    });

    describe('getColor', () => {
        it('debe retornar color default si userId es undefined', () => {
            expect(useThemeStore.getState().getColor(undefined)).toBe('#E11D48');
        });

        it('debe retornar color default si userId es null', () => {
            expect(useThemeStore.getState().getColor(null as any)).toBe('#E11D48');
        });

        it('debe retornar color default si no hay color guardado', () => {
            expect(useThemeStore.getState().getColor('999')).toBe('#E11D48');
        });

        it('debe retornar el color guardado para un userId', () => {
            useThemeStore.setState({ userColors: { '1': '#7C3AED' } });
            expect(useThemeStore.getState().getColor('1')).toBe('#7C3AED');
        });

        it('debe aceptar userId como número', () => {
            useThemeStore.setState({ userColors: { '5': '#2563EB' } });
            expect(useThemeStore.getState().getColor(5)).toBe('#2563EB');
        });

        it('debe retornar default si userId es string vacío', () => {
            expect(useThemeStore.getState().getColor('')).toBe('#E11D48');
        });
    });

    describe('getGradient', () => {
        it('debe retornar el gradient del color default si no hay userId', () => {
            const gradient = useThemeStore.getState().getGradient(undefined);
            expect(gradient).toEqual(['#E11D48', '#BE123C', '#9F1239']);
        });

        it('debe retornar el gradient del color asignado al usuario', () => {
            useThemeStore.setState({ userColors: { '2': '#7C3AED' } });
            const gradient = useThemeStore.getState().getGradient('2');
            expect(gradient).toEqual(['#7C3AED', '#6D28D9', '#5B21B6']);
        });

        it('debe retornar gradient default para userId sin color asignado', () => {
            const gradient = useThemeStore.getState().getGradient('non-existent');
            expect(gradient).toEqual(['#E11D48', '#BE123C', '#9F1239']);
        });
    });

    describe('setAccentColor', () => {
        it('debe guardar el color para un userId', () => {
            useThemeStore.getState().setAccentColor('1', '#059669');
            expect(useThemeStore.getState().userColors['1']).toBe('#059669');
        });

        it('no debe hacer nada si userId es undefined', () => {
            useThemeStore.getState().setAccentColor(undefined as any, '#059669');
            expect(useThemeStore.getState().userColors).toEqual({});
        });

        it('no debe hacer nada si userId es null', () => {
            useThemeStore.getState().setAccentColor(null as any, '#059669');
            expect(useThemeStore.getState().userColors).toEqual({});
        });

        it('debe permitir cambiar el color de un usuario existente', () => {
            useThemeStore.setState({ userColors: { '1': '#E11D48' } });
            useThemeStore.getState().setAccentColor('1', '#2563EB');
            expect(useThemeStore.getState().userColors['1']).toBe('#2563EB');
        });

        it('debe preservar colores de otros usuarios al agregar uno nuevo', () => {
            useThemeStore.setState({ userColors: { '1': '#E11D48' } });
            useThemeStore.getState().setAccentColor('2', '#7C3AED');
            expect(useThemeStore.getState().userColors['1']).toBe('#E11D48');
            expect(useThemeStore.getState().userColors['2']).toBe('#7C3AED');
        });
    });
});
