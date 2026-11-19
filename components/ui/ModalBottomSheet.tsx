import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
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
        <View
          style={[
            styles.content,
            { backgroundColor: cardBg, height, maxWidth: 720, alignSelf: 'center' },
            contentStyle,
          ]}
          accessibilityViewIsModal
        >
          {/* Indicador de arrastre superior (Pill Handle) */}
          <View style={styles.dragHandleWrapper}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
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
              style={[styles.actionBtn, { backgroundColor: accentColor }]}
              onPress={() => {
                haptic.tap();
                onAction();
              }}
            >
              <Text style={[styles.actionBtnText, { color: accentTextColor(accentColor), fontFamily: FontFamily.bold }]}>{actionLabel}</Text>
            </Pressable>
          )}
        </View>
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
    paddingBottom: 24,
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
    fontSize: 22,
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
