import * as Notifications from "expo-notifications";
import React, { createContext, Suspense, useCallback, useContext, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import EventSource from "react-native-sse";
import { showToast, ToastComponent } from '@/utils/toast-lazy';
import { API_URL } from "@/api/client";
import * as Haptics from 'expo-haptics';
import { useAuthStore } from "@/store/authStore";
import { ensureTokenInMemory } from "@/api/token";
import {
  emitRefreshAnticipos,
  emitRefreshBar,
  emitRefreshCuentas,
  emitRefreshCategories,
  emitRefreshGratificaciones,
  emitRefreshRequests,
  emitRefreshSales,
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
} from "@/utils/userRole";

import logger from '@/utils/logger';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  
  // ─── Reconexión SSE con exponential backoff ─────────────────
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  
  const INITIAL_RETRY_DELAY = 1000;   // 1 segundo
  const MAX_RETRY_DELAY = 30000;      // 30 segundos
  const BACKOFF_FACTOR = 2;
  const JITTER_MAX = 0.3;             // 30% de jitter para evitar thundering herd

  const showLocalNotification = useCallback(async (title: string, body: string) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { data: "local" },
        },
        trigger: null,
      });
    } catch {

    }
  }, []);

  const handleServerEvent = useCallback((payload: SSEPayload) => {
    const roleName = getUserRoleName(user);
    const lowerRole = getUserRole(user);
    const isCajeroOrAdmin = isCajeroOrAdminRole(user);
    const data = (payload.data || {}) as any;
    const isRequester =
      data.usuario_id != null && String(data.usuario_id) === String(user?.id ?? "");        logger.debug(`[NotificationContext] Rol detectado: ${roleName} (${lowerRole}), ?Es Cajero/Admin?: ${isCajeroOrAdmin}`);

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
        // Variantes de payload: `anticipo_processed` trae {status, nick|empleado,
        // usuario_id}; `ANTICIPO_PROCESSED` (otorgado en caja) trae {estado, usuario}.
        const approved =
          payload.data?.status === "approved" || Number(payload.data?.estado) === 1;
        const title = approved ? "Anticipo aceptado" : "Anticipo rechazado";
        const who = payload.data?.nick || payload.data?.empleado || payload.data?.usuario || "Empleado";
        const body = `${who} - $${Number(payload.data?.monto || 0).toLocaleString("es-ES")}`;

        if (isCajeroRole(user) || isRequester) {
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

        if (isCajeroRole(user)) {
          emitRefreshRequests(payload);
        }

        if (isRequester) {
          emitRefreshAnticipos(payload);
        }
        break;
      }

      case "anticipo_delivered":
        if (isCajeroRole(user) || isRequester) {
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

        if (isCajeroRole(user)) {
          emitRefreshRequests(payload);
        }

        if (isRequester) {
          emitRefreshAnticipos(payload);
        }
        break;

      // Temporizadores y salas: los consume useSSETimerHandler / las pantallas
      // de sala vía eventBus; acá solo se tragan para no caer en el default.
      case "timer_started":
      case "timer_stopped":
      case "timer_updated":
      case "timers_updated":
      case "timer_warning_5m":
      case "timer_ended_event":
      case "room_available":
        break;

      // updateSales: el cron de timers finaliza ventas/servicios → solo refresco.
      // sale_cancelled: payload { ventaId, total, cajaId } → avisa y refresca.
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

      case "order_deleted":
      case "order_updated":
      case "service_request_processed":
        if (isCajeroOrAdmin) {
          emitRefreshRequests();
        }
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

      // ─── Alertas del bar y del almacén ────────────────────────────────────
      // `bar_shot_alert` (audiencia: barman + administrador, la define sseEvents.ts
      // del dashboard): una botella abierta bajó del umbral de shots configurado
      // en Configuraciones → Bar. El servidor ya manda `mensaje` armado.
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
        // La pantalla Bar (si está abierta) refresca su stock con los ml actuales.
        emitRefreshBar(payload);
        break;
      }

      // `warehouse_container_alert` (audiencia: almacén + administrador): envases
      // entregados por el bar hace más de 2 h sin recepción. Con `vencidos = 0` el
      // servidor avisa que ya todo fue recibido: eso no es una alerta, se omite.
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

      // ─── Catálogo, asistencia, permisos y alertas ────────────────────────
      // `categories_updated` (todo el personal): las pantallas de venta/cuenta
      // abiertas refrescan solo la lista de categorías, sin tocar carrito ni
      // la selección actual (consumen `refresh_categories`).
      case "categories_updated":
        emitRefreshCategories(payload);
        break;

      // `check_attendance` (cron de las 21:00, payload {roles, message}): igual
      // que el dashboard, si el personal afectado no registró asistencia hoy se
      // le pide re-ingresar — el login vuelve a registrarla.
      case "check_attendance": {
        const rolesAfectados = (Array.isArray(data.roles) ? data.roles : [])
          .map((r: unknown) => String(r).toLowerCase());
        if (rolesAfectados.length > 0 && !rolesAfectados.includes(lowerRole)) break;
        void (async () => {
          try {
            const res = await attendanceService.hoy();
            const filas = Array.isArray((res as any)?.data) ? (res as any).data : [];
            const registrada = filas.some(
              (f: any) => String(f?.id_usuario) === String(user?.id ?? ""),
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
            // Sin red no se castiga: el próximo evento volverá a chequear.
            logger.debug("[NotificationContext] check_attendance sin verificar", { e });
          }
        })();
        break;
      }

      // `permissions-updated` (personal no administrador): la app no cachea
      // permisos — el servidor los evalúa por petición y su caché de 60 s ya
      // fue invalidada por el propio cambio. Con `roleId` el cambio es de un rol
      // concreto y la app no guarda ese id: refresh en silencio; sin roleId es
      // global y se avisa, igual que el dashboard web.
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

      // `role-deleted` (payload {roleId}): la sesión de la app tampoco lleva
      // roleId — por eso el servidor lo difunde a todo el personal (sseEvents).
      // Se refresca la sesión; si el rol borrado era el del usuario, /auth/me
      // deja de resolverlo y se cierra la sesión (redirect del dashboard web).
      case "role-deleted":
        void useAuthStore.getState().refreshUser().then((ok) => {
          if (!ok) void useAuthStore.getState().logout();
        });
        break;

      // ─── Gratificaciones (audiencia: solo administración) ───────────────────
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
        // estado: 1 = aprobada, 3 = rechazada; accion: 'approve' | 'reject'.
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

      // `security_alert` (solo administración): severidad high/critical en rojo.
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
        // Cuenta eliminada/desactivada en el dashboard: cerrar sesión local ya.
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

  // ─── Conexión SSE ───────────────────────────────────────────
  // Crea el EventSource, maneja mensajes, open y error.
  // En error → cierra el EventSource y programa reconexión.
  const connectSSE = useCallback(async () => {
    if (!user?.id) return;

    // Cerrar conexión anterior si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const sseUrl = `${API_URL}/notifications/sse`;
    logger.info('[NotificationContext] Conectando SSE', {
      url: sseUrl,
      attempt: retryCountRef.current + 1
    });

    // El endpoint exige sesión (401 NO_TOKEN desde d0bba49): envía el access token.
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
        retryCountRef.current = 0; // Reset retry count on successful connection
        setIsConnected(true);
        logger.info('[NotificationContext] Conexión SSE establecida con éxito');
        showToast({
            type: "success",
            text1: "Conectado",
            text2: "Notificaciones en tiempo real activas",
            visibilityTime: 2000,
        });
      });

      es.addEventListener("error", () => {
        if (!isMountedRef.current) return;
        logger.warn('[NotificationContext] Error de conexión SSE, reconectando...', {
          attempt: retryCountRef.current + 1
        });
        setIsConnected(false);
        // Cerramos el EventSource para evitar su reconexión automática
        // y controlamos nosotros la reconexión con exponential backoff
        if (es) {
          es.close();
        }
        eventSourceRef.current = null;
        scheduleReconnect();
      });

    } catch (err) {
       logger.captureException(err, { context: 'NotificationContext:connectSSE' });
       if (!isMountedRef.current) return;
       setIsConnected(false);
       scheduleReconnect();
    }
  }, [user?.id, handleServerEvent]);

  // ─── Reconexión con exponential backoff ──────────────────────
  // Función normal (no hook) para evitar stale closures.
  // Siempre usa la última versión de connectSSE del closure.
  function scheduleReconnect() {
    if (!isMountedRef.current) return;

    const attempt = retryCountRef.current + 1;
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(BACKOFF_FACTOR, retryCountRef.current),
      MAX_RETRY_DELAY
    );
    // Agregar jitter: ±30% aleatorio para evitar thundering herd
    const jitter = delay * JITTER_MAX * (Math.random() * 2 - 1);
    const finalDelay = Math.round(delay + jitter);

    retryCountRef.current = attempt;

    logger.info('[NotificationContext] Programando reconexión SSE', {
      attempt,
      delayMs: finalDelay
    });

    retryTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        void connectSSE();
      }
    }, finalDelay);
  }

  useEffect(() => {
    // Marcamos como mounted al inicio
    isMountedRef.current = true;
    
    if (!user?.id) return;
    
    // Conectar SSE con reconexión automática (exponential backoff)
    void connectSSE();

    return () => {
      // Limpieza completa al desmontar
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

  return (
    <NotificationContext.Provider value={{ showLocalNotification, isConnected }}>
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
