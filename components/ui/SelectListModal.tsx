import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { accentTextColor } from '@/utils/color';
import { AnimatedView } from '@/components/ui/AnimatedView';

export interface SelectListItem {
  id: string | number;
  renderContent: (isSelected: boolean, accentColor: string, textColor: string, mutedColor: string) => React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  /**
   * Selección controlada. Si se omite, el modal la rastrea internamente al
   * pulsar un ítem y la reinicia cada vez que se abre.
   */
  selected?: boolean;
}

export interface SelectListModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  items: SelectListItem[];
  onConfirm?: () => void;
  confirmLabel?: string;
  height?: number | string;
  emptyText?: string;
}

/**
 * Reusable selection list modal.
 * Unifies ClientSelectModal, HostessSelectModal, and RoomSelectModal
 * which share the same pattern: overlay, header, scrollable selectable list, confirm button.
 *
 * Each item provides its own renderContent function for custom rendering,
 * while the modal handles the common layout, selection state, and interactions.
 */
export const SelectListModal = ({
  visible,
  onClose,
  title,
  subtitle,
  items,
  onConfirm,
  confirmLabel = 'Listo',
  height = '85%',
  emptyText = 'No hay elementos disponibles',
}: SelectListModalProps) => {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor, isDark } = useAccentColor();
  const insets = useSafeAreaInsets();

  // La selección vive en el cuerpo, que solo se monta con el modal abierto:
  // al reabrir se monta de cero y no queda la selección de la vez anterior.
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const isItemSelected = (item: SelectListItem) =>
    item.selected !== undefined ? item.selected : selectedId === item.id;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* El fondo es un hermano del contenido para que tocar dentro no cierre el modal. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal"
        />
        {visible ? (
        <View
          style={[
            styles.content,
            { backgroundColor: cardBg, height, maxWidth: 720, alignSelf: 'center', paddingBottom: 24 + insets.bottom },
          ]}
          accessibilityViewIsModal
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text maxFontSizeMultiplier={1.4} style={[styles.title, { color: textPrimary }]}>{title}</Text>
              {subtitle && (
                <Text maxFontSizeMultiplier={1.4} style={[styles.subtitle, { color: textSecondary }]}>{subtitle}</Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal"
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={textPrimary} />
            </Pressable>
          </View>

          {/* List */}
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="list-outline" size={48} color={textSecondary} />
                <Text style={[styles.emptyText, { color: textSecondary }]}>{emptyText}</Text>
              </View>
            ) : (
              items.map((item, index) => {
                const selected = isItemSelected(item);
                const itemNeonGlow = isDark && selected ? {
                  shadowColor: accentColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 3,
                } : {};
                return (
                  <AnimatedView
                    key={`${String(item.id)}-${index}`}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 200, delay: Math.min(index, 8) * 50 }}
                  >
                    <Pressable
                      disabled={item.disabled}
                      onPress={() => {
                        if (item.disabled) return;
                        setSelectedId(item.id);
                        item.onPress?.();
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: !!item.disabled }}
                      style={[
                        styles.item,
                        {
                          borderColor: item.disabled ? borderColor : selected ? accentColor : borderColor,
                          backgroundColor: selected ? `${accentColor}12` : 'transparent',
                          opacity: item.disabled ? 0.5 : 1,
                          ...itemNeonGlow,
                        },
                      ]}
                    >
                      {item.renderContent(selected, accentColor, textPrimary, textSecondary)}
                      {item.disabled && item.disabledReason && (
                        <Text style={[styles.disabledReason, { color: '#EF4444' }]}>
                          {item.disabledReason}
                        </Text>
                      )}
                    </Pressable>
                  </AnimatedView>
                );
              })
            )}
          </ScrollView>

          {/* Botón de cierre: con `onConfirm` confirma la selección; sin él,
              simplemente descarta. Antes la condición `(onConfirm || true)`
              era siempre verdadera y el botón se pintaba igual. */}
          <View style={isDark ? {
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          } : {}}>
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              onPress={onConfirm ?? onClose}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={[styles.confirmBtnText, { color: accentTextColor(accentColor) }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
        ) : null}
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
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: FontFamily.black,
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    marginTop: 2,
  },
  list: {
    flex: 1,
  },
  item: {
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginBottom: 10,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    marginTop: 12,
  },
  disabledReason: {
    fontSize: FontSize.xxs,
    fontFamily: FontFamily.extrabold,
    marginTop: 4,
  },
  confirmBtn: {
    height: 54,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: FontFamily.black,
    letterSpacing: 1,
  },
});
