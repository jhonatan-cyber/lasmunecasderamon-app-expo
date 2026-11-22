import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tiempoServicio } from '@/utils/servicioTiempo';

const AHORA = new Date('2026-11-20T12:00:00.000Z');

const timer = (overrides: Partial<Parameters<typeof tiempoServicio>[0]> = {}) => ({
  startTime: new Date(AHORA.getTime() - 10 * 60 * 1000),
  duration: 30,
  isPaused: false,
  remainingTime: 0,
  ...overrides,
});

describe('tiempoServicio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calcula restante, transcurrido y progreso de un servicio en curso', () => {
    const tiempo = tiempoServicio(timer());

    expect(tiempo.totalSegundos).toBe(1800);
    expect(tiempo.restante).toBe(1200);
    expect(tiempo.transcurrido).toBe(600);
    expect(tiempo.progreso).toBeCloseTo(1 / 3);
    expect(tiempo.estaExcedido).toBe(false);
    expect(tiempo.excedidoSegundos).toBe(0);
    expect(tiempo.estaCritico).toBe(false);
  });

  it('marca crítico cuando falta menos de un minuto', () => {
    const tiempo = tiempoServicio(
      timer({ startTime: new Date(AHORA.getTime() - (29 * 60 + 30) * 1000) }),
    );

    expect(tiempo.restante).toBe(30);
    expect(tiempo.estaCritico).toBe(true);
    expect(tiempo.estaExcedido).toBe(false);
  });

  it('conserva los segundos de exceso cuando el reloj llegó a cero', () => {
    const tiempo = tiempoServicio(
      timer({ startTime: new Date(AHORA.getTime() - 35 * 60 * 1000) }),
    );

    expect(tiempo.restante).toBe(0);
    expect(tiempo.excedidoSegundos).toBe(300);
    expect(tiempo.estaExcedido).toBe(true);
    expect(tiempo.progreso).toBe(1);
    expect(tiempo.estaCritico).toBe(false);
  });

  it('congela el tiempo restante y no reporta exceso cuando está pausado', () => {
    const tiempo = tiempoServicio(
      timer({
        startTime: new Date(AHORA.getTime() - 35 * 60 * 1000),
        isPaused: true,
        remainingTime: 600,
      }),
    );

    expect(tiempo.estaPausado).toBe(true);
    expect(tiempo.restante).toBe(600);
    expect(tiempo.transcurrido).toBe(1200);
    expect(tiempo.progreso).toBeCloseTo(2 / 3);
    expect(tiempo.estaExcedido).toBe(false);
  });

  it('respeta el desfase del servidor', () => {
    const tiempo = tiempoServicio(
      timer({ startTime: new Date(AHORA.getTime()), duration: 10 }),
      60 * 1000,
    );

    expect(tiempo.restante).toBe(540);
    expect(tiempo.transcurrido).toBe(60);
  });

  it('usa el instante explícito recibido (reloj animado por React Compiler)', () => {
    // React Compiler cachea las llamadas por sus argumentos: si `now` no entra
    // en el cálculo, la tarjeta re-renderiza pero el reloj queda congelado.
    const tiempo = tiempoServicio(timer(), 0, AHORA.getTime() + 60 * 1000);

    expect(tiempo.restante).toBe(1140);
    expect(tiempo.transcurrido).toBe(660);
  });

  it('acepta startTime en texto y duración cero', () => {
    const tiempo = tiempoServicio({
      startTime: AHORA.toISOString(),
      duration: 0,
      isPaused: false,
      remainingTime: 0,
    });

    expect(tiempo.totalSegundos).toBe(0);
    expect(tiempo.progreso).toBe(0);
    expect(tiempo.estaExcedido).toBe(false);
  });
});
