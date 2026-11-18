import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { accentTextColor } from '@/utils/color';

export interface SelectListItem<T = any> {
  id: string | number;
  renderContent: (isSelected: boolean, accentColor: string, textColor: string, mutedColor: string) => React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export interface SelectListModalProps<T = any> {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  items: SelectListItem<T>[];
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
export const SelectListModal = <T = any>({
  visible,
  onClose,
  title,
  subtitle,
  items,
  onConfirm,
  confirmLabel = 'Listo',
  height = '85%',
  emptyText = 'No hay elementos disponibles',
}: SelectListModalProps<T>) => {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: cardBg, height, maxWidth: 720, alignSelf: 'center' }]} accessibilityViewIsModal>
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
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="list-outline" size={48} color={textSecondary} />
                <Text style={[styles.emptyText, { color: textSecondary }]}>{emptyText}</Text>
              </View>
            ) : (
              items.map((item, index) => (
                <Pressable
                  key={`${String(item.id)}-${index}`}
                  disabled={item.disabled}
                  onPress={() => !item.disabled && item.onPress?.()}
                  style={[
                    styles.item,
                    {
                      borderColor: item.disabled ? borderColor : accentColor,
                      opacity: item.disabled ? 0.5 : 1,
                    },
                  ]}
                >
                  {item.renderContent(false, accentColor, textPrimary, textSecondary)}
                  {item.disabled && item.disabledReason && (
                    <Text style={[styles.disabledReason, { color: '#EF4444' }]}>
                      {item.disabledReason}
                    </Text>
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Confirm Button */}
          {(onConfirm || true) && (
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              onPress={onConfirm || onClose}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={[styles.confirmBtnText, { color: accentTextColor(accentColor) }]}>{confirmLabel}</Text>
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
    fontWeight: '900',
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
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
    fontWeight: '600',
    marginTop: 12,
  },
  disabledReason: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
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
    fontWeight: '900',
    letterSpacing: 1,
  },
});
