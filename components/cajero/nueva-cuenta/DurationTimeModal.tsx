import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DurationTimeModalProps {
  visible: boolean;
  selectedTime: number;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
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
  onClose,
  onSelectTime,
}) => (
  <Modal visible={visible} animationType="fade" transparent>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textPrimary }]}>Seleccionar Tiempo</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={26} color={textPrimary} />
          </Pressable>
        </View>
        <ScrollView>
          {TIME_OPTIONS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.listItem, { borderBottomColor: borderColor }]}
              onPress={() => onSelectTime(t)}
            >
              <Text style={[styles.listItemTitle, { color: textPrimary, flex: 1 }]}>
                {t} minutos
              </Text>
              {selectedTime === t && (
                <Ionicons name="checkmark-circle" size={24} color={accentColor} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: '85%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
