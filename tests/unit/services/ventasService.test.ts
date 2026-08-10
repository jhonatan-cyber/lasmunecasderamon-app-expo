import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client-safe', () => ({
  apiClientSafe: vi.fn(() => Promise.resolve({ success: true, data: null })),
}));

vi.mock('@/utils/logger', () => ({
  default: { captureException: vi.fn() }
}));

import { apiClientSafe } from '@/api/client-safe';
import logger from '@/utils/logger';
import {
  fetchSalesList,
  fetchVentaDetail,
  finalizarVenta,
  enviarSolicitudAnulacion
} from '@/services/ventasService';

const mockApi = () => vi.mocked(apiClientSafe);
const mockCapture = () => vi.mocked(logger.captureException);

const apiResponse = (overrides = {}) => ({
  success: true,
  data: null,
  error: undefined,
  message: undefined,
  ...overrides
});

describe('ventasService', () => {
  beforeEach(() => {
    mockApi().mockReset();
    mockCapture().mockReset();
  });

  describe('fetchSalesList', () => {
    it('devuelve ventas y resumen en éxito', async () => {
      const ventas = [{ id: 1, total: 100 }];
      const resumen = { total: 100 };
      mockApi()
        .mockResolvedValueOnce(apiResponse({ data: ventas }))
        .mockResolvedValueOnce(apiResponse({ data: resumen }));

      const result = await fetchSalesList(50);

      expect(mockApi()).toHaveBeenCalledTimes(2);
      expect(result.ventas).toEqual(ventas);
      expect(result.resumen).toEqual(resumen);
    });

    it('soporta data anidada en ventas', async () => {
      const ventas = [{ id: 2, total: 200 }];
      mockApi()
        .mockResolvedValueOnce(apiResponse({ data: { data: ventas } }))
        .mockResolvedValueOnce(apiResponse({ data: null }));

      const result = await fetchSalesList();

      expect(result.ventas).toEqual(ventas);
      expect(result.resumen).toBeNull();
    });

    it('tolera fallo de una de las peticiones', async () => {
      mockApi()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce(apiResponse({ data: { total: 5 } }));

      const result = await fetchSalesList();

      expect(result.ventas).toEqual([]);
      expect(result.resumen).toEqual({ total: 5 });
    });

    it('devuelve vacíos si ambas peticiones fallan (catch interno)', async () => {
      mockApi().mockRejectedValue(new Error('boom'));

      const result = await fetchSalesList();

      expect(result).toEqual({ ventas: [], resumen: null });
    });
  });

  describe('fetchVentaDetail', () => {
    it('devuelve data si success', async () => {
      mockApi().mockResolvedValueOnce(apiResponse({ data: { id: 9 } }));
      await expect(fetchVentaDetail(9)).resolves.toEqual({ id: 9 });
    });

    it('devuelve null sin success', async () => {
      mockApi().mockResolvedValueOnce(apiResponse({ success: false }));
      await expect(fetchVentaDetail(9)).resolves.toBeNull();
    });

    it('devuelve null en error y registra excepción', async () => {
      mockApi().mockRejectedValueOnce(new Error('x'));
      await expect(fetchVentaDetail(9)).resolves.toBeNull();
      expect(mockCapture()).toHaveBeenCalled();
    });
  });

  describe('finalizarVenta', () => {
    it('valida ventaId nulo', async () => {
      await expect(finalizarVenta(null)).resolves.toEqual({
        success: false,
        message: 'ID de venta no válido'
      });
      expect(mockApi()).not.toHaveBeenCalled();
    });

    it('envía PATCH estado 1 y devuelve success', async () => {
      mockApi().mockResolvedValueOnce(apiResponse({ success: true }));

      const result = await finalizarVenta(5);

      expect(mockApi()).toHaveBeenCalledWith('/sales/5', {
        method: 'PATCH',
        body: JSON.stringify({ estado: 1 })
      });
      expect(result).toEqual({ success: true });
    });

    it('devuelve success si solo no hay error', async () => {
      mockApi().mockResolvedValueOnce(apiResponse({ success: false }));
      await expect(finalizarVenta(5)).resolves.toEqual({ success: true });
    });

    it('reporta mensaje del servidor en fallo', async () => {
      mockApi().mockResolvedValueOnce(
        apiResponse({ success: false, error: 'rechazada' })
      );
      await expect(finalizarVenta(5)).resolves.toEqual({
        success: false,
        message: 'rechazada'
      });
    });

    it('captura excepción', async () => {
      mockApi().mockRejectedValueOnce(new Error('e'));
      await expect(finalizarVenta(5)).resolves.toEqual({
        success: false,
        message: 'Error al procesar la finalización'
      });
    });
  });

  describe('enviarSolicitudAnulacion', () => {
    it('valida ventaId nulo', async () => {
      await expect(enviarSolicitudAnulacion(null, 'm', 10)).resolves.toEqual({
        success: false,
        message: 'No se pudo identificar la venta.'
      });
      expect(mockApi()).not.toHaveBeenCalled();
    });

    it('envía POST con payload y devuelve success', async () => {
      mockApi().mockResolvedValueOnce(apiResponse({ success: true }));

      const result = await enviarSolicitudAnulacion(3, 'motivo', 500);

      expect(mockApi()).toHaveBeenCalledWith('/ventas/anulacion', {
        method: 'POST',
        body: JSON.stringify({ ventaId: 3, motivo: 'motivo', monto: 500 })
      });
      expect(result).toEqual({ success: true });
    });

    it('devuelve success sin error', async () => {
      mockApi().mockResolvedValueOnce(apiResponse({ success: false }));
      await expect(enviarSolicitudAnulacion(3, 'm', 1)).resolves.toEqual({
        success: true
      });
    });

    it('reporta mensaje del servidor en fallo', async () => {
      mockApi().mockResolvedValueOnce(
        apiResponse({ success: false, error: 'nope' })
      );
      await expect(enviarSolicitudAnulacion(3, 'm', 1)).resolves.toEqual({
        success: false,
        message: 'nope'
      });
    });

    it('captura excepción', async () => {
      mockApi().mockRejectedValueOnce(new Error('e'));
      await expect(enviarSolicitudAnulacion(3, 'm', 1)).resolves.toEqual({
        success: false,
        message: 'Error al procesar la solicitud de anulación'
      });
    });
  });
});
