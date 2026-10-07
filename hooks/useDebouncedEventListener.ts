import { useEffect, useRef } from "react";
import { eventBus } from "@/utils/eventBus";

/**
 * Suscripción a eventBus con debounce trailing.
 *
 * Las ráfagas SSE (p. ej. `updateSales` + `new_order` + `timer_*` juntos, o el
 * doble `sse_event` + `refresh_requests` del mismo pedido) colapsan en una
 * sola ejecución en vez de N fetches seguidos.
 *
 * NO usar para UI inmediata (shakes, overlays, voz): eso va directo.
 */
export function useDebouncedEventListener<T = unknown>(
  event: string,
  callback: (payload: T) => void,
  delayMs = 500,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  // En efecto (no durante el render): siempre la última versión del callback.
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = eventBus.addListener(event, (payload: T) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        callbackRef.current(payload);
      }, delayMs);
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [event, delayMs, enabled]);
}
