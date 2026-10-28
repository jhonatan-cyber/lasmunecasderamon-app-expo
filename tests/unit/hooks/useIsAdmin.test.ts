import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuthStore } from '@/store/authStore';

describe('useIsAdmin — rol de la sesión persistida', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('es true cuando el usuario autenticado tiene rol administrador', () => {
    useAuthStore.setState({ user: { id: 1, role: 'administrador' } as any });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current).toBe(true);
  });

  it('es false para un rol no administrador', () => {
    useAuthStore.setState({ user: { id: 2, role: 'cajero' } as any });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current).toBe(false);
  });

  it('es false sin sesión activa', () => {
    useAuthStore.setState({ user: null });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current).toBe(false);
  });
});
