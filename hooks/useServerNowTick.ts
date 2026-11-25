import { useEffect, useState } from 'react';

/**
 * Instante actual que avanza cada segundo mientras el reloj esté activo.
 *
 * El `now` se pasa como argumento a los cálculos de tiempo (`calculateRemainingTime`,
 * `tiempoServicio`, …): React Compiler cachea por argumentos, así que un valor
 * estable haría que el reloj se congelara. Un hook compartido evita los
 * tres `setInterval` duplicados en TimerPill, ServiceCard y ServiceDetailModal.
 */
export function useServerNowTick(active = true): number {
  // El instante entra como argumento del cálculo: React Compiler cachea las
  // llamadas por sus argumentos, así que sin esto el reloj no avanzaría.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  return now;
}

/** Formatea segundos restantes como `m:ss` (con signo si ya se excedió). */
export function formatRemainingSeconds(seconds: number): string {
  const absSecs = isNaN(seconds) ? 0 : Math.max(0, Math.floor(Math.abs(seconds)));
  const minutes = Math.floor(absSecs / 60);
  const secs = absSecs % 60;
  return `${seconds < 0 ? '-' : ''}${minutes}:${secs.toString().padStart(2, '0')}`;
}
