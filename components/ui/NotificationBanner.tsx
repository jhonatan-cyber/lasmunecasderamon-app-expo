import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  getCurrentNotification,
  hideToast,
  subscribeNotifications,
  type AppNotificationType,
} from '@/utils/inAppNotifications';
import { useModalLayerOpen } from '@/utils/modalLayer';
import { FontFamily } from '@/constants/fonts';

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
  order: { icon: 'receipt-outline', color: '#E11D48' },
};

export function NotificationBanner({ layer = 'root' }: Props) {
  const { isDark } = useAccentColor();
  const insets = useSafeAreaInsets();
  const modalLayerOpen = useModalLayerOpen();
  const notification = useSyncExternalStore(subscribeNotifications, getCurrentNotification);

  const [{ translateY, opacity }] = useState(() => ({
    translateY: new Animated.Value(HIDDEN_OFFSET),
    opacity: new Animated.Value(0),
  }));

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: HIDDEN_OFFSET, duration: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) hideToast();
    });
  }, [opacity, translateY]);

  // `dismiss` es estable, así que el PanResponder puede capturarlo una sola vez.
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy < -6,
      onPanResponderMove: (_event, gesture) => {
        if (gesture.dy < 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy < -30) dismiss();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  );

  const notificationId = notification?.id ?? null;

  useEffect(() => {
    if (notificationId === null) return;
    translateY.setValue(HIDDEN_OFFSET);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 70,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [notificationId, opacity, translateY]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(dismiss, notification.visibilityTime);
    return () => clearTimeout(timer);
  }, [notification, dismiss]);

  if (!notification) return null;
  if (layer === 'root' && modalLayerOpen) return null;

  const meta = TYPE_META[notification.type];
  const titleColor = isDark ? '#F9FAFB' : '#111827';
  const messageColor = isDark ? '#9CA3AF' : '#6B7280';
  const label = [notification.text1, notification.text2].filter(Boolean).join('. ');

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
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            shadowOpacity: isDark ? 0.3 : 0.1,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Pressable onPress={dismiss} style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: `${meta.color}1F` }]}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
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
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
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
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: FontFamily.semibold,
  },
  message: {
    fontSize: 13.5,
    fontFamily: FontFamily.medium,
    marginTop: 2,
  },
});
