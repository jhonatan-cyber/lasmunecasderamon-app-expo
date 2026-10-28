import { useEffect, useRef } from "react";
import { eventBus } from "@/utils/eventBus";

export function useDebouncedEventListener<T = unknown>(
  event: string,
  callback: (payload: T) => void,
  delayMs = 500,
  enabled = true,
) {
  const callbackRef = useRef(callback);
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

export function useDebouncedEventListeners<T = unknown>(
  events: readonly string[],
  callback: (payload: T) => void,
  delayMs = 500,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  const eventsKey = events.join("|");

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const subs = eventsKey
      .split("|")
      .filter(Boolean)
      .map((event) =>
        eventBus.addListener(event, (payload: T) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            timer = null;
            callbackRef.current(payload);
          }, delayMs);
        }),
      );
    return () => {
      if (timer) clearTimeout(timer);
      subs.forEach((sub) => sub.remove());
    };
  }, [eventsKey, delayMs, enabled]);
}
