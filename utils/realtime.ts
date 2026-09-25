import { eventBus } from '@/utils/eventBus';

export const REALTIME_EVENT_NAMES = {
  sseEvent: "sse_event",
  refreshRequests: "refresh_requests",
  refreshSales: "refresh_sales",
  refreshAnticipos: "refresh_anticipos",
  refreshCuentas: "refresh_cuentas",
  refreshBar: "refresh_bar",
  refreshCategories: "refresh_categories",
  refreshGratificaciones: "refresh_gratificaciones",
} as const;

export type RealtimePayload = {
  type?: string;
  data?: any;
  [key: string]: any;
};

// Listas alineadas con el catálogo único del dashboard:
// lasemasderamon-dashboard/lib/api/sseEvents.ts (SSE_EVENTS).
const DASHBOARD_REFRESH_EVENTS = new Set([
  "new_order",
  "new_service_request",
  "order_updated",
  "order_deleted",
  "service_request_processed",
  "service_request_deleted",
  "service_changed",
  "room_available",
]);

// El backend no emite sale_created/sale_updated: las ventas se refrescan con
// updateSales (cron de timers) y sale_cancelled (anulación).
const SALE_REFRESH_EVENTS = new Set([
  "updateSales",
  "sale_cancelled",
]);

const REQUEST_REFRESH_EVENTS = new Set([
  "new_order",
  "new_service_request",
  "new_anticipo_request",
  "anticipo_processed",
  "ANTICIPO_PROCESSED",
  "anticipo_delivered",
  "order_deleted",
  "order_updated",
  "service_request_processed",
  "service_request_deleted",
  "anulacion_processed",
]);

const CONTROL_EVENTS = new Set(["connected", "ping"]);

export const isSseControlEvent = (type?: string | null) => {
  if (!type) return false;
  return CONTROL_EVENTS.has(type);
};

export const shouldInvalidateDashboardFromSse = (type?: string | null) => {
  if (!type) return false;
  return DASHBOARD_REFRESH_EVENTS.has(type);
};

export const shouldRefreshSalesFromSse = (type?: string | null) => {
  if (!type) return false;
  return SALE_REFRESH_EVENTS.has(type);
};

export const shouldRefreshRequestsFromSse = (type?: string | null) => {
  if (!type) return false;
  return REQUEST_REFRESH_EVENTS.has(type);
};

export const emitRealtimeEvent = (
  eventName: keyof typeof REALTIME_EVENT_NAMES,
  payload?: RealtimePayload,
) => {
  eventBus.emit(REALTIME_EVENT_NAMES[eventName], payload);
};

export const emitSseEvent = (payload: RealtimePayload) => {
  emitRealtimeEvent("sseEvent", payload);
};

export const emitRefreshRequests = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshRequests", payload);
};

export const emitRefreshSales = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshSales", payload);
};

export const emitRefreshAnticipos = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshAnticipos", payload);
};

export const emitRefreshCuentas = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshCuentas", payload);
};

/** Stock del bar: lo dispara `bar_shot_alert` cuando una botella se agota. */
export const emitRefreshBar = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshBar", payload);
};

/** Catálogo de productos: lo dispara `categories_updated` (crud en el dashboard). */
export const emitRefreshCategories = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshCategories", payload);
};

/** Lista de gratificaciones: la disparan `new_gratificacion_request` y `gratificacion_processed`. */
export const emitRefreshGratificaciones = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshGratificaciones", payload);
};
