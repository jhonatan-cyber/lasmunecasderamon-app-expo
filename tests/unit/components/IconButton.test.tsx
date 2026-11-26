import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IconButton,
  MIN_TOUCH_TARGET,
  getIconButtonHitSlop,
} from '@/components/ui/IconButton';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));

afterEach(() => {
  cleanup();
});

const baseProps = {
  icon: 'add' as const,
  accessibilityLabel: 'Nuevo',
  onPress: vi.fn(),
  color: '#FFFFFF',
};

describe('IconButton', () => {
  it('se anuncia como botón con su acción y la ejecuta', () => {
    const onPress = vi.fn();

    render(<IconButton {...baseProps} onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Nuevo' });
    fireEvent.click(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renderiza el badge superpuesto', () => {
    render(<IconButton {...baseProps} badge={<span>3</span>} />);

    expect(screen.getByText('3')).toBeDefined();
  });

  it('respeta el estado deshabilitado', () => {
    render(<IconButton {...baseProps} disabled />);

    expect(screen.getByRole('button', { name: 'Nuevo' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('muestra y oculta la ayuda visual al pasar el puntero por el botón', () => {
    render(<IconButton {...baseProps} tooltip="Entregar cover" />);

    const button = screen.getByRole('button', { name: 'Nuevo' });
    fireEvent.mouseEnter(button);
    expect(screen.getByText('Entregar cover')).toBeDefined();

    fireEvent.mouseLeave(button);
    expect(screen.queryByText('Entregar cover')).toBeNull();
  });

  it('muestra la ayuda al mantener pulsado sin ejecutar la acción', () => {
    const onPress = vi.fn();
    render(<IconButton {...baseProps} onPress={onPress} tooltip="Entregar cover" />);

    const button = screen.getByRole('button', { name: 'Nuevo' });
    fireEvent.mouseDown(button);
    fireEvent.contextMenu(button);
    expect(screen.getByText('Entregar cover')).toBeDefined();

    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('garantiza 44pt efectivos cuando el círculo visual es menor', () => {
    expect(MIN_TOUCH_TARGET).toBe(44);
    expect(getIconButtonHitSlop(44)).toBe(0);
    expect(getIconButtonHitSlop(48)).toBe(0);
    expect(40 + getIconButtonHitSlop(40) * 2).toBeGreaterThanOrEqual(44);
    expect(38 + getIconButtonHitSlop(38) * 2).toBeGreaterThanOrEqual(44);
  });
});
