import { eventBus } from '@/utils/eventBus';

export const REALTIME_EVENT_NAMES = {
  sseEvent: "sse_event",
  refreshRequests: "refresh_requests",
  refreshSales: "refresh_sales",
  refreshAnticipos: "refresh_anticipos",
  refreshCuentas: "refresh_cuentas",
} as const;

export type RealtimePayload = {
  type?: string;
  data?: any;
  [key: string]: any;
};

const DASHBOARD_REFRESH_EVENTS = new Set([
  "new_order",
  "new_service_request",
  "order_updated",
  "service_request_approved",
  "room_occupied",
]);

const SALE_REFRESH_EVENTS = new Set([
  "sale_created",
  "new_sale",
  "sale_updated",
  "sale_cancelled",
]);

const REQUEST_REFRESH_EVENTS = new Set([
  "new_order",
  "new_service_request",
  "new_anticipo_request",
  "anticipo_processed",
  "anticipo_delivered",
  "order_deleted",
  "order_updated",
  "service_request_approved",
  "service_request_rejected",
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
