import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setMirrorForTests } from '@/services/mirror';
import { createMirrorRepository } from '@/services/mirror/repository';
import { ensureMirrorSchema } from '@/services/mirror/schema';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';
import { useMisPedidos } from '@/hooks/useMisPedidos';

vi.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    React.useEffect(callback, [callback]);
  },
}));

const apiClientSafe = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>();
  return { ...actual, apiClientSafe };
});
vi.mock('@/utils/toast-lazy', () => ({ showToast: vi.fn() }));

const PEDIDOS = [
  {
    id: 10,
    codigo: 'P-10',
    cliente_nombre: 'Ana',
    mesero_nombre: 'Luis',
    nicks: 'Sofía, Camila',
    subtotal: 10000,
    total: 11000,
    estado: 1,
    fecha_crea: '2026-11-20T10:00:00Z',
  },
  {
    id_pedido: 11,
    codigo: 'P-11',
    cliente_nombre: 'Beto',
    mesero_nombre: 'Luis',
    subtotal: 5000,
    total: 5000,
    estado: 0,
    fecha_crea: '2026-11-20T11:00:00Z',
  },
];

describe('useMisPedidos · listado del garzón', () => {
  let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;
  let online: boolean;

  beforeEach(() => {
    driver = createNodeSqliteMirrorDriver();
    ensureMirrorSchema(driver, () => 1_700_000_000_000);
    online = true;
    setMirrorForTests(createMirrorRepository(driver, { isOffline: () => !online }));
    apiClientSafe.mockReset();
    apiClientSafe.mockResolvedValue({ success: true, data: PEDIDOS });
  });

  afterEach(() => {
    setMirrorForTests(null);
    driver.close();
  });

  it('normaliza los pedidos que devuelve /orders/user', async () => {
    const { result } = renderHook(() => useMisPedidos());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(apiClientSafe).toHaveBeenCalledWith('/orders/user', expect.any(Object));
    expect(result.current.pedidos).toHaveLength(2);
    expect(result.current.pedidos[0]).toMatchObject({
      id: '10',
      id_pedido: '10',
      codigo: 'P-10',
      cliente_nombre: 'Ana',
      total: 11000,
      estado: 1,
    });
    expect(result.current.pedidos[1].id_pedido).toBe('11');
    expect(result.current.error).toBe('');
    expect(result.current.fromCache).toBe(false);
  });

  it('sigue mostrando los pedidos guardados cuando se corta la red', async () => {
    const primero = renderHook(() => useMisPedidos());
    await waitFor(() => expect(primero.result.current.loading).toBe(false));
    primero.unmount();

    online = false;
    apiClientSafe.mockRejectedValue(new Error('Network request failed'));

    const { result } = renderHook(() => useMisPedidos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fromCache).toBe(true);
    expect(result.current.pedidos.map((pedido) => pedido.codigo)).toEqual(['P-10', 'P-11']);
    expect(result.current.error).toBe('');
  });
});
