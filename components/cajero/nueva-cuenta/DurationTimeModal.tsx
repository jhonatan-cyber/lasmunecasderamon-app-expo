import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontSize, BorderRadius } from '@/constants/spacing';

interface DurationTimeModalProps {
  visible: boolean;
  selectedTime: number;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  onClose: () => void;
  onSelectTime: (time: number) => void;
}

const TIME_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

export const DurationTimeModal: React.FC<DurationTimeModalProps> = ({
  visible,
  selectedTime,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  onClose,
  onSelectTime,
}) => {
  const [tempTime, setTempTime] = useState(selectedTime);

  const handleVisibleChange = useCallback(() => {
    setTempTime(selectedTime);
  }, [selectedTime]);

  React.useEffect(() => {
    if (visible) {
      setTempTime(selectedTime);
    }
  }, [visible, selectedTime]);

  const handleApply = useCallback(() => {
    onSelectTime(tempTime);
    onClose();
  }, [tempTime, onSelectTime, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const timeLabel = tempTime > 0 ? `${tempTime} minutos` : 'Seleccionar tiempo';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={handleVisibleChange}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: cardBg, borderColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: textPrimary }]}>
                Tiempo adicional
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {timeLabel}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={20} color={textPrimary} />
            </Pressable>
          </View>

          {/* Time options list */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.listContainer}>
              {TIME_OPTIONS.map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.listItem,
                    { borderBottomColor: borderColor },
                    tempTime === t && styles.listItemSelected,
                  ]}
                  onPress={() => setTempTime(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t} minutos`}
                  accessibilityState={{ selected: tempTime === t }}
                >
                  <Text
                    style={[
                      styles.listItemTitle,
                      { color: textPrimary },
                      tempTime === t && styles.listItemTitleSelected,
                    ]}
                  >
                    {t} minutos
                  </Text>
                  {tempTime === t && (
                    <Ionicons name="checkmark-circle" size={24} color={accentColor} />
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
            >
              <Text style={[styles.actionBtnText, { color: textSecondary }]}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: accentColor }]}
              onPress={handleApply}
              accessibilityRole="button"
              accessibilityLabel="Aplicar tiempo"
            >
              <Text style={styles.actionBtnTextPrimary}>
                Aplicar
              </Text>
            </Pressable>
          </View>
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
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    gap: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  listItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  listItemTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    flex: 1,
  },
  listItemTitleSelected: {
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  actionBtnTextPrimary: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
