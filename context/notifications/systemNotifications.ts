import { AppState } from 'react-native';
import { scheduleLocalNotificationAsync } from '@/services/pushNotifications';

/**
 * Aviso del sistema solo fuera del primer plano: con la app abierta el banner
 * in-app ya informa y una notificación adicional sería un duplicado.
 */
export async function notifyInBackground(title: string, body: string): Promise<void> {
  if (AppState.currentState === 'active') return;
  await scheduleLocalNotificationAsync(title, body);
}
