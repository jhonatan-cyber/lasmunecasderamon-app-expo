import { describe, expect, it } from 'vitest';

import { interpretarSolicitudAnulacion } from '@/services/anulaciones';

const sobre = (overrides: Record<string, unknown> = {}) => ({
  success: false,
  data: null,
  ...overrides,
}) as never;

describe('interpretarSolicitudAnulacion', () => {
  it('éxito pleno: solicitud creada y aviso enviado', () => {
    expect(
      interpretarSolicitudAnulacion(sobre({ success: true, token: 'tk-1' })),
    ).toEqual({ success: true, message: undefined });
  });

  it('aviso fallido: la señal del sobre 202 llega como token', () => {
    expect(
      interpretarSolicitudAnulacion(
        sobre({
          success: false,
          message: 'Solicitud creada pero no se pudo enviar WhatsApp al administrador',
          token: 'tk-9',
        }),
      ),
    ).toEqual({
      success: true,
      avisoFallido: true,
      message: 'Solicitud creada pero no se pudo enviar WhatsApp al administrador',
    });
  });

  it('aviso fallido: la señal del sobre 202 llega como id', () => {
    expect(
      interpretarSolicitudAnulacion(
        sobre({
          success: false,
          message: 'Solicitud creada pero no se pudo enviar WhatsApp al administrador',
          id: 7,
        }),
      ),
    ).toEqual({
      success: true,
      avisoFallido: true,
      message: 'Solicitud creada pero no se pudo enviar WhatsApp al administrador',
    });
  });

  it('rechazo real: sin señal de creación, usa el error del servidor', () => {
    expect(
      interpretarSolicitudAnulacion(sobre({ success: false, error: 'Esta venta ya tiene una solicitud de anulacion registrada' })),
    ).toEqual({
      success: false,
      message: 'Esta venta ya tiene una solicitud de anulacion registrada',
    });
  });

  it('rechazo real: sin señal ni error, mensaje por defecto', () => {
    expect(interpretarSolicitudAnulacion(sobre())).toEqual({
      success: false,
      message: 'No se pudo solicitar la anulación',
    });
  });
});
