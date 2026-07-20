/**
 * EventBus — reemplazo nativo para DeviceEventEmitter (deprecado en RN 0.85+).
 *
 * API compatible con DeviceEventEmitter.addListener/emit/removeAllListeners.
 * Usa un Map<string, Set<Listener>> internamente, sin depender de native modules.
 */

type Listener = (...args: any[]) => void;

interface Subscription {
  remove: () => void;
}

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  /** Registra un listener para un evento. Retorna subscription con .remove() */
  addListener(event: string, listener: Listener): Subscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return {
      remove: () => {
        this.listeners.get(event)?.delete(listener);
      },
    };
  }

  /** Emite un evento, llamando a todos los listeners registrados */
  emit(event: string, ...args: any[]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    // Iteramos sobre copia para evitar problemas si un listener se remueve a sí mismo
    for (const listener of [...set]) {
      try {
        listener(...args);
      } catch (err) {
        console.error(`[EventBus] Error en listener para "${event}":`, err);
      }
    }
  }

  /** Elimina todos los listeners de un evento (o todos si no se especifica) */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/** Singleton global */
export const eventBus = new EventBus();

export default eventBus;
