import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { BorderRadius, FontSize } from '@/constants/spacing';

export interface ActionSheetItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  items: ActionSheetItem[];
  cancelLabel?: string;
}

/**
 * Reusable action sheet modal.
 * Extracts the common pattern shared by CuentaActionSheet and VentaActionSheet:
 * overlay, handle, title, subtitle, list of icon+label actions, and cancel button.
 */
export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  items,
  cancelLabel = 'Cancelar',
}) => {
  const { accentColor, cardBg, textPrimary, textSecondary } = useAccentColor();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: cardBg, borderColor: `${accentColor}40`, borderWidth: 1, borderBottomWidth: 0 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.handle, { backgroundColor: `${accentColor}60` }]} />
            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: textSecondary }]}>{subtitle}</Text>
            )}
          </View>

          {/* Actions */}
          {items.map((item, index) => (
            <Pressable
              key={`${item.label}-${index}`}
              disabled={item.disabled}
              style={({ pressed }) => [
                styles.actionItem,
                pressed && styles.actionItemPressed,
                item.disabled && styles.actionItemDisabled,
              ]}
              onPress={item.onPress}
            >
              <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.actionText, { color: item.disabled ? textSecondary : item.color }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}

          {/* Cancel */}
          <Pressable
            style={[styles.cancelBtn, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40` }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: accentColor }]}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: BorderRadius.xl,
    marginBottom: 10,
    gap: 16,
  },
  actionItemPressed: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  actionItemDisabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
