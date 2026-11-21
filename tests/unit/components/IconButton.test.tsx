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

  it('garantiza 44pt efectivos cuando el círculo visual es menor', () => {
    expect(MIN_TOUCH_TARGET).toBe(44);
    expect(getIconButtonHitSlop(44)).toBe(0);
    expect(getIconButtonHitSlop(48)).toBe(0);
    expect(40 + getIconButtonHitSlop(40) * 2).toBeGreaterThanOrEqual(44);
    expect(38 + getIconButtonHitSlop(38) * 2).toBeGreaterThanOrEqual(44);
  });
});
