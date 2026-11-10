import { describe, expect, it } from 'vitest';

import { RUTAS_SOLO_ADMIN, rutaExigeAdmin } from '@/utils/adminGate';

describe('adminGate — rutas exclusivas de administrador', () => {
  it('reconoce la ruta de configuración de asistencia', () => {
    expect(rutaExigeAdmin(['(app)', 'cajero', 'configuracion-asistencia'])).toBe(true);
  });

  it('reconoce las pantallas de consulta del administrador', () => {
    expect(rutaExigeAdmin(['(app)', 'cajero', 'asistencia-local'])).toBe(true);
    expect(rutaExigeAdmin(['(app)', 'cajero', 'compras'])).toBe(true);
    expect(rutaExigeAdmin(['(app)', 'cajero', 'pagos'])).toBe(true);
    expect(rutaExigeAdmin(['(app)', 'cajero', 'anticipos-admin'])).toBe(true);
  });

  it('no marca como admin las rutas normales del cajero', () => {
    expect(rutaExigeAdmin(['(app)', 'cajero', '(tabs)'])).toBe(false);
    expect(rutaExigeAdmin(['(app)', 'cajero', 'ventas'])).toBe(false);
    expect(rutaExigeAdmin([])).toBe(false);
  });

  it('declara como admin las pantallas de administración', () => {
    expect([...RUTAS_SOLO_ADMIN]).toEqual([
      'configuracion-asistencia',
      'asistencia-local',
      'compras',
      'pagos',
      'anticipos-admin',
    ]);
  });
});
