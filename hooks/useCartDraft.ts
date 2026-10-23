import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";

/** User and flow scoped cart; restore before saving the initial empty state. */
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
      .catch(() => {})
      .finally(() => {
        if (alive) setReadyKey(key);
      });
    return () => {
      alive = false;
    };
  }, [key]);
  useEffect(() => {
    if (!key || readyKey !== key) return;
    const snapshot = JSON.stringify(cart);
    writes.current = writes.current
      .catch(() => {})
      .then(() =>
        cart.length
          ? AsyncStorage.setItem(key, snapshot)
          : AsyncStorage.removeItem(key),
      )
      .catch(() => {});
  }, [key, readyKey, cart]);
  return () => {
    setReadyKey("");
    if (key)
      writes.current = writes.current
        .catch(() => {})
        .then(() => AsyncStorage.removeItem(key))
        .catch(() => {});
  };
}
