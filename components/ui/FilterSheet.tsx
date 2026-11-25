import Ionicons from '@expo/vector-icons/Ionicons';
import React, { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';

export interface FilterGroup<T extends string = string> {
  key: string;
  label: string;
  options: { value: T; label: string; count?: number }[];
  selected: T;
  onSelect: (value: T) => void;
}

export interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  groups: FilterGroup<any>[];
  extraControls?: ReactNode;
  onClear?: () => void;
  onApply?: () => void;
  clearLabel?: string;
  applyLabel?: string;
}

/** Panel de filtros compartido: grupos de chips + controles extra + pie de acciones. */
export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  onClose,
  title = 'Filtros',
  subtitle,
  groups,
  extraControls,
  onClear,
  onApply,
  clearLabel = 'Limpiar',
  applyLabel = 'Listo',
}) => {
  const {
    accentColor,
    accentText,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    surfaceMuted,
  } = useAccentColor();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar filtros"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: cardBg,
              borderColor,
              paddingBottom: insets.bottom + 20,
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
              {!!subtitle && (
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                  {subtitle}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar filtros"
              hitSlop={10}
            >
              <Ionicons name="close" size={24} color={textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {groups.map((group) => (
              <View key={group.key}>
                <Text style={[styles.groupLabel, { color: textSecondary }]}>
                  {group.label}
                </Text>
                <View style={styles.chipRow}>
                  {group.options.map((option) => {
                    const active = option.value === group.selected;
                    return (
                      <Pressable
                        key={String(option.value)}
                        onPress={() => group.onSelect(option.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? accentColor : surfaceMuted,
                            borderColor: active ? accentColor : borderColor,
                          },
                        ]}
                      >
                        <Text style={{ color: active ? accentText : textPrimary }}>
                          {option.label}
                          {option.count !== undefined ? ` (${option.count})` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            {extraControls}
          </ScrollView>

          {(onClear || onApply) && (
            <View style={styles.actions}>
              {onClear && (
                <Pressable
                  onPress={onClear}
                  accessibilityRole="button"
                  accessibilityLabel={clearLabel}
                  style={[styles.clearBtn, { borderColor }]}
                >
                  <Text style={{ color: textPrimary }}>{clearLabel}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onApply ?? onClose}
                accessibilityRole="button"
                accessibilityLabel={applyLabel}
                style={[
                  styles.applyBtn,
                  { backgroundColor: accentColor, flex: onClear ? 1.5 : 1 },
                ]}
              >
                <Text style={[styles.applyText, { color: accentText }]}>
                  {applyLabel}
                </Text>
              </Pressable>
            </View>
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
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
    borderWidth: 1,
    padding: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontFamily: FontFamily.black },
  subtitle: { fontSize: 12, fontFamily: FontFamily.medium, marginTop: 2 },
  groupLabel: {
    fontSize: 11,
    fontFamily: FontFamily.black,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  clearBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtn: {
    minHeight: 50,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { fontSize: 15, fontFamily: FontFamily.black },
});
