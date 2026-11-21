import { describe, it, expect, vi, beforeEach } from 'vitest';

import { apiClientSafe } from '@/api/client-safe';
import {
  mapServicio,
  servicioATimer,
  serviciosService,
} from '@/services/servicios';

vi.mock('@/api/client-safe', () => ({
  apiClientSafe: vi.fn(),
}));

const mockApi = () => vi.mocked(apiClientSafe);

const respuesta = (data: unknown, extra = {}) => ({
  success: true,
  data,
  error: undefined,
  message: undefined,
  ...extra,
});

/** Fila de `/services` (mapServiceFromDB del backend). */
const FILA_SERVICES = {
  id: 12,
  codigo: 'SVC-012',
  estado: 1,
  tiempo: 60,
  fecha_crea: '2025-03-04T15:30:00.000Z',
  precio_servicio: 50000,
  precio_habitacion: 30000,
  iva: 15200,
  sub_total: 50000,
  total: 95200,
  metodo_pago: 'efectivo',
  total_usuarios: 2,
  habitacion_nombre: 'VIP 1',
  habitacion_id: 4,
  habitacion_comision: 0,
  anfitrionas_nombres: 'Ana, María',
  anfitrionas_ids: '7, 8',
  anfitrionas_fotos: 'a.jpg, b.jpg',
  cliente_nombre: 'Juan',
  cliente_id: 3,
  waiter_name: 'Cajero 1',
  comision_individual: 15000,
  total_comision: 30000,
  es_temporal: 0,
};

/** Fila cruda de `/services/user` (tabla `servicios`). */
const FILA_USUARIO = {
  id_servicio: 33,
  codigo: 'SVC-033',
  estado: 2,
  tiempo: 30,
  fecha_crea: '2025-03-05',
  precio_servicio: 80000,
  comision_usuario: 12000,
  habitacion: 'Suite 3',
  anfitriona: 'Ana',
  cliente: 'Carlos',
  metodo_pago: 'tarjeta',
};

describe('mapServicio', () => {
  it('unifica la fila de /services (nombres de columna mapeados)', () => {
    const servicio = mapServicio(FILA_SERVICES);

    expect(servicio).toEqual(
      expect.objectContaining({
        id_servicio: 12,
        codigo: 'SVC-012',
        estado: 1,
        tiempo: 60,
        precio_servicio: 50000,
        precio_habitacion: 30000,
        total: 95200,
        metodo_pago: 'efectivo',
        total_usuarios: 2,
        habitacion: 'VIP 1',
        habitacion_id: 4,
        anfitriona: 'Ana, María',
        anfitrionas_ids: ['7', '8'],
        anfitrionas_fotos: ['a.jpg', 'b.jpg'],
        cliente: 'Juan',
        cliente_id: 3,
        waiter_name: 'Cajero 1',
        es_temporal: false,
        servicio_original_id: null,
      }),
    );
    // El servidor ya calcula la comisión: se respeta tal cual.
    expect(servicio.comision_individual).toBe(15000);
    expect(servicio.total_comision).toBe(30000);
  });

  it('calcula la comisión cuando el payload no trae valores del servidor', () => {
    const { comision_individual: _i, total_comision: _t, ...sinComision } =
      FILA_SERVICES;

    const servicio = mapServicio(sinComision);

    // Sin comisión de habitación se usa el precio de servicio por anfitriona.
    expect(servicio.comision_individual).toBe(50000);
    expect(servicio.total_comision).toBe(100000);
  });

  it('unifica la fila cruda de /services/user', () => {
    const servicio = mapServicio(FILA_USUARIO);

    expect(servicio).toEqual(
      expect.objectContaining({
        id_servicio: 33,
        estado: 2,
        habitacion: 'Suite 3',
        anfitriona: 'Ana',
        anfitrionas_ids: [],
        cliente: 'Carlos',
        comision_usuario: 12000,
        metodo_pago: 'tarjeta',
      }),
    );
  });

  it('cae a valores seguros cuando la fila viene incompleta', () => {
    const servicio = mapServicio({});

    expect(servicio.id_servicio).toBe(0);
    expect(servicio.total).toBe(0);
    expect(servicio.habitacion).toBe('Servicio de barra');
    expect(servicio.cliente).toBe('Sin cliente registrado');
    expect(servicio.anfitrionas_ids).toEqual([]);
    expect(servicio.metodo_pago).toBe('');
  });
});

describe('servicioATimer', () => {
  it('proyecta el servicio finalizado al formato Timer de la lista', () => {
    const timer = servicioATimer(mapServicio(FILA_SERVICES));

    expect(timer).toEqual(
      expect.objectContaining({
        id: '12',
        servicioId: '12',
        roomId: '4',
        roomName: 'VIP 1',
        duration: 60,
        remainingTime: 0,
        isActive: false,
        isPaused: false,
        servicioCode: 'SVC-012',
        tipoTransaccion: 'servicio',
        cliente_id: '3',
        clienteNombre: 'Juan',
        estado: 1,
        total: 95200,
      }),
    );
    expect(timer.startTime).toEqual(new Date('2025-03-04T15:30:00.000Z'));
  });

  it('usa un roomId de barra cuando no hay habitación', () => {
    const timer = servicioATimer(mapServicio({ ...FILA_SERVICES, habitacion_id: null }));
    expect(timer.roomId).toBe('barra');
  });
});

describe('serviciosService', () => {
  beforeEach(() => {
    mockApi().mockReset();
  });

  it('listar pagina y calcula hasMore con el total del servidor', async () => {
    mockApi().mockResolvedValueOnce(
      respuesta({ data: [FILA_SERVICES], total: 250 }),
    );

    const res = await serviciosService.listar({ page: 2, limit: 100 });

    expect(mockApi()).toHaveBeenCalledWith('/services?all=true&limit=100&page=2');
    expect(res.success).toBe(true);
    expect(res.items).toHaveLength(1);
    expect(res.total).toBe(250);
  });

  it('listar acepta un arreglo plano sin total', async () => {
    mockApi().mockResolvedValueOnce(respuesta([FILA_SERVICES]));

    const res = await serviciosService.listar();

    expect(res.items).toHaveLength(1);
    expect(res.total).toBe(1);
  });

  it('create envía la clave de idempotencia', async () => {
    mockApi().mockResolvedValueOnce(respuesta({ ...FILA_SERVICES, es_temporal: 1 }));

    const res = await serviciosService.create({} as never, 'clave-123');

    expect(mockApi()).toHaveBeenCalledWith('/services', {
      method: 'POST',
      body: '{}',
      headers: { 'x-idempotency-key': 'clave-123' },
    });
    expect(res.success).toBe(true);
    expect(res.data?.es_temporal).toBe(true);
  });

  it('crearSolicitud devuelve el id de la solicitud', async () => {
    mockApi().mockResolvedValueOnce(respuesta({ id: 'sol-9' }));

    const res = await serviciosService.crearSolicitud({} as never);

    expect(mockApi()).toHaveBeenCalledWith('/service-requests', {
      method: 'POST',
      body: '{}',
    });
    expect(res).toEqual({ success: true, id: 'sol-9', message: undefined });
  });

  it('actualizarEstado hace PATCH y mapea la respuesta', async () => {
    mockApi().mockResolvedValueOnce(respuesta({ ...FILA_SERVICES, estado: 1 }));

    const res = await serviciosService.actualizarEstado(12, 1);

    expect(mockApi()).toHaveBeenCalledWith('/services/12', {
      method: 'PATCH',
      body: JSON.stringify({ estado: 1 }),
    });
    expect(res.data?.estado).toBe(1);
  });
});
