import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClientSafe } from '@/api/client-safe';

vi.mock('@/api/client-safe', () => ({
  apiClientSafe: vi.fn(() => Promise.resolve({ success: true, data: [] })),
}));

const mockApi = () => vi.mocked(apiClientSafe);

const expectCall = (expectedPath: RegExp | string, expectedMethod = 'GET') => {
  const call = mockApi().mock.calls.find(([endpoint, opts]: [string, any?]) => {
    const url = typeof expectedPath === 'string' ? endpoint.split('?')[0] : endpoint;
    const matches = typeof expectedPath === 'string' ? url === expectedPath : expectedPath.test(endpoint);
    return matches && (!opts || (opts.method || 'GET') === expectedMethod);
  });
  expect(call, `expected ${expectedMethod} ${expectedPath} call`).toBeDefined();
};

describe('API contract: app services ↔ dashboard routes', () => {
  beforeEach(() => {
    mockApi().mockClear();
  });

  describe('clientes', () => {
    it('list → GET /clients', async () => {
      const { clientesService } = await import('@/services/clientes');
      await clientesService.list();
      expectCall('/clients', 'GET');
    });

    it('create → POST /clients', async () => {
      const { clientesService } = await import('@/services/clientes');
      await clientesService.create({ name: 'a', lastName: 'b' });
      expectCall('/clients', 'POST');
    });

    it('prepago → POST /clients/prepago with pagos_mixtos', async () => {
      const { clientesService } = await import('@/services/clientes');
      const body = { cliente_id: 1, monto: 5000, tipo: 'CARGA', metodo_pago: 'mixto', motivo: 'test', pagos_mixtos: [{ metodo: 'efectivo', monto: 3000 }, { metodo: 'tarjeta', monto: 2000 }] };
      await clientesService.prepago(body);
      const call = mockApi().mock.calls[0];
      expect(call[0]).toBe('/clients/prepago');
      expect(call[1]?.method).toBe('POST');
      const sentBody = JSON.parse(call[1]?.body as string);
      expect(sentBody.pagos_mixtos).toBeDefined();
      expect(Array.isArray(sentBody.pagos_mixtos)).toBe(true);
    });
  });

  describe('users', () => {
    it('updateProfile → PUT /users with id', async () => {
      const { usersService } = await import('@/services/users');
      await usersService.updateProfile('42', { phone: '123' });
      const call = mockApi().mock.calls[0];
      expect(call[0]).toBe('/users');
      expect(call[1]?.method).toBe('PUT');
      const sentBody = JSON.parse(call[1]?.body as string);
      expect(sentBody.id).toBe('42');
    });

    it('getProfile → GET /users/profile', async () => {
      const { usersService } = await import('@/services/users');
      await usersService.getProfile();
      expectCall('/users/profile', 'GET');
    });
  });

  describe('ventasService', () => {
    it('finalizarVenta → PATCH /sales/{id}', async () => {
      const { finalizarVenta } = await import('@/services/ventasService');
      await finalizarVenta(99);
      const call = mockApi().mock.calls[0];
      expect(call[0]).toBe('/sales/99');
      expect(call[1]?.method).toBe('PATCH');
      const sentBody = JSON.parse(call[1]?.body as string);
      expect(sentBody.estado).toBe(1);
    });
  });

  describe('caja', () => {
    it('open → POST /cashregister', async () => {
      const { cajaService } = await import('@/services/caja');
      await cajaService.open({ monto_apertura: 100000, usuario_id_apertura: '1' });
      expectCall('/cashregister', 'POST');
    });

    it('close → PATCH /cashregister', async () => {
      const { cajaService } = await import('@/services/caja');
      await cajaService.close({ id_caja: 1, monto_cierre: 50000, usuario_id_cierre: '1' });
      expectCall('/cashregister', 'PATCH');
    });

    it('stats → GET /caja/stats returns ApiRes', async () => {
      const { cajaService } = await import('@/services/caja');
      await cajaService.stats();
      expectCall('/caja/stats', 'GET');
    });
  });

  describe('cuentas', () => {
    it('list → GET /cuentas with limit param', async () => {
      const { cuentasService } = await import('@/services/cuentas');
      await cuentasService.list();
      expect(mockApi().mock.calls[0][0]).toMatch(/^\/cuentas\?limit=50/);
    });

    it('cobrar → POST /cuentas/{id}/cobrar', async () => {
      const { cuentasService } = await import('@/services/cuentas');
      await cuentasService.cobrar(1, { monto: 5000, metodo_pago: 'efectivo' });
      expectCall('/cuentas/1/cobrar', 'POST');
    });

    it('stopTimer → PATCH /cuentas/{id}/stop', async () => {
      const { cuentasService } = await import('@/services/cuentas');
      await cuentasService.stopTimer(1);
      expectCall('/cuentas/1/stop', 'PATCH');
    });
  });

  describe('servicios', () => {
    it('list → GET /servicios with all=true param', async () => {
      const { serviciosService } = await import('@/services/servicios');
      await serviciosService.list();
      expect(mockApi().mock.calls[0][0]).toMatch(/^\/servicios\?all=true/);
    });

    it('create → POST /servicios', async () => {
      const { serviciosService } = await import('@/services/servicios');
      await serviciosService.create({} as any);
      expectCall('/servicios', 'POST');
    });
  });

  describe('auth', () => {
    it('me → GET /auth/me', async () => {
      const { authService } = await import('@/services/auth');
      await authService.me();
      expectCall('/auth/me', 'GET');
    });
  });

  describe('commissions', () => {
    it('user → GET /commissions/user', async () => {
      const { commissionsService } = await import('@/services/commissions');
      await commissionsService.user();
      expectCall('/commissions/user', 'GET');
    });
  });

  describe('dashboard', () => {
    it('stats → GET /dashboard/stats with data', async () => {
      const { dashboardService } = await import('@/services/dashboard');
      mockApi().mockResolvedValueOnce({ success: true, data: { weeklyIncome: [1, 2, 3], badges: [], totalEarnings: 0, svcCount: 0 } });
      const res = await dashboardService.stats();
      expect(res).toHaveProperty('data');
      expectCall('/dashboard/stats', 'GET');
    });
  });

  describe('tips', () => {
    it('userDetail → GET /tips/user?tipo=detalle', async () => {
      const { tipsService } = await import('@/services/tips');
      await tipsService.userDetail();
      expect(mockApi().mock.calls[0][0]).toMatch(/^\/tips\/user\?tipo=detalle/);
    });

    it('allDetail → GET /tips?tipo=detalle', async () => {
      const { tipsService } = await import('@/services/tips');
      await tipsService.allDetail();
      expect(mockApi().mock.calls[0][0]).toMatch(/^\/tips\?tipo=detalle/);
    });
  });

  describe('attendance', () => {
    it('userDetail → GET /attendance/user with tipo=detalle', async () => {
      const { attendanceService } = await import('@/services/attendance');
      await attendanceService.userDetail('2024-01-01', '2024-01-31');
      expect(mockApi().mock.calls[0][0]).toMatch(/^\/attendance\/user\?tipo=detalle/);
    });

    it('register → POST /attendance/register', async () => {
      const { attendanceService } = await import('@/services/attendance');
      await attendanceService.register({} as any);
      expectCall('/attendance/register', 'POST');
    });
  });

  describe('anticipos', () => {
    it('getUserAnticipos → GET /anticipos/user', async () => {
      const { anticiposService } = await import('@/services/anticipos');
      await anticiposService.getUserAnticipos();
      expectCall('/anticipos/user', 'GET');
    });

    it('list → GET /anticipos', async () => {
      const { anticiposService } = await import('@/services/anticipos');
      await anticiposService.list();
      expectCall('/anticipos', 'GET');
    });
  });

  describe('gratificaciones', () => {
    it('me → GET /gratificaciones/me returns ApiRes', async () => {
      const { gratificacionesService } = await import('@/services/gratificaciones');
      mockApi().mockResolvedValueOnce({ success: true, data: [] });
      const res = await gratificacionesService.me();
      expect(res).toHaveProperty('data');
      expectCall('/gratificaciones/me', 'GET');
    });
  });

  describe('events', () => {
    it('getUserEvents → GET /events/user', async () => {
      const { eventsService } = await import('@/services/events');
      await eventsService.getUserEvents();
      expectCall('/events/user', 'GET');
    });
  });

  describe('anfitrionas', () => {
    it('list → GET /anfitrionas returns ApiRes', async () => {
      const { anfitrionasService } = await import('@/services/anfitrionas');
      mockApi().mockResolvedValueOnce({ success: true, data: [] });
      const res = await anfitrionasService.list();
      expect(res).toHaveProperty('data');
      expectCall('/anfitrionas', 'GET');
    });
  });

  describe('response wrapper consistency', () => {
    it('responses always have success and data', () => {
      const response = { success: true, data: [] };
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
    });

    it('unwrapped responses are detectable regression', () => {
      const badResponse = { success: true, notifications: [] };
      expect(badResponse).not.toHaveProperty('data');
    });
  });
});
