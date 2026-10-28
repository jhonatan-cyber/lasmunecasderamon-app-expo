import { eventBus } from '@/utils/eventBus';

export const REALTIME_EVENT_NAMES = {
  sseEvent: "sse_event",
  refreshRequests: "refresh_requests",
  refreshSales: "refresh_sales",
  refreshAnticipos: "refresh_anticipos",
  refreshCuentas: "refresh_cuentas",
  refreshBar: "refresh_bar",
  refreshEntradas: "refresh_entradas",
  refreshCategories: "refresh_categories",
  refreshGratificaciones: "refresh_gratificaciones",
  refreshRooms: "refresh_rooms",
  refreshPersonal: "refresh_personal",
  refreshClients: "refresh_clients",
  refreshProducts: "refresh_products",
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

export const emitRefreshBar = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshBar", payload);
};

export const emitRefreshEntradas = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshEntradas", payload);
};

export const emitRefreshCategories = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshCategories", payload);
};

export const emitRefreshGratificaciones = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshGratificaciones", payload);
};

export const emitRefreshRooms = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshRooms", payload);
};

export const emitRefreshPersonal = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshPersonal", payload);
};

export const emitRefreshClients = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshClients", payload);
};

export const emitRefreshProducts = (payload?: RealtimePayload) => {
  emitRealtimeEvent("refreshProducts", payload);
};

const RESOURCE_UPDATED_MODULES: Record<
  string,
  ReadonlyArray<keyof typeof REALTIME_EVENT_NAMES>
> = {
  users: ["refreshPersonal", "refreshCuentas"],
  hostesses: ["refreshPersonal"],
  attendance: ["refreshPersonal"],
  rooms: ["refreshRooms", "refreshCuentas"],
  private_rooms: ["refreshRooms", "refreshCuentas"],
  products: ["refreshProducts", "refreshCategories"],
  categories: ["refreshCategories"],
  clients: ["refreshClients"],
  entradas: ["refreshEntradas"],
};

export const emitResourceUpdatedEvents = (
  module?: string | null,
  payload?: RealtimePayload,
) => {
  if (!module) return;
  const events = RESOURCE_UPDATED_MODULES[module.toLowerCase()];
  if (!events) return;
  events.forEach((event) => emitRealtimeEvent(event, payload));
};
