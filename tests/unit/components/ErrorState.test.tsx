import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorState } from '@/components/ui/ErrorState';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => <span /> }));

vi.mock('@/hooks/useAccentColor', () => ({
    useAccentColor: () => ({
        isDark: false,
        cardBg: '#FFFFFF',
        textPrimary: '#111111',
        textSecondary: '#666666',
        accentColor: '#E11D48',
    }),
}));

vi.mock('@/components/ui/AnimatedView', () => ({
    AnimatedView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(() => {
    cleanup();
});

describe('ErrorState', () => {
    it('muestra el título, el mensaje y el botón de reintento', () => {
        render(
            <ErrorState
                title="No pudimos cargar los datos"
                message="Revisa la conexión e inténtalo de nuevo."
                onRetry={vi.fn()}
            />
        );

        expect(screen.getByText('No pudimos cargar los datos')).toBeTruthy();
        expect(screen.getByText('Revisa la conexión e inténtalo de nuevo.')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Reintentar' })
        ).toBeTruthy();
    });

    it('llama a onRetry una sola vez al presionar Reintentar', () => {
        const onRetry = vi.fn();
        render(<ErrorState title="Error" onRetry={onRetry} />);

        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('permite personalizar la etiqueta del botón', () => {
        render(<ErrorState title="Error" onRetry={vi.fn()} retryLabel="Recargar" />);

        expect(screen.getByRole('button', { name: 'Recargar' })).toBeTruthy();
    });

    it('no muestra botón si no hay onRetry', () => {
        render(<ErrorState title="Error" />);

        expect(screen.queryByRole('button')).toBeNull();
    });
});
