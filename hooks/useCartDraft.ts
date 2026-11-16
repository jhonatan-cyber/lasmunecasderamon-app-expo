import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import logger from "@/utils/logger";

/**
 * Persiste y restaura un carrito de compras por usuario y flujo en AsyncStorage.
 * El draft se guarda automáticamente cuando el carrito cambia y se restaura
 * al montar el componente.
 *
 * @param flow - Identificador del flujo (ej: 'sales', 'services').
 * @param cart - Array de items del carrito actual.
 * @param restore - Callback para restaurar items guardados.
 * @returns {() => void} Función para limpiar el draft manualmente.
 */
export function useCartDraft<T>(
  flow: string,
  cart: T[],
  restore: (items: T[]) => void,
) {
  const userId = useAuthStore((state) => state.user?.id);
  const key = userId ? `cart-draft:${userId}:${flow}` : "";
  const [readyKey, setReadyKey] = useState("");
  const restoreRef = useRef(restore);
  useEffect(() => {
    restoreRef.current = restore;
  }, [restore]);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    if (!key) return;
    let alive = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            if (Array.isArray(saved)) restoreRef.current(saved);
          } catch {}
        }
      })
      .catch(() => { logger.debug('No se pudo leer el draft del carrito.', { flow }); })
      .finally(() => {
        if (alive) setReadyKey(key);
      });
    return () => {
      alive = false;
    };
  }, [key, flow]);
  useEffect(() => {
    if (!key || readyKey !== key) return;
    const snapshot = JSON.stringify(cart);
    writes.current = writes.current
      .catch(() => { logger.debug('Error previo en escritura de draft del carrito.'); })
      .then(() =>
        cart.length
          ? AsyncStorage.setItem(key, snapshot)
          : AsyncStorage.removeItem(key),
      )
      .catch(() => { logger.debug('No se pudo guardar el draft del carrito.', { flow, itemCount: cart.length }); });
  }, [key, readyKey, cart, flow]);
  return () => {
    setReadyKey("");
    if (key)
      writes.current = writes.current
        .catch(() => { logger.debug('Error previo al limpiar draft del carrito.'); })
        .then(() => AsyncStorage.removeItem(key))
        .catch(() => { logger.debug('No se pudo limpiar el draft del carrito.', { flow }); });
  };
}
