import React, { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import EventSource from "react-native-sse";
import { showToast, ToastComponent } from '@/utils/toast-lazy';
import { API_URL } from "@/api/client";
import * as Haptics from 'expo-haptics';
import { useAuthStore } from "@/store/authStore";
import { ensureTokenInMemory, refreshAccessToken } from "@/api/token";
import { connectivity } from "@/services/connectivity";
import {
  emitRefreshAnticipos,
  emitRefreshBar,
  emitRefreshCuentas,
  emitRefreshEntradas,
  emitRefreshCategories,
  emitRefreshGratificaciones,
  emitRefreshPersonal,
  emitRefreshRequests,
  emitRefreshRooms,
  emitRefreshSales,
  emitResourceUpdatedEvents,
  emitSseEvent,
  isSseControlEvent,
} from "@/utils/realtime";
import { attendanceService } from "@/services/attendance";
import type { SSEPayload } from '../types/realtime';
import {
  getUserRole,
  getUserRoleName,
  isCajeroOrAdminRole,
  isCajeroRole,
  isBarmanRole,
} from "@/utils/userRole";

import logger from '@/utils/logger';
import { formatCurrency } from '@/utils/format';
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

  const handleServerEvent = useCallback((payload: SSEPayload) => {
    const freshUser = useAuthStore.getState().user;
    const roleName = getUserRoleName(freshUser);
    const lowerRole = getUserRole(freshUser);
    const isCajeroOrAdmin = isCajeroOrAdminRole(freshUser);
    const data = (payload.data || {}) as any;
    const isRequester =
      data.usuario_id != null && String(data.usuario_id) === String(freshUser?.id ?? ""); logger.debug(`[NotificationContext] Rol detectado: ${roleName} (${lowerRole}), ?Es Cajero/Admin?: ${isCajeroOrAdmin}`);

    switch (payload.type) {
      case "new_order":
      case "new_service_request":
        if (isCajeroOrAdmin) {
          const isOrder = payload.type === "new_order";
          const id = isOrder ? data.id : data.id_solicitud || data.id;

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({
            type: "order",
            text1: isOrder ? "¡Nuevo Pedido!" : "Solicitud de Servicio",
            text2: isOrder ? `${data.codigo} - ${data.cliente}` : `ID: ${data.id} - ${data.descripcion || "Sin descripción"}`,
            visibilityTime: 6000,
          });

          showLocalNotification(
            isOrder ? "Nuevo Pedido" : "Solicitud de Servicio",
            isOrder ? `Pedido: ${data.codigo}` : data.descripcion
          );
          emitRefreshRequests(payload);

          if (id) {
            router.push({
              pathname: "/(app)/cajero/solicitudes",
              params: { openId: String(id), type: payload.type }
            } as any);
          }
        }
        break;

      case "new_anticipo_request":
        if (isCajeroOrAdmin) {
          const body = `${data.nick || data.empleado || "Empleado"} solicito un anticipo por $${Number(data.monto || 0).toLocaleString("es-ES")}`;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast({
            type: "info",
            text1: "Nueva solicitud de anticipo",
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification("Nueva solicitud de anticipo", body);
          emitRefreshRequests(payload);
        }
        break;

      case "ANTICIPO_PROCESSED":
      case "anticipo_processed": {
        const approved =
          payload.data?.status === "approved" || Number(payload.data?.estado) === 1;
        const title = approved ? "Anticipo aceptado" : "Anticipo rechazado";
        const who = payload.data?.nick || payload.data?.empleado || payload.data?.usuario || "Empleado";
        const body = `${who} - $${Number(payload.data?.monto || 0).toLocaleString("es-ES")}`;

        if (isCajeroRole(freshUser) || isRequester) {
          Haptics.notificationAsync(
            approved
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning
          );
          showToast({
            type: approved ? "success" : "error",
            text1: title,
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification(title, body);
        }

        if (isCajeroRole(freshUser)) {
          emitRefreshRequests(payload);
        }

        if (isRequester) {
          emitRefreshAnticipos(payload);
        }
        break;
      }

      case "anticipo_delivered":
        if (isCajeroRole(freshUser) || isRequester) {
          const body = `${payload.data?.nick || payload.data?.empleado || "Empleado"} - $${Number(payload.data?.monto || 0).toLocaleString("es-ES")}`;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({
            type: "success",
            text1: "Anticipo entregado",
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification("Anticipo entregado", body);
        }

        if (isCajeroRole(freshUser)) {
          emitRefreshRequests(payload);
        }

        if (isRequester) {
          emitRefreshAnticipos(payload);
        }
        break;

      case "timer_started":
      case "timer_stopped":
      case "timer_updated":
      case "timers_updated":
      case "timer_warning_5m":
      case "timer_ended_event":
        break;

      // Una habitación quedó libre (cobro, fin de temporizador o anulación):
      // refresca los selectores de salas en nueva-cuenta/agregar-cuenta.
      case "room_available":
        emitRefreshRooms(payload);
        emitRefreshCuentas(payload);
        break;

      // Un servicio cambió (alta, cambio de estado, reasignación de anfitrionas):
      // puede ocupar o liberar una habitación en otros dispositivos.
      case "service_changed":
        emitRefreshRooms(payload);
        break;

      case "presence_updated":
        emitRefreshPersonal(payload);
        break;

      case "updateSales":
      case "sale_cancelled":
        if (isCajeroOrAdmin) {
          if (payload.type === "sale_cancelled") {
            const saleData = (payload.data || {}) as any;
            showToast({
              type: "success",
              text1: "Venta Anulada",
              text2: `Total: $${Number(saleData.total || 0).toLocaleString('es-ES')}`,
              visibilityTime: 4000,
            });
          }
          emitRefreshSales();
          emitRefreshRequests();
        }
        break;

      case "transfers_updated": {
        emitRefreshBar(payload);
        if (data.action === "created" && isBarmanRole(freshUser)) {
          const cantidad = Number(data.cantidad || 0);
          const body = cantidad > 0
            ? `${cantidad} unidad(es) esperan tu aprobación en el bar.`
            : "Tienes un nuevo traspaso pendiente de aprobación.";
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast({
            type: "info",
            text1: "Nuevo traspaso pendiente",
            text2: body,
            visibilityTime: 7000,
          });
          void showLocalNotification("Nuevo traspaso pendiente", body);
        }
        break;
      }

      case "order_deleted":
      case "order_updated":
      case "service_request_processed":
        if (isCajeroOrAdmin) {
          emitRefreshRequests();
        }
        break;

      case "entrada_registrada": {
        if (!isCajeroOrAdmin && !isBarmanRole(freshUser)) break;
        const cantidad = Number(data.cantidad || 1);
        const cliente = String(data.cliente_nombre || "Cliente sin nombre");
        const total = Number(data.monto_total || 0);
        const body = `${cantidad === 1 ? "1 entrada" : `${cantidad} entradas`
          } · ${cliente}${total > 0 ? ` · ${formatCurrency(total)}` : ""}`;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          type: "order",
          text1:
            cantidad === 1
              ? "Nueva entrada en la puerta"
              : `${cantidad} entradas en la puerta`,
          text2: body,
          visibilityTime: 7000,
        });
        void showLocalNotification("Nueva entrada en la puerta", body);
        emitRefreshEntradas(payload);
        break;
      }

      case "entrada_actualizada":
        emitRefreshEntradas(payload);
        break;
      case "resource_updated":
        emitResourceUpdatedEvents(data.module, payload);
        break;

      case "ping":
        break;

      case "anulacion_processed":
        if (isCajeroOrAdmin) {
          const approved = payload.data?.accion === "confirmar";
          const title = approved ? "Solicitud aprobada" : "Solicitud rechazada";
          const body = `${payload.data?.codigo || "N/A"} - ${payload.data?.clienteNombre || "Sin cliente"}`;
          const tipo = payload.data?.tipo;

          Haptics.notificationAsync(
            approved
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning
          );
          showToast({
            type: approved ? "success" : "error",
            text1: title,
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification(title, body);
          emitRefreshRequests(payload);
          if (tipo === "cuenta") {
            emitRefreshCuentas(payload);
          } else if (tipo === "venta") {
            emitRefreshSales(payload);
          }
        }
        break;

      case "bar_shot_alert": {
        const alertas = Array.isArray(data.alertas) ? data.alertas : [];
        const nombres = alertas
          .map((a: any) => a?.nombre)
          .filter(Boolean)
          .slice(0, 2)
          .join(", ");
        const body =
          data.mensaje || (nombres ? `Por agotarse: ${nombres}` : "Revisa el stock del bar");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast({
          type: "warning",
          text1: "Botella por agotarse",
          text2: body,
          visibilityTime: 6000,
        });
        showLocalNotification("Botella por agotarse", body);
        emitRefreshBar(payload);
        break;
      }

      case "warehouse_container_alert": {
        if (Number(data.vencidos || 0) > 0) {
          const body =
            data.mensaje ||
            `${Number(data.pendientes || 0)} envase(s) esperan recepción en almacén.`;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast({
            type: "warning",
            text1: "Envases sin recibir",
            text2: body,
            visibilityTime: 6000,
          });
          showLocalNotification("Envases sin recibir", body);
        }
        break;
      }

      case "container_return_pending": {
        if (!isCajeroOrAdminRole(user)) break;
        const aprobables = Number(data.aprobables || 0);
        const rechazados = Number(data.rechazados || 0);
        const body = data.mensaje || `Hay ${aprobables} devolución(es) para aprobar y ${rechazados} código(s) rechazado(s).`;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast({
          type: "warning",
          text1: "Lote de envases para revisar",
          text2: body,
          visibilityTime: 7000,
        });
        void scheduleLocalNotificationAsync("Lote de envases para revisar", body, {
          type: "container_return_pending",
          batchId: data.batchId,
        });
        break;
      }

      case "categories_updated":
        emitRefreshCategories(payload);
        break;

      case "check_attendance": {
        const rolesAfectados = (Array.isArray(data.roles) ? data.roles : [])
          .map((r: unknown) => String(r).toLowerCase());
        if (rolesAfectados.length > 0 && !rolesAfectados.includes(lowerRole)) break;
        void (async () => {
          try {
            const res = await attendanceService.hoy();
            const filas = Array.isArray((res as any)?.data) ? (res as any).data : [];
            const registrada = filas.some(
              (f: any) => String(f?.id_usuario) === String(freshUser?.id ?? ""),
            );
            if (registrada) return;
            const body =
              data.message || "No registraste tu asistencia hoy. Ingresa nuevamente para registrarla.";
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showToast({
              type: "warning",
              text1: "Asistencia no registrada",
              text2: body,
              visibilityTime: 6000,
            });
            await showLocalNotification("Asistencia no registrada", body);
            void useAuthStore.getState().logout();
          } catch (e) {
            logger.debug("[NotificationContext] check_attendance sin verificar", { e });
          }
        })();
        break;
      }

      case "permissions-updated":
        if (data.roleId) {
          void useAuthStore.getState().refreshUser();
        } else {
          showToast({
            type: "info",
            text1: "Permisos actualizados",
            text2: "Se aplicarán a tus próximas acciones",
            visibilityTime: 4000,
          });
          void useAuthStore.getState().refreshUser();
        }
        break;

      case "role-deleted":
        void useAuthStore.getState().refreshUser().then((ok) => {
          if (!ok) void useAuthStore.getState().logout();
        });
        break;

      case "new_gratificacion_request": {
        const body = `${data.empleado || data.nick || "Empleado"} solicitó una gratificación de $${Number(data.monto || 0).toLocaleString("es-ES")}`;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast({
          type: "info",
          text1: "Nueva solicitud de gratificación",
          text2: body,
          visibilityTime: 5000,
        });
        showLocalNotification("Nueva solicitud de gratificación", body);
        emitRefreshGratificaciones(payload);
        break;
      }

      case "gratificacion_processed": {
        const aprobada = data.accion === "approve" || Number(data.estado) === 1;
        const body = `${data.nick || data.empleado || "Empleado"} - $${Number(data.monto || 0).toLocaleString("es-ES")}`;
        Haptics.notificationAsync(
          aprobada
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
        showToast({
          type: aprobada ? "success" : "error",
          text1: aprobada ? "Gratificación aprobada" : "Gratificación rechazada",
          text2: body,
          visibilityTime: 5000,
        });
        showLocalNotification(aprobada ? "Gratificación aprobada" : "Gratificación rechazada", body);
        emitRefreshGratificaciones(payload);
        break;
      }

      case "security_alert": {
        const critico = ["high", "critical"].includes(String(data.severity || "").toLowerCase());
        const body = data.message || "Revisa la actividad reciente en el dashboard.";
        Haptics.notificationAsync(
          critico
            ? Haptics.NotificationFeedbackType.Error
            : Haptics.NotificationFeedbackType.Warning,
        );
        showToast({
          type: critico ? "error" : "warning",
          text1: "Alerta de seguridad",
          text2: body,
          visibilityTime: 7000,
        });
        showLocalNotification("Alerta de seguridad", body);
        break;
      }

      case "force_logout": {
        const reason = data.message || "Tu cuenta fue eliminada.";
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast({ type: "error", text1: "Sesión cerrada", text2: reason, visibilityTime: 5000 });
        void showLocalNotification("Sesión cerrada", reason);
        void useAuthStore.getState().logout();
        break;
      }

      default:
        logger.info('[NotificationContext] Evento SSE no manejado específicamente', { type: payload.type });
    }
  }, [router, showLocalNotification, user]);

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
