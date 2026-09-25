import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEnvasesScreen, type EnvaseDevolucion } from '@/hooks/useEnvasesScreen';
import { barService } from '@/services/bar';
import { showToast } from '@/utils/toast-lazy';

vi.mock('@/services/bar', () => ({
  barService: {
    containers: vi.fn(),
    returnContainer: vi.fn(),
  },
}));

vi.mock('@/utils/toast-lazy', () => ({
  showToast: vi.fn(),
}));

const registro: EnvaseDevolucion = {
  id: 'u1',
  codigo: 'LM-000042',
  codigo_barras: '2912345678901',
  estado: 'vendida',
  fecha_devolucion: '2026-09-25 10:00:00',
  fecha_confirmacion: null,
  producto_nombre: 'Vino Blanco',
  presentacion_nombre: 'Botella 750ml',
  compra_folio: 'F-001',
  usuario_nombre: 'Damo',
  usuario_apellido: null,
  usuario_nick: 'Damo',
  confirmado_nombre: null,
  confirmado_apellido: null,
  confirmado_nick: null,
  pendiente_confirmacion: true,
};

describe('useEnvasesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga el historial de devoluciones', async () => {
    vi.mocked(barService.containers).mockResolvedValue({
      success: true,
      data: [registro],
    } as never);

    const { result } = renderHook(() => useEnvasesScreen());
    await act(async () => {
      await result.current.fetchDevoluciones();
    });

    expect(result.current.devoluciones).toHaveLength(1);
    expect(result.current.pendientes).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('un escaneo aceptado deja veredicto, lo suma a la sesión y refresca el historial', async () => {
    vi.mocked(barService.containers).mockResolvedValue({ success: true, data: [registro] } as never);
    vi.mocked(barService.returnContainer).mockResolvedValue({
      success: true,
      data: {
        ok: true,
        mensaje: 'Envase verificado: es nuestro, estaba vacío y quedó marcado como devuelto.',
        unidad: { id: 'u1', codigo: 'LM-000042' },
      },
    } as never);

    const { result } = renderHook(() => useEnvasesScreen());
    await act(async () => {
      const veredicto = await result.current.enviarEscaneo(' lm-000042 ');
      expect(veredicto).toEqual({
        ok: true,
        texto: 'Envase verificado: es nuestro, estaba vacío y quedó marcado como devuelto.',
      });
    });

    expect(barService.returnContainer).toHaveBeenCalledWith('LM-000042');
    expect(result.current.sesion).toHaveLength(1);
    expect(result.current.entregados).toBe(1);
    expect(result.current.rechazados).toBe(0);
    expect(result.current.resultado?.ok).toBe(true);
    // El envase aceptado aparece en el historial: se refresca la lista.
    await waitFor(() => expect(barService.containers).toHaveBeenCalledTimes(1));
  });

  it('un escaneo rechazado cuenta como rechazado y no refresca el historial', async () => {
    vi.mocked(barService.containers).mockResolvedValue({ success: true, data: [] } as never);
    vi.mocked(barService.returnContainer).mockResolvedValue({
      success: false,
      data: {
        ok: false,
        motivo: 'ya_devuelto',
        mensaje: 'Este envase ya fue devuelto el 25/09/2026 10:00.',
        unidad: null,
      },
    } as never);

    const { result } = renderHook(() => useEnvasesScreen());
    await act(async () => {
      const veredicto = await result.current.enviarEscaneo('LM-000042');
      expect(veredicto?.ok).toBe(false);
      expect(veredicto?.texto).toBe('Ya entregado');
    });

    expect(result.current.sesion).toHaveLength(1);
    expect(result.current.rechazados).toBe(1);
    expect(result.current.resultado?.motivo).toBe('ya_devuelto');
    expect(barService.containers).not.toHaveBeenCalled();
  });

  it('ignora un código vacío sin llamar al servidor', async () => {
    const { result } = renderHook(() => useEnvasesScreen());

    let veredicto: unknown = 'pendiente';
    await act(async () => {
      veredicto = await result.current.enviarEscaneo('   ');
    });

    expect(veredicto).toBeNull();
    expect(barService.returnContainer).not.toHaveBeenCalled();
    expect(result.current.sesion).toHaveLength(0);
  });

  it('un error de red devuelve null, avisa con toast y no suma a la sesión', async () => {
    vi.mocked(barService.returnContainer).mockRejectedValue(new Error('Sin conexión'));

    const { result } = renderHook(() => useEnvasesScreen());
    await act(async () => {
      const veredicto = await result.current.enviarEscaneo('LM-000042');
      expect(veredicto).toBeNull();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'No se pudo verificar el envase' }),
    );
    expect(result.current.sesion).toHaveLength(0);
  });

  it('limpiar la sesión borra los contadores', async () => {
    vi.mocked(barService.containers).mockResolvedValue({ success: true, data: [] } as never);
    vi.mocked(barService.returnContainer).mockResolvedValue({
      success: true,
      data: { ok: true, mensaje: 'ok', unidad: null },
    } as never);

    const { result } = renderHook(() => useEnvasesScreen());
    await act(async () => {
      await result.current.enviarEscaneo('LM-000001');
    });
    expect(result.current.sesion).toHaveLength(1);

    act(() => {
      result.current.limpiarSesion();
    });
    expect(result.current.sesion).toHaveLength(0);
    expect(result.current.entregados).toBe(0);
  });
});
