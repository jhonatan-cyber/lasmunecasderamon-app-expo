import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSolicitudes } from '@/hooks/useSolicitudes';
import { connectivity } from '@/services/connectivity';
import { getMirror, MIRROR_KEYS, setMirrorForTests } from '@/services/mirror';
import { createMirrorRepository } from '@/services/mirror/repository';
import { ensureMirrorSchema } from '@/services/mirror/schema';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';

const { apiClientSafe, showToast } = vi.hoisted(() => ({
  apiClientSafe: vi.fn(),
  showToast: vi.fn(),
}));
vi.mock('@/utils/toast-lazy', () => ({ showToast }));

vi.mock('@/api/client', () => ({
  apiClientSafe,
  apiClient: vi.fn(),
  setTokenInMemory: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  setSessionConfirmedHandler: vi.fn(),
  notifySessionConfirmed: vi.fn(),
}));

const SOLICITUD = {
  id_solicitud: 's1',
  fecha_solicitud: '2026-09-28 10:00:00',
  tipo: 'servicio',
};

const respuestas: Record<string, unknown> = {
  '/solicitudes-servicios?estado=0': { success: true, data: [SOLICITUD] },
  '/orders': { success: true, data: [] },
  '/anticipos': { success: true, data: [] },
  '/caja/stats': { success: true, data: { cajas_abiertas: 1 } },
  '/anfitrionas': { success: true, data: [] },
};

const llamadasA = (url: string) =>
  vi.mocked(apiClientSafe).mock.calls.filter(([entrada]) => String(entrada).startsWith(url)).length;

const goOnline = () =>
  act(() => {
    connectivity.handleNetworkState({ isConnected: true, isInternetReachable: true });
  });

const goOffline = () =>
  act(() => {
    connectivity.handleNetworkState({ isConnected: false });
  });

let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;

beforeEach(async () => {
  vi.clearAllMocks();
  // El caché local de la pantalla vive en AsyncStorage y persiste entre tests
  // del mismo archivo: sin limpiarlo, un test heredaría la lista del anterior.
  await AsyncStorage.clear();
  driver = createNodeSqliteMirrorDriver();
  ensureMirrorSchema(driver, () => 1_700_000_000_000);
  setMirrorForTests(createMirrorRepository(driver));
  connectivity.handleNetworkState({});
  apiClientSafe.mockImplementation((url: string) => Promise.resolve(respuestas[url] ?? { success: true, data: [] }));
  showToast.mockClear();
});

afterEach(() => {
  setMirrorForTests(null);
  driver.close();
  connectivity.handleNetworkState({});
});

describe('useSolicitudes — sin red', () => {
  it('sirve la lista del turno guardada y marca la pantalla como offline', async () => {
    goOnline();
    const { result } = renderHook(() => useSolicitudes());

    await waitFor(() => expect(result.current.solicitudes).toHaveLength(1));
    expect(result.current.isOffline).toBe(false);

    goOffline();
    await act(async () => {
      await result.current.fetchSolicitudes();
    });

    // Sigue viendo lo del turno, pero ya sabe que viene del espejo.
    expect(result.current.solicitudes).toHaveLength(1);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(llamadasA('/solicitudes-servicios')).toBe(1);
  });

  it('sin red y sin nada guardado no inventa datos y no llega a llamar al servidor', async () => {
    goOffline();

    const { result } = renderHook(() => useSolicitudes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.solicitudes).toHaveLength(0);
    expect(result.current.isOffline).toBe(true);
    expect(llamadasA('/solicitudes-servicios')).toBe(0);
  });

  it('con red confirmada vuelve a pedir la lista al servidor', async () => {
    goOnline();
    const { result } = renderHook(() => useSolicitudes());
    await waitFor(() => expect(result.current.solicitudes).toHaveLength(1));

    await act(async () => {
      await result.current.fetchSolicitudes();
    });

    expect(llamadasA('/solicitudes-servicios')).toBe(2);
    expect(result.current.isOffline).toBe(false);
  });

  it('escribe en el espejo lo que sirve, para poder leerlo sin red', async () => {
    goOnline();
    const { result } = renderHook(() => useSolicitudes());
    await waitFor(() => expect(result.current.solicitudes).toHaveLength(1));

    const guardado = getMirror().get<{ items: unknown[] }>(MIRROR_KEYS.serviceRequests);
    expect(guardado?.data.items).toHaveLength(1);
  });
});
