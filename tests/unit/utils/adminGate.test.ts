import { describe, expect, it } from 'vitest';

import { RUTAS_SOLO_ADMIN, rutaExigeAdmin } from '@/utils/adminGate';

describe('adminGate — rutas exclusivas de administrador', () => {
  it('reconoce la ruta de configuración de asistencia', () => {
    expect(rutaExigeAdmin(['(app)', 'cajero', 'configuracion-asistencia'])).toBe(true);
  });

  it('no marca como admin las rutas normales del cajero', () => {
    expect(rutaExigeAdmin(['(app)', 'cajero', '(tabs)'])).toBe(false);
    expect(rutaExigeAdmin(['(app)', 'cajero', 'ventas'])).toBe(false);
    expect(rutaExigeAdmin([])).toBe(false);
  });

  it('sólo declara como admin la pantalla de configuración', () => {
    expect([...RUTAS_SOLO_ADMIN]).toEqual(['configuracion-asistencia']);
  });
});
