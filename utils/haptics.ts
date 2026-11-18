import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function run(action: () => Promise<void>) {
  try {
    if (Platform.OS === 'web') return;
    void action().catch(() => {});
  } catch {
    // Algunos dispositivos no exponen motor háptico.
  }
}

/** Feedback táctil unificado: no hace nada en web y nunca rompe la UI. */
export const haptic = {
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  confirm: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  select: () => run(() => Haptics.selectionAsync()),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
