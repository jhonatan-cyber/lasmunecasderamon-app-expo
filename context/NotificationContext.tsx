import React, { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import EventSource from "react-native-sse";
import { ToastComponent } from '@/utils/toast-lazy';
import { API_URL } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { ensureTokenInMemory, refreshAccessToken } from "@/api/token";
import { connectivity } from "@/services/connectivity";
import { emitSseEvent, isSseControlEvent } from "@/utils/realtime";
import type { SSEPayload } from '../types/realtime';
import { handleNotificationEvent } from './notifications/handleServerEvent';

import logger from '@/utils/logger';
import {
  configureNotifications,
  registerForPushNotificationsAsync,
  scheduleLocalNotificationAsync,
} from '@/services/pushNotifications';

interface NotificationContextType {
  showLocalNotification: (title: string, body: string) => Promise<void>;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const connectSSERef = useRef<() => Promise<void>>(async () => { });
  const consecutiveErrorsRef = useRef(0);
  const refreshTriedRef = useRef(false);

  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 30000;
  const BACKOFF_FACTOR = 2;
  const JITTER_MAX = 0.3;
  const ERRORS_BEFORE_REFRESH = 3;

  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;

    const attempt = retryCountRef.current + 1;
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(BACKOFF_FACTOR, retryCountRef.current),
      MAX_RETRY_DELAY
    );

    const jitter = delay * JITTER_MAX * (Math.random() * 2 - 1);
    const finalDelay = Math.round(delay + jitter);

    retryCountRef.current = attempt;

    logger.info('[NotificationContext] Programando reconexión SSE', {
      attempt,
      delayMs: finalDelay
    });

    retryTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        void connectSSERef.current();
      }
    }, finalDelay);
  }, []);

  useEffect(() => {
    configureNotifications();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void registerForPushNotificationsAsync().catch((error) => {
      logger.debug('[NotificationContext] No se pudo registrar push', { error });
    });
  }, [user?.id]);

  const showLocalNotification = useCallback(async (title: string, body: string) => {
    await scheduleLocalNotificationAsync(title, body);
  }, []);

  const handleServerEvent = useCallback(
    (payload: SSEPayload) =>
      handleNotificationEvent(payload, {
        router,
        user,
        showLocalNotification,
      }),
    [router, showLocalNotification, user],
  );

  const connectSSE = useCallback(async () => {
    if (!user?.id) return;

    if (connectivity.isOffline()) {
      logger.debug('[NotificationContext] SSE en pausa: sin red confirmada');
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const sseUrl = `${API_URL}/notifications/sse`;
    logger.info('[NotificationContext] Conectando SSE', {
      url: sseUrl,
      attempt: retryCountRef.current + 1
    });

    const token = await ensureTokenInMemory();

    let es: EventSource | null = null;
    try {
      es = new EventSource(sseUrl, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      eventSourceRef.current = es;

      es.addEventListener("message", (event: { data?: string | null }) => {
        if (!event.data) {
          logger.info('[NotificationContext] Evento SSE vacío');
          return;
        }
        consecutiveErrorsRef.current = 0;
        refreshTriedRef.current = false;
        try {
          const payload: SSEPayload = JSON.parse(event.data);
          logger.debug('[NotificationContext] Evento SSE recibido', { type: payload.type, id: payload.data?.id || '' });

          if (!isSseControlEvent(payload.type)) {
            emitSseEvent(payload);
          }
          handleServerEvent(payload);
        } catch (err) {
          logger.captureException(err, { context: 'NotificationContext:parseEvent' });
        }
      });

      es.addEventListener("open", () => {
        if (!isMountedRef.current) return;
        retryCountRef.current = 0;
        consecutiveErrorsRef.current = 0;
        refreshTriedRef.current = false;
        setIsConnected(true);
        logger.debug('[NotificationContext] Conexión SSE establecida con éxito');
      });

      es.addEventListener("error", () => {
        if (!isMountedRef.current) return;
        consecutiveErrorsRef.current += 1;
        setIsConnected(false);

        if (es) {
          es.close();
        }
        eventSourceRef.current = null;

        if (connectivity.isOffline()) {
          logger.debug('[NotificationContext] SSE caído sin red; espera a online');
          scheduleReconnect();
          return;
        }

        logger.warn('[NotificationContext] Error de conexión SSE, reconectando...', {
          attempt: retryCountRef.current + 1
        });

        if (consecutiveErrorsRef.current >= ERRORS_BEFORE_REFRESH && !refreshTriedRef.current) {
          refreshTriedRef.current = true;
          void refreshAccessToken().then((ok) => {
            if (!isMountedRef.current) return;
            if (ok) {
              logger.info('[NotificationContext] Sesión renovada tras fallo SSE, reconectando');
              consecutiveErrorsRef.current = 0;
              retryCountRef.current = 0;
              void connectSSERef.current();
            } else {
              scheduleReconnect();
            }
          }).catch(() => {
            if (isMountedRef.current) scheduleReconnect();
          });
          return;
        }

        scheduleReconnect();
      });

    } catch (err) {
      logger.captureException(err, { context: 'NotificationContext:connectSSE' });
      if (!isMountedRef.current) return;
      setIsConnected(false);
      scheduleReconnect();
    }
  }, [user?.id, handleServerEvent, scheduleReconnect]);

  useEffect(() => {
    connectSSERef.current = connectSSE;
  });

  useEffect(() => {
    if (!user?.id) return;
    void connectivity.start();
    const unsubscribe = connectivity.subscribe((state) => {
      if (!isMountedRef.current) return;
      if (state === 'offline') {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        setIsConnected(false);
      } else if (state === 'online') {
        retryCountRef.current = 0;
        consecutiveErrorsRef.current = 0;
        refreshTriedRef.current = false;
        void connectSSE();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [user?.id, connectSSE]);

  useEffect(() => {
    if (!user?.id) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !isMountedRef.current) return;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      retryCountRef.current = 0;
      consecutiveErrorsRef.current = 0;
      refreshTriedRef.current = false;
      void connectSSERef.current();
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!user?.id) return;
    void connectSSE();

    return () => {
      isMountedRef.current = false;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      retryCountRef.current = 0;
      setIsConnected(false);
    };
  }, [user?.id, connectSSE]);

  const contextValue = useMemo(
    () => ({ showLocalNotification, isConnected }),
    [showLocalNotification, isConnected],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <Suspense fallback={null}>
        <ToastComponent position="top" topOffset={60} />
      </Suspense>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
