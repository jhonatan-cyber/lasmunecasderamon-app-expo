import { describe, expect, it } from 'vitest';

import {
  coloresBadgeEstado,
  esServicioAnulado,
  esServicioFinalizado,
  esServicioPendiente,
  estadoServicio,
  estadoVisualServicio,
  type EstadoVisual,
} from '@/utils/servicioEstado';

describe('estadoServicio', () => {
  it('traduce cada estado numérico a su etiqueta y color', () => {
    expect(estadoServicio(0)).toEqual({ key: 'anulado', label: 'Anulado', color: '#EF4444' });
    expect(estadoServicio(1)).toEqual({ key: 'finalizado', label: 'Finalizado', color: '#10B981' });
    expect(estadoServicio(2)).toEqual({ key: 'en_proceso', label: 'En Proceso', color: '#3B82F6' });
    expect(estadoServicio(3)).toEqual({ key: 'pausado', label: 'Pausado', color: '#F59E0B' });
    expect(estadoServicio(4)).toEqual({
      key: 'solicitud_anulada',
      label: 'Solicitud Anul.',
      color: '#F97316',
    });
  });

  it('acepta strings numéricos y valores desconocidos', () => {
    expect(estadoServicio('2').key).toBe('en_proceso');
    expect(estadoServicio(99).key).toBe('desconocido');
    expect(estadoServicio(null).key).toBe('desconocido');
    expect(estadoServicio(undefined).key).toBe('desconocido');
  });
});

describe('predicados de estado', () => {
  it('esServicioPendiente solo para estado 2', () => {
    expect(esServicioPendiente(2)).toBe(true);
    expect(esServicioPendiente('2')).toBe(true);
    expect(esServicioPendiente(1)).toBe(false);
  });

  it('esServicioFinalizado solo para estado 1', () => {
    expect(esServicioFinalizado(1)).toBe(true);
    expect(esServicioFinalizado(0)).toBe(false);
  });

  it('esServicioAnulado cubre anulado y solicitud anulada', () => {
    expect(esServicioAnulado(0)).toBe(true);
    expect(esServicioAnulado(4)).toBe(true);
    expect(esServicioAnulado(1)).toBe(false);
  });
});

describe('estadoVisualServicio', () => {
  const sinReloj = { excedido: false, critico: false };

  it('usa el avance del reloj para servicios en proceso', () => {
    expect(estadoVisualServicio(2, sinReloj)).toBe('en_proceso');
    expect(estadoVisualServicio('2', { excedido: false, critico: true })).toBe('critico');
    expect(estadoVisualServicio(2, { excedido: true, critico: false })).toBe('excedido');
  });

  it('el estado del servicio manda sobre el reloj', () => {
    expect(estadoVisualServicio(3, { excedido: true, critico: true })).toBe('pausado');
    expect(estadoVisualServicio(0, { excedido: true, critico: true })).toBe('anulado');
    expect(estadoVisualServicio(4, { excedido: true, critico: true })).toBe('anulado');
    expect(estadoVisualServicio(1, { excedido: true, critico: true })).toBe('finalizado');
    expect(estadoVisualServicio(null, { excedido: true, critico: true })).toBe('desconocido');
  });
});

describe('coloresBadgeEstado', () => {
  const canales = (hex: string) => {
    const limpio = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255);
  };

  const luminancia = (hex: string) => {
    const [r, g, b] = canales(hex).map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const contraste = (a: string, b: string) => {
    const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return (claro + 0.05) / (oscuro + 0.05);
  };

  const visuales: EstadoVisual[] = [
    'en_proceso',
    'critico',
    'excedido',
    'pausado',
    'anulado',
    'finalizado',
    'desconocido',
  ];

  it('mantiene contraste AA en ambos temas', () => {
    for (const visual of visuales) {
      for (const isDark of [false, true]) {
        const { background, foreground } = coloresBadgeEstado(visual, isDark);
        expect(contraste(background, foreground)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('no comparte la misma paleta entre tema claro y oscuro', () => {
    expect(coloresBadgeEstado('excedido', true)).not.toEqual(coloresBadgeEstado('excedido', false));
  });
});
