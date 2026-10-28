import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClientSafe } from '@/api/client';
import { attachHttpDetails } from '@/api/errors';
import { useConfiguracionAsistencia } from '@/hooks/useConfiguracionAsistencia';

const configResponse = {
  success: true,
  data: {
    asistencia: {
      asistencia_hora_inicio: '20',
      asistencia_minuto_inicio: '30',
      asistencia_hora_fin: '23',
      asistencia_minuto_fin: '0',
    },
  },
};

const dispositivos = [
  {
    id: 'd1',
    nombre: 'Entrada del local',
    ultimo_uso: '2026-01-01T00:00:00Z',
    expira_en: '2026-02-01T00:00:00Z',
    revocado_en: null,
    activo: true,
  },
];

type Handler = (options?: any) => any;

/** Enruta cada llamada del `apiClientSafe` mockeado por método + endpoint. */
const mockApi = (handlers: Record<string, Handler>) => {
  (apiClientSafe as any).mockImplementation(async (url: string, options?: any) => {
    const key = `${options?.method ?? 'GET'} ${url}`;
    const handler = handlers[key];
    if (!handler) throw new Error(`Sin handler para ${key}`);
    return handler(options);
  });
};

describe('useConfiguracionAsistencia — capa de datos de la vista admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga la ventana desde /configurations y las pantallas desde /kiosk/devices', async () => {
    mockApi({
      'GET /configurations': () => configResponse,
      'GET /kiosk/devices': () => ({ success: true, data: dispositivos }),
    });

    const { result } = renderHook(() => useConfiguracionAsistencia());

    await waitFor(() => expect(result.current.loadingVentana).toBe(false));
    await waitFor(() => expect(result.current.loadingPantallas).toBe(false));

    expect(result.current.ventana).toEqual({
      asistencia_hora_inicio: 20,
      asistencia_minuto_inicio: 30,
      asistencia_hora_fin: 23,
      asistencia_minuto_fin: 0,
    });
    expect(result.current.valida).toBe(true);
    expect(result.current.sucio).toBe(false);
    expect(result.current.allowed).toBe(true);
    expect(result.current.pantallas).toHaveLength(1);
    expect(result.current.pantallas[0].nombre).toBe('Entrada del local');
  });

  it('marca allowed=false cuando el servidor responde 403 (rol no autorizado)', async () => {
    const forbidden = attachHttpDetails(new Error('Sin permiso'), { status: 403, body: {} });
    mockApi({
      'GET /configurations': () => configResponse,
      'GET /kiosk/devices': () => {
        throw forbidden;
      },
    });

    const { result } = renderHook(() => useConfiguracionAsistencia());

    await waitFor(() => expect(result.current.allowed).toBe(false));
    expect(result.current.errorPantallas).toBe('');
  });

  it('guarda la ventana con un PUT de configuraciones y limpia el estado sucio', async () => {
    mockApi({
      'GET /configurations': () => configResponse,
      'GET /kiosk/devices': () => ({ success: true, data: [] }),
      'PUT /configurations': () => ({ success: true }),
    });

    const { result } = renderHook(() => useConfiguracionAsistencia());
    await waitFor(() => expect(result.current.loadingVentana).toBe(false));

    act(() => {
      result.current.setVentana({
        asistencia_hora_inicio: 8,
        asistencia_minuto_inicio: 0,
        asistencia_hora_fin: 12,
        asistencia_minuto_fin: 0,
      });
    });
    await waitFor(() => expect(result.current.sucio).toBe(true));

    let guardado = false;
    await act(async () => {
      guardado = await result.current.guardarVentana();
    });

    expect(guardado).toBe(true);
    expect(result.current.sucio).toBe(false);

    const llamada = vi
      .mocked(apiClientSafe)
      .mock.calls.find(([, options]: any) => options?.method === 'PUT') as any;
    expect(llamada).toBeDefined();
    expect(llamada[0]).toBe('/configurations');
    expect(JSON.parse(llamada[1].body).configs).toContainEqual({
      clave: 'asistencia_hora_inicio',
      valor: '8',
    });
  });

  it('no llama a la API al guardar si la ventana es inválida', async () => {
    mockApi({
      'GET /configurations': () => configResponse,
      'GET /kiosk/devices': () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(() => useConfiguracionAsistencia());
    await waitFor(() => expect(result.current.loadingVentana).toBe(false));

    act(() => {
      result.current.setVentana({
        asistencia_hora_inicio: 23,
        asistencia_minuto_inicio: 0,
        asistencia_hora_fin: 10,
        asistencia_minuto_fin: 0,
      });
    });
    await waitFor(() => expect(result.current.valida).toBe(false));

    let guardado = true;
    await act(async () => {
      guardado = await result.current.guardarVentana();
    });

    expect(guardado).toBe(false);
    const algunaPut = vi
      .mocked(apiClientSafe)
      .mock.calls.some(([, options]: any) => options?.method === 'PUT');
    expect(algunaPut).toBe(false);
  });

  it('desvincula una pantalla con DELETE y recarga el listado', async () => {
    mockApi({
      'GET /configurations': () => configResponse,
      'GET /kiosk/devices': () => ({ success: true, data: dispositivos }),
      'DELETE /kiosk/devices/d1': () => ({ success: true }),
    });

    const { result } = renderHook(() => useConfiguracionAsistencia());
    await waitFor(() => expect(result.current.loadingPantallas).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.revocarPantalla('d1');
    });

    expect(ok).toBe(true);
    const deleteCall = vi
      .mocked(apiClientSafe)
      .mock.calls.find(([, options]: any) => options?.method === 'DELETE') as any;
    expect(deleteCall?.[0]).toBe('/kiosk/devices/d1');
    // Se recarga la lista tras desvincular.
    const gets = vi
      .mocked(apiClientSafe)
      .mock.calls.filter(([url]: any) => url === '/kiosk/devices');
    expect(gets.length).toBeGreaterThanOrEqual(2);
  });
});
