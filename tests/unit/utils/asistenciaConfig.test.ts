import { describe, expect, it } from 'vitest';

import {
  duracionVentana,
  formatearHora,
  leerHora,
  normalizarVentana,
  VENTANA_ASISTENCIA_DEFECTO,
  ventanaValida,
  type VentanaAsistencia,
} from '@/utils/asistenciaConfig';

const ventana = (parcial: Partial<VentanaAsistencia>): VentanaAsistencia => ({
  ...VENTANA_ASISTENCIA_DEFECTO,
  ...parcial,
});

describe('asistenciaConfig — helpers de la ventana de asistencia', () => {
  it('formatea y parsea horas "HH:MM"', () => {
    expect(formatearHora(9, 5)).toBe('09:05');
    expect(leerHora('21:30')).toEqual({ hora: 21, minuto: 30 });
    expect(leerHora('9:05')).toEqual({ hora: 9, minuto: 5 });
  });

  it('rechaza formatos y valores fuera de rango', () => {
    expect(leerHora('25:00')).toBeNull();
    expect(leerHora('10:75')).toBeNull();
    expect(leerHora('abc')).toBeNull();
    expect(leerHora('10')).toBeNull();
  });

  it('la ventana sólo es válida si el fin es posterior al inicio', () => {
    expect(ventanaValida(ventana({ asistencia_hora_inicio: 21, asistencia_hora_fin: 23 }))).toBe(true);
    expect(ventanaValida(ventana({ asistencia_hora_inicio: 23, asistencia_hora_fin: 10 }))).toBe(false);
    expect(ventanaValida(ventana({ asistencia_hora_inicio: 22, asistencia_hora_fin: 22 }))).toBe(false);
  });

  it('calcula la duración sólo cuando la ventana es válida', () => {
    expect(
      duracionVentana(
        ventana({
          asistencia_hora_inicio: 21,
          asistencia_minuto_inicio: 30,
          asistencia_hora_fin: 23,
          asistencia_minuto_fin: 0,
        }),
      ),
    ).toBe(90);
    expect(duracionVentana(ventana({ asistencia_hora_inicio: 23, asistencia_hora_fin: 10 }))).toBe(0);
  });

  it('normaliza lo que envía el servidor y cae a los valores por defecto', () => {
    expect(
      normalizarVentana({
        asistencia_hora_inicio: '20',
        asistencia_minuto_inicio: '15',
        asistencia_hora_fin: '23',
        asistencia_minuto_fin: '0',
      }),
    ).toEqual({
      asistencia_hora_inicio: 20,
      asistencia_minuto_inicio: 15,
      asistencia_hora_fin: 23,
      asistencia_minuto_fin: 0,
    });

    expect(normalizarVentana(undefined)).toEqual(VENTANA_ASISTENCIA_DEFECTO);
    expect(normalizarVentana({ asistencia_hora_inicio: 'no-numero' })).toEqual(
      VENTANA_ASISTENCIA_DEFECTO,
    );
  });
});
