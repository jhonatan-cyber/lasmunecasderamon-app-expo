import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  getCurrentNotification,
  hideToast,
  subscribeNotifications,
  type AppNotificationType,
} from '@/utils/inAppNotifications';
import { useModalLayerOpen } from '@/utils/modalLayer';
import { FontFamily } from '@/constants/fonts';
import { FontSize, BorderRadius } from '@/constants/spacing';

interface Props {
  /**
   * Dónde vive la instancia. La raíz cede el turno mientras hay un modal
   * nativo abierto (él queda encima); el modal muestra la suya dentro de su
   * propia ventana.
   */
  layer?: 'root' | 'modal';
}

const HIDDEN_OFFSET = -140;
const SAFE_AREA_GAP = 8;

const TYPE_META: Record<
  AppNotificationType,
  { icon: ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  success: { icon: 'checkmark-circle', color: '#10B981' },
  error: { icon: 'alert-circle', color: '#EF4444' },
  info: { icon: 'information-circle', color: '#3B82F6' },
  warning: { icon: 'warning', color: '#F59E0B' },
  order: { icon: 'receipt-outline', color: '' },
};

export function NotificationBanner({ layer = 'root' }: Props) {
  const { isDark, cardBg, textPrimary, textSecondary, accentColor } = useAccentColor();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const modalLayerOpen = useModalLayerOpen();
  const notification = useSyncExternalStore(subscribeNotifications, getCurrentNotification);

  const [{ translateY, opacity, progress }] = useState(() => ({
    translateY: new Animated.Value(HIDDEN_OFFSET),
    opacity: new Animated.Value(0),
    // El driver nativo no admite `width`; el ancho de la barra corre en JS.
    progress: new Animated.Value(1),
  }));

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: HIDDEN_OFFSET, duration: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 160, useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (finished) hideToast();
    });
  }, [opacity, progress, translateY]);

  // `dismiss` es estable, así que el PanResponder puede capturarlo una sola vez.
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy < -6,
      onPanResponderMove: (_event, gesture) => {
        if (gesture.dy < 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy < -30) dismiss();
        else {
          if (reducedMotion) {
            Animated.timing(translateY, { toValue: 0, duration: 160, useNativeDriver: true }).start();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        }
      },
    })
  );

  const notificationId = notification?.id ?? null;

  useEffect(() => {
    if (notificationId === null) return;
    translateY.setValue(HIDDEN_OFFSET);
    opacity.setValue(0);
    progress.setValue(1);
    const barra = Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: false });
    if (reducedMotion) {
      // Fade-only cuando el usuario prefiere movimiento reducido.
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        barra,
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 9,
          tension: 70,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        barra,
      ]).start();
    }
  }, [notificationId, opacity, progress, translateY, reducedMotion]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(dismiss, notification.visibilityTime);
    return () => clearTimeout(timer);
  }, [notification, dismiss]);

  if (!notification) return null;
  if (layer === 'root' && modalLayerOpen) return null;

  const meta = TYPE_META[notification.type];
  // El tipo "order" usa el acento del usuario en lugar de un color fijo.
  const metaColor = meta.color || accentColor;
  const titleColor = textPrimary;
  const messageColor = textSecondary;
  const label = [notification.text1, notification.text2].filter(Boolean).join('. ');

  // Borde neón en modo oscuro con el color del tipo
  const neonGlow = isDark ? {
    shadowColor: metaColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  } : {};

  return (
    <View
      testID="toast-overlay"
      pointerEvents="box-none"
      style={[styles.overlay, { paddingTop: insets.top + SAFE_AREA_GAP }]}
    >
      <Animated.View
        {...panResponder.panHandlers}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={label}
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            shadowOpacity: isDark ? 0.3 : 0.1,
            borderColor: isDark ? metaColor : 'transparent',
            borderWidth: isDark ? 1 : 0,
            opacity,
            transform: [{ translateY }],
            ...neonGlow,
          },
        ]}
      >
        <Pressable onPress={dismiss} style={styles.content} accessibilityRole="button" accessibilityLabel={`Cerrar notificación: ${notification.text1 || 'Notificación'}`}>
          <View style={[styles.iconCircle, { backgroundColor: `${metaColor}1F` }]}>
            <Ionicons name={meta.icon} size={22} color={metaColor} />
          </View>
          <View style={styles.texts}>
            {notification.text1 ? (
              <Text numberOfLines={1} style={[styles.title, { color: titleColor }]}>
                {notification.text1}
              </Text>
            ) : null}
            {notification.text2 ? (
              <Text numberOfLines={2} style={[styles.message, { color: messageColor }]}>
                {notification.text2}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {/* Progress bar de tiempo restante en modo oscuro */}
        {isDark && (
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: `${metaColor}30`,
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                borderRadius: 0,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: metaColor,
                  // Animado con su propio valor y driver JS: `width` no existe en
                  // el módulo nativo de animación (ese era el aviso en consola).
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  height: '100%',
                  borderRadius: 0,
                },
              ]}
            />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
  },
  card: {
    width: '92%',
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
  },
  message: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    marginTop: 2,
  },
});
