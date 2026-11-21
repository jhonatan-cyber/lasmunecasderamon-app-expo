import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { accentTextColor } from '@/utils/color';
import { haptic } from '@/utils/haptics';

export interface ModalBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  height?: number | string;
  contentStyle?: ViewStyle;
  showCloseButton?: boolean;
  scrollable?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
}

/**
 * Reusable bottom sheet modal wrapper.
 * Extracts the common overlay + header + content + action button pattern
 * shared by 33+ modals across the app.
 */
export const ModalBottomSheet: React.FC<ModalBottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  actionLabel,
  onAction,
  height = '85%',
  contentStyle,
  showCloseButton = true,
  scrollable = true,
  animationType = 'slide',
}) => {
  const { accentColor, cardBg, textPrimary, textSecondary, isDark } = useAccentColor();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  // Animación de escala al contenido del modal
  const contentScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        // Sin animación cuando el usuario prefiere movimiento reducido.
        contentScale.value = 1;
        contentOpacity.value = 1;
      } else {
        contentScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));
        contentOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
      }
    }
  }, [visible, contentScale, contentOpacity, reducedMotion]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }));

  // Drag handle con pulso sutil (desactivado con reducedMotion)
  const handleScale = useSharedValue(1);
  useEffect(() => {
    if (visible && !reducedMotion) {
      handleScale.value = withDelay(400, withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1500 }),
          withTiming(1, { duration: 1500 }),
        ),
        -1,
        true,
      ));
    } else {
      handleScale.value = 1;
    }
  }, [visible, handleScale, reducedMotion]);

  const handleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: handleScale.value }],
  }));

  // Glow neón en botón de acción en modo oscuro
  const actionNeonGlow = isDark ? {
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  } : {};

  return (
    <Modal visible={visible} animationType={animationType} transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* El fondo es un hermano del contenido para que tocar dentro no cierre el modal. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal"
        />
        <Animated.View
          style={[
            contentAnimatedStyle,
          ]}
        >
          <View
            style={[
              styles.content,
              {
                backgroundColor: cardBg,
                height,
                maxWidth: 720,
                alignSelf: 'center',
                paddingBottom: 24 + insets.bottom,
              },
              contentStyle,
            ]}
            accessibilityViewIsModal
          >
            {/* Indicador de arrastre superior (Pill Handle) */}
            <View style={styles.dragHandleWrapper}>
              <Animated.View style={[styles.dragHandle, handleAnimatedStyle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.4} style={[styles.title, { color: textPrimary, fontFamily: FontFamily.bold }]}>{title}</Text>
                {subtitle && (
                  <Text maxFontSizeMultiplier={1.4} style={[styles.subtitle, { color: textSecondary, fontFamily: FontFamily.regular }]}>{subtitle}</Text>
                )}
              </View>
              {showCloseButton && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar modal"
                  hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                  onPress={() => {
                    haptic.tap();
                    onClose();
                  }}
                >
                  <Ionicons name="close" size={24} color={textPrimary} />
                </Pressable>
              )}
            </View>

            {/* Body */}
            {scrollable ? (
              <ScrollView
                style={styles.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.body}>{children}</View>
            )}

            {/* Action Button */}
            {actionLabel && onAction && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: accentColor },
                  actionNeonGlow,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => {
                  haptic.tap();
                  onAction();
                }}
                accessibilityRole="button"
                accessibilityLabel={actionLabel}
                hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              >
                <Text style={[styles.actionBtnText, { color: accentTextColor(accentColor), fontFamily: FontFamily.bold }]}>{actionLabel}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: 24,
    paddingTop: 12,
    // `paddingBottom` se aplica en runtime (24 + safe area inferior).
  },
  dragHandleWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  actionBtn: {
    height: 54,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
