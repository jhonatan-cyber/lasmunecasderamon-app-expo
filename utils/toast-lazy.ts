/**
 * Avisos in-app: fachada histórica sobre la cola propia de notificaciones
 * (`utils/inAppNotifications`). Las pantallas siguen llamando a `showToast`.
 */
export {
  showToast,
  hideToast,
  type AppNotificationType,
  type ShowToastParams,
} from '@/utils/inAppNotifications';
